import type { Movimiento, MovimientoSaldo } from '../../domain/entities/movimiento';
import type { Ocurrencia } from '../../domain/entities/ocurrencia';
import type { ReglaRecurrencia } from '../../domain/entities/regla-recurrencia';
import { ErrorDominio } from '../../domain/errors/error-dominio';
import type { Repositorios } from '../../domain/ports/repositorios';
import { fechasEnVentana, type DiaMes } from '../../domain/services/calculadora-recurrencias';
import {
  calcularCorte,
  calcularResumenQuincena,
  type CorteQuincena,
  type ResumenQuincena,
} from '../../domain/services/resumen-quincena';
import { crearMonto, type Dinero } from '../../domain/value-objects/dinero';
import { crearFecha, sumarDias, type Fecha } from '../../domain/value-objects/fecha';
import {
  abrirPeriodo,
  periodoProgramado,
  siguientePagoProgramado,
  type Periodo,
} from '../../domain/value-objects/periodo';
import { categoriaDeTipo, type Dependencias } from './dependencias';

const VENTANA_DIAS = 60;
const CATEGORIA_SUELDO = 'cat-ingreso-sueldo';

export type EntradaSueldo = {
  readonly montoQuincena: number;
  readonly montoFinDeMes: number;
};

export type Novedad = {
  readonly tipo: 'INGRESO' | 'DESCUENTO';
  readonly categoriaId: string;
  readonly monto: number;
  readonly nota?: string | null;
};

export type EntradaConfirmacion = {
  readonly ocurrenciaId: string;
  readonly monto: number;
  readonly fechaReal: string;
  readonly novedades?: readonly Novedad[];
};

const reglasSueldo = (r: Repositorios): ReglaRecurrencia[] =>
  r.reglas.listarActivas().filter((regla) => regla.esSueldo);

function ultimaConfirmada(r: Repositorios): { ocurrencia: Ocurrencia; fechaReal: Fecha } | null {
  const ocurrencia = r.ocurrencias.ultimaPagadaDeReglas(reglasSueldo(r).map((regla) => regla.id));
  if (!ocurrencia) return null;
  const movimiento = ocurrencia.movimientoId
    ? r.movimientos.obtener(ocurrencia.movimientoId)
    : null;
  if (!movimiento) {
    throw new ErrorDominio('OCURRENCIA_INVALIDA', 'El sueldo confirmado perdió su movimiento');
  }
  return { ocurrencia, fechaReal: movimiento.fecha };
}

/** Sigue abierta hasta confirmar el próximo sueldo, aunque este llegue tarde. */
function periodoVigente(r: Repositorios, hoy: Fecha): Periodo {
  const previa = ultimaConfirmada(r);
  if (!previa) return periodoProgramado(hoy);
  const periodo = abrirPeriodo(previa.ocurrencia.fecha, previa.fechaReal);
  return hoy > periodo.fin ? { ...periodo, fin: hoy } : periodo;
}

const periodoDeCorte = (inicio: Fecha, fin: Fecha, pagoProgramado: Fecha): Periodo => ({
  inicio,
  fin,
  pagoProgramado,
  proximoPago: siguientePagoProgramado(pagoProgramado),
});

