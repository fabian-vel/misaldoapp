import type { Cuenta, TipoCuenta } from '../../domain/entities/cuenta';
import { ErrorDominio } from '../../domain/errors/error-dominio';
import { saldoCuenta } from '../../domain/services/saldos';
import { crearDinero } from '../../domain/value-objects/dinero';
import { cuentaActiva, type Dependencias } from './dependencias';

export type EntradaCuenta = {
  readonly nombre: string;
  readonly tipo: Exclude<TipoCuenta, 'QUINCENA'>;
  readonly saldoInicial?: number;
};

function nombreValido(nombre: string): string {
  const limpio = nombre.trim();
  if (!limpio) throw new ErrorDominio('CUENTA_INVALIDA', 'La cuenta necesita un nombre');
  return limpio;
}

export function crearCasosCuentas({ unidad, reloj, generarId }: Dependencias) {
  return {
    crearCuenta: (entrada: EntradaCuenta): Cuenta =>
      unidad.ejecutar((r) => {
        if ((entrada.tipo as TipoCuenta) === 'QUINCENA') {
          throw new ErrorDominio('CUENTA_INVALIDA', 'Solo puede existir una bolsa Quincena');
        }
        const ahora = reloj.ahora();
        const cuenta: Cuenta = {
          id: generarId(),
          nombre: nombreValido(entrada.nombre),
          tipo: entrada.tipo,
          saldoInicial: crearDinero(entrada.saldoInicial ?? 0),
          moneda: 'COP',
          archivada: false,
          creadoEn: ahora,
          actualizadoEn: ahora,
        };
        r.cuentas.guardar(cuenta);
        return cuenta;
      }),

    editarCuenta: (id: string, cambios: { nombre?: string; saldoInicial?: number }): Cuenta =>
      unidad.ejecutar((r) => {
        const actual = cuentaActiva(r, id);
        const cuenta: Cuenta = {
          ...actual,
          nombre: cambios.nombre === undefined ? actual.nombre : nombreValido(cambios.nombre),
          saldoInicial:
            cambios.saldoInicial === undefined
              ? actual.saldoInicial
              : crearDinero(cambios.saldoInicial),
          actualizadoEn: reloj.ahora(),
        };
        r.cuentas.guardar(cuenta);
        return cuenta;
      }),

    archivarCuenta: (id: string): void =>
      unidad.ejecutar((r) => {
        const cuenta = cuentaActiva(r, id);
        if (cuenta.tipo === 'QUINCENA') {
          throw new ErrorDominio('CUENTA_INVALIDA', 'La bolsa Quincena no se puede archivar');
        }
        if (saldoCuenta(cuenta, r.movimientos.listar()) !== 0) {
          throw new ErrorDominio('CUENTA_CON_SALDO', 'Deja la cuenta en cero antes de archivarla');
        }
        r.cuentas.guardar({ ...cuenta, archivada: true, actualizadoEn: reloj.ahora() });
      }),
  };
}
