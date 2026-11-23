import type { MedioPago, Movimiento } from '../../domain/entities/movimiento';
import { ErrorDominio } from '../../domain/errors/error-dominio';
import type { Reloj } from '../../domain/ports/reloj';
import type { Repositorios } from '../../domain/ports/repositorios';
import { saldoCuenta } from '../../domain/services/saldos';
import { crearMonto, type Dinero } from '../../domain/value-objects/dinero';
import { crearFecha, type Fecha } from '../../domain/value-objects/fecha';
import { categoriaDeTipo, cuentaActiva, type Dependencias } from './dependencias';

type TipoRegistrable = 'GASTO' | 'INGRESO' | 'DESCUENTO';

export type EntradaMovimiento = {
  readonly tipo: TipoRegistrable;
  readonly monto: number;
  readonly categoriaId: string;
  /** Por defecto, hoy. */
  readonly fecha?: string;
  /** Por defecto, la bolsa Quincena. */
  readonly cuentaId?: string;
  readonly nota?: string | null;
  readonly medioPago?: MedioPago | null;
};

export type EntradaTransferencia = {
  readonly monto: number;
  readonly cuentaOrigenId: string;
  readonly cuentaDestinoId: string;
  readonly fecha?: string;
  readonly nota?: string | null;
  readonly medioPago?: MedioPago | null;
};

export type CambiosMovimiento = {
  readonly monto?: number;
  readonly fecha?: string;
  readonly cuentaId?: string;
  readonly cuentaDestinoId?: string;
  readonly categoriaId?: string;
  readonly nota?: string | null;
  readonly medioPago?: MedioPago | null;
};

const esPagoPrincipal = (r: Repositorios, m: Movimiento): boolean =>
  m.ocurrenciaId !== null && r.ocurrencias.obtener(m.ocurrenciaId)?.movimientoId === m.id;

function obtenerEditable(r: Repositorios, id: string): Movimiento {
  const movimiento = r.movimientos.obtener(id);
  if (!movimiento) throw new ErrorDominio('MOVIMIENTO_NO_ENCONTRADO', 'El movimiento no existe');
  if (!['GASTO', 'INGRESO', 'DESCUENTO', 'TRANSFERENCIA'].includes(movimiento.tipo)) {
    throw new ErrorDominio('MOVIMIENTO_PROTEGIDO', 'Este movimiento se gestiona desde su deuda');
  }
  return movimiento;
}

function validarTransferencia(
  r: Repositorios,
  reloj: Reloj,
  datos: { monto: Dinero; fecha: Fecha; origenId: string; destinoId: string },
  excluirId?: string,
): void {
  if (datos.origenId === datos.destinoId) {
    throw new ErrorDominio('CUENTA_INVALIDA', 'El origen y el destino deben ser distintos');
  }
  cuentaActiva(r, datos.origenId);
  cuentaActiva(r, datos.destinoId);

  const bolsa = r.cuentas.obtenerBolsa();
  if (datos.origenId !== bolsa.id) return;
  const hoy = reloj.hoy();
  const limite = datos.fecha > hoy ? datos.fecha : hoy;
  const disponible = saldoCuenta(
    bolsa,
    r.movimientos.listar().filter((m) => m.id !== excluirId && m.fecha <= limite),
  );
  if (datos.monto > disponible) {
    throw new ErrorDominio('DISPONIBLE_INSUFICIENTE', 'El valor supera el disponible');
  }
}

