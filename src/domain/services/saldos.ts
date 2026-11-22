import type { MovimientoSaldo } from '../entities/movimiento';
import { crearDinero, sumarDinero, type Dinero } from '../value-objects/dinero';

export type CuentaSaldo = { readonly id: string; readonly saldoInicial: Dinero };

/** Cuánto cambia el saldo de la cuenta por este movimiento (positivo, negativo o cero). */
export function efectoEnCuenta(movimiento: MovimientoSaldo, cuentaId: string): Dinero {
  const { tipo, monto } = movimiento;
  const esOrigen = movimiento.cuentaId === cuentaId;

  switch (tipo) {
    case 'INGRESO':
      return crearDinero(esOrigen ? monto : 0);
    case 'GASTO':
    case 'DESCUENTO':
    case 'PAGO_DEUDA':
      return crearDinero(esOrigen ? -monto : 0);
    case 'TRANSFERENCIA':
      return crearDinero(
        (movimiento.cuentaDestinoId === cuentaId ? monto : 0) - (esOrigen ? monto : 0),
      );
    case 'COMPRA_CREDITO':
    case 'AJUSTE_DEUDA_MAS':
    case 'AJUSTE_DEUDA_MENOS':
      return crearDinero(0); // afectan la deuda, no las cuentas
  }
}

export const saldoCuenta = (cuenta: CuentaSaldo, movimientos: readonly MovimientoSaldo[]): Dinero =>
  movimientos.reduce(
    (saldo, movimiento) => sumarDinero(saldo, efectoEnCuenta(movimiento, cuenta.id)),
    cuenta.saldoInicial,
  );