export function crearCasosQuincena({ unidad, reloj, generarId }: Dependencias) {
  const generar = (r: Repositorios): void => {
    const limite = sumarDias(reloj.hoy(), VENTANA_DIAS);
    for (const regla of r.reglas.listarActivas()) {
      const ultima = r.ocurrencias.ultimaFecha(regla.id);
      // Continúa desde la última generada para no perder fechas si la app estuvo sin abrirse.
      const desde = ultima ? sumarDias(ultima, 1) : regla.fechas.fechaInicio;
      r.ocurrencias.insertarNuevas(
        fechasEnVentana(regla.fechas, desde, limite).map((fecha) => ({
          id: generarId(),
          reglaId: regla.id,
          fecha,
          monto: regla.monto,
          estado: 'PENDIENTE' as const,
          movimientoId: null,
        })),
      );
    }
  };

  const guardarReglaSueldo = (r: Repositorios, dia: DiaMes, monto: Dinero): void => {
    const hoy = reloj.hoy();
    const ahora = reloj.ahora();
    const existente = reglasSueldo(r).find(
      (regla) => regla.fechas.frecuencia === 'MENSUAL' && regla.fechas.dia === dia,
    );
    if (existente) {
      r.reglas.guardar({ ...existente, monto, actualizadoEn: ahora });
      r.ocurrencias
        .listarPendientes()
        .filter((o) => o.reglaId === existente.id && o.fecha >= hoy)
        .forEach((o) => r.ocurrencias.guardar({ ...o, monto }));
      return;
    }
    r.reglas.guardar({
      id: generarId(),
      nombre: dia === 'ULTIMO' ? 'Sueldo fin de mes' : 'Sueldo quincena',
      tipoMovimiento: 'INGRESO',
      monto,
      cuentaId: r.cuentas.obtenerBolsa().id,
      categoriaId: CATEGORIA_SUELDO,
      deudaId: null,
      fechas: { frecuencia: 'MENSUAL', dia, fechaInicio: hoy },
      esSueldo: true,
      recordatorioActivo: true,
      recordatorioDiasAntes: 1,
      recordatorioHora: '08:00',
      activa: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  };

  return {
    generarOcurrencias: (): void => unidad.ejecutar(generar),

    configurarSueldo: (entrada: EntradaSueldo): void =>
      unidad.ejecutar((r) => {
        guardarReglaSueldo(r, 15, crearMonto(entrada.montoQuincena));
        guardarReglaSueldo(r, 'ULTIMO', crearMonto(entrada.montoFinDeMes));
        generar(r);
      }),

    confirmarSueldo: (
      entrada: EntradaConfirmacion,
    ): { periodo: Periodo; corte: CorteQuincena | null } =>
      unidad.ejecutar((r) => {
        const hoy = reloj.hoy();
        const ahora = reloj.ahora();
        const monto = crearMonto(entrada.monto);
        const fechaReal = crearFecha(entrada.fechaReal);

        const ocurrencia = r.ocurrencias.obtener(entrada.ocurrenciaId);
        if (!ocurrencia) {
          throw new ErrorDominio('OCURRENCIA_NO_ENCONTRADA', 'El pago programado no existe');
        }
        const regla = r.reglas.obtener(ocurrencia.reglaId);
        if (!regla?.esSueldo || ocurrencia.estado !== 'PENDIENTE') {
          throw new ErrorDominio('OCURRENCIA_INVALIDA', 'Este sueldo no se puede confirmar');
        }
        if (fechaReal > hoy) {
          throw new ErrorDominio('PERIODO_INVALIDO', 'El pago no puede tener fecha futura');
        }
        const periodo = abrirPeriodo(ocurrencia.fecha, fechaReal);

        const idsSueldo = reglasSueldo(r).map((s) => s.id);
        const hayAnterior = r.ocurrencias
          .listarPendientes()
          .some((o) => idsSueldo.includes(o.reglaId) && o.fecha < ocurrencia.fecha);
        if (hayAnterior) {
          throw new ErrorDominio('OCURRENCIA_INVALIDA', 'Primero confirma el sueldo anterior');
        }

        const previa = ultimaConfirmada(r);
        if (previa && ocurrencia.fecha <= previa.ocurrencia.fecha) {
          throw new ErrorDominio('OCURRENCIA_INVALIDA', 'Ya hay un sueldo posterior confirmado');
        }

        const cuentaId = regla.cuentaId ?? r.cuentas.obtenerBolsa().id;
        const base = {
          fecha: fechaReal,
          cuentaId,
          cuentaDestinoId: null,
          deudaId: null,
          ocurrenciaId: ocurrencia.id,
          medioPago: null,
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        const principal: Movimiento = {
          ...base,
          id: generarId(),
          tipo: 'INGRESO',
          monto,
          categoriaId: regla.categoriaId,
          nota: null,
        };
        r.movimientos.guardar(principal);
        for (const novedad of entrada.novedades ?? []) {
          categoriaDeTipo(r, novedad.categoriaId, novedad.tipo);
          r.movimientos.guardar({
            ...base,
            id: generarId(),
            tipo: novedad.tipo,
            monto: crearMonto(novedad.monto),
            categoriaId: novedad.categoriaId,
            nota: novedad.nota ?? null,
          });
        }
        r.ocurrencias.guardar({
          ...ocurrencia,
          monto,
          estado: 'PAGADA',
          movimientoId: principal.id,
        });

        if (!previa) return { periodo, corte: null };
        const fechaFin = sumarDias(fechaReal, -1);
        r.cortes.guardar({
          id: generarId(),
          fechaInicio: previa.fechaReal,
          fechaFin,
          pagoProgramado: previa.ocurrencia.fecha,
          cerradoEn: ahora,
        });
        const corte = calcularCorte(
          r.cuentas.obtenerBolsa(),
          periodoDeCorte(previa.fechaReal, fechaFin, previa.ocurrencia.fecha),
          r.movimientos.listar(),
        );
        return { periodo, corte };
      }),

    /** Solo se puede deshacer el último sueldo confirmado; reabre la quincena anterior. */
    deshacerConfirmacionSueldo: (ocurrenciaId: string): void =>
      unidad.ejecutar((r) => {
        const previa = ultimaConfirmada(r);
        if (previa?.ocurrencia.id !== ocurrenciaId) {
          throw new ErrorDominio('OCURRENCIA_INVALIDA', 'Solo se puede deshacer el último sueldo');
        }
        const regla = r.reglas.obtener(previa.ocurrencia.reglaId);
        r.movimientos
          .listarPorOcurrencia(ocurrenciaId)
          .forEach((movimiento) => r.movimientos.eliminar(movimiento.id));
        r.ocurrencias.guardar({
          ...previa.ocurrencia,
          monto: regla?.monto ?? previa.ocurrencia.monto,
          estado: 'PENDIENTE',
          movimientoId: null,
        });
        const corte = r.cortes.ultimo();
        if (corte && sumarDias(corte.fechaFin, 1) === previa.fechaReal) {
          r.cortes.eliminar(corte.id);
        }
      }),

    obtenerResumenQuincena: (): { periodo: Periodo; resumen: ResumenQuincena } =>
      unidad.ejecutar((r) => {
        const periodo = periodoVigente(r, reloj.hoy());
        const pendientes: MovimientoSaldo[] = r.ocurrencias.listarPendientes().flatMap((o) => {
          const regla = r.reglas.obtener(o.reglaId);
          return regla
            ? [
                {
                  tipo: regla.tipoMovimiento,
                  monto: o.monto,
                  fecha: o.fecha,
                  cuentaId: regla.cuentaId,
                },
              ]
            : [];
        });
        // Si el sueldo se retrasó, lo vencido hasta hoy también cuenta como pendiente.
        const resumen = calcularResumenQuincena(
          r.cuentas.obtenerBolsa(),
          { ...periodo, proximoPago: sumarDias(periodo.fin, 1) },
          r.movimientos.listar(),
          pendientes,
        );
        return { periodo, resumen };
      }),

    obtenerCorte: (id: string): { periodo: Periodo; corte: CorteQuincena } | null =>
      unidad.ejecutar((r) => {
        const registro = r.cortes.listar().find((c) => c.id === id);
        if (!registro) return null;
        const periodo = periodoDeCorte(
          registro.fechaInicio,
          registro.fechaFin,
          registro.pagoProgramado,
        );
        return {
          periodo,
          corte: calcularCorte(r.cuentas.obtenerBolsa(), periodo, r.movimientos.listar()),
        };
      }),
  };
}