export function crearCasosMovimientos({ unidad, reloj, generarId }: Dependencias) {
  return {
    registrarMovimiento: (entrada: EntradaMovimiento): Movimiento =>
      unidad.ejecutar((r) => {
        const cuentaId = entrada.cuentaId ?? r.cuentas.obtenerBolsa().id;
        cuentaActiva(r, cuentaId);
        categoriaDeTipo(r, entrada.categoriaId, entrada.tipo);
        const ahora = reloj.ahora();
        const movimiento: Movimiento = {
          id: generarId(),
          tipo: entrada.tipo,
          monto: crearMonto(entrada.monto),
          fecha: entrada.fecha ? crearFecha(entrada.fecha) : reloj.hoy(),
          cuentaId,
          cuentaDestinoId: null,
          categoriaId: entrada.categoriaId,
          deudaId: null,
          ocurrenciaId: null,
          nota: entrada.nota ?? null,
          medioPago: entrada.medioPago ?? null,
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        r.movimientos.guardar(movimiento);
        return movimiento;
      }),

    transferirEntreCuentas: (entrada: EntradaTransferencia): Movimiento =>
      unidad.ejecutar((r) => {
        const monto = crearMonto(entrada.monto);
        const fecha = entrada.fecha ? crearFecha(entrada.fecha) : reloj.hoy();
        validarTransferencia(r, reloj, {
          monto,
          fecha,
          origenId: entrada.cuentaOrigenId,
          destinoId: entrada.cuentaDestinoId,
        });
        const ahora = reloj.ahora();
        const movimiento: Movimiento = {
          id: generarId(),
          tipo: 'TRANSFERENCIA',
          monto,
          fecha,
          cuentaId: entrada.cuentaOrigenId,
          cuentaDestinoId: entrada.cuentaDestinoId,
          categoriaId: null,
          deudaId: null,
          ocurrenciaId: null,
          nota: entrada.nota ?? null,
          medioPago: entrada.medioPago ?? null,
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        r.movimientos.guardar(movimiento);
        return movimiento;
      }),

    editarMovimiento: (id: string, cambios: CambiosMovimiento): Movimiento =>
      unidad.ejecutar((r) => {
        const actual = obtenerEditable(r, id);
        const monto = cambios.monto === undefined ? actual.monto : crearMonto(cambios.monto);
        const fecha = cambios.fecha === undefined ? actual.fecha : crearFecha(cambios.fecha);
        const principal = esPagoPrincipal(r, actual);
        if (principal && fecha !== actual.fecha) {
          throw new ErrorDominio(
            'MOVIMIENTO_PROTEGIDO',
            'Para cambiar la fecha del sueldo, deshaz la confirmación',
          );
        }

        const cuentaId = cambios.cuentaId ?? actual.cuentaId;
        const cuentaDestinoId = cambios.cuentaDestinoId ?? actual.cuentaDestinoId;
        if (actual.tipo === 'TRANSFERENCIA') {
          validarTransferencia(
            r,
            reloj,
            { monto, fecha, origenId: cuentaId ?? '', destinoId: cuentaDestinoId ?? '' },
            id,
          );
        } else {
          if (cambios.cuentaId && cambios.cuentaId !== actual.cuentaId) {
            cuentaActiva(r, cambios.cuentaId);
          }
          if (cambios.categoriaId && cambios.categoriaId !== actual.categoriaId) {
            categoriaDeTipo(r, cambios.categoriaId, actual.tipo as TipoRegistrable);
          }
        }

        const movimiento: Movimiento = {
          ...actual,
          monto,
          fecha,
          cuentaId,
          cuentaDestinoId,
          categoriaId: cambios.categoriaId ?? actual.categoriaId,
          nota: cambios.nota === undefined ? actual.nota : cambios.nota,
          medioPago: cambios.medioPago === undefined ? actual.medioPago : cambios.medioPago,
          actualizadoEn: reloj.ahora(),
        };
        r.movimientos.guardar(movimiento);
        if (principal && actual.ocurrenciaId) {
          const ocurrencia = r.ocurrencias.obtener(actual.ocurrenciaId);
          if (ocurrencia) r.ocurrencias.guardar({ ...ocurrencia, monto });
        }
        return movimiento;
      }),

    eliminarMovimiento: (id: string): void =>
      unidad.ejecutar((r) => {
        const movimiento = obtenerEditable(r, id);
        if (esPagoPrincipal(r, movimiento)) {
          throw new ErrorDominio(
            'MOVIMIENTO_PROTEGIDO',
            'Para borrar el sueldo, deshaz la confirmación',
          );
        }
        r.movimientos.eliminar(id);
      }),
  };
}
