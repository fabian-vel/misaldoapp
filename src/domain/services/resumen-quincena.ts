import type { MovimientoSaldo } from '../entities/movimiento';
import { crearDinero, restarDinero, sumarDinero, type Dinero } from '../value-objects/dinero';
import type { Periodo } from '../value-objects/periodo';
import { efectoEnCuenta, saldoCuenta, type CuentaSaldo } from './saldos';

export type CorteQuincena = {
  readonly saldoAnterior: Dinero;
  readonly ingresos: Dinero;
  readonly descuentos: Dinero;
  readonly gastos: Dinero;
  readonly pagosDeuda: Dinero;
  readonly transferidoEntrada: Dinero;
  readonly transferidoSalida: Dinero;
  /** Lo que pasa a la siguiente quincena; puede ser negativo. */
  readonly sobrante: Dinero;
};

export type ResumenQuincena = CorteQuincena & {
  readonly disponible: Dinero;
  readonly pendientes: Dinero;
  readonly teQuedaria: Dinero;
};

export function calcularCorte(
  bolsa: CuentaSaldo,
  periodo: Periodo,
  movimientos: readonly MovimientoSaldo[],
): CorteQuincena {
  const cero = crearDinero(0);
  const totales = {
    ingresos: cero,
    descuentos: cero,
    gastos: cero,
    pagosDeuda: cero,
    transferidoEntrada: cero,
    transferidoSalida: cero,
  };
  const acumular = (clave: keyof typeof totales, valor: Dinero) => {
    totales[clave] = sumarDinero(totales[clave], crearDinero(Math.abs(valor)));
  };

  const hastaFin = movimientos.filter((m) => m.fecha <= periodo.fin);
  for (const movimiento of hastaFin) {
    if (movimiento.fecha < periodo.inicio) continue;
    const efecto = efectoEnCuenta(movimiento, bolsa.id);
    if (efecto === 0) continue;
    if (movimiento.tipo === 'INGRESO') acumular('ingresos', efecto);
    if (movimiento.tipo === 'DESCUENTO') acumular('descuentos', efecto);
    if (movimiento.tipo === 'GASTO') acumular('gastos', efecto);
    if (movimiento.tipo === 'PAGO_DEUDA') acumular('pagosDeuda', efecto);
    if (movimiento.tipo === 'TRANSFERENCIA') {
      acumular(efecto > 0 ? 'transferidoEntrada' : 'transferidoSalida', efecto);
    }
  }

  return {
    saldoAnterior: saldoCuenta(
      bolsa,
      movimientos.filter((m) => m.fecha < periodo.inicio),
    ),
    ...totales,
    sobrante: saldoCuenta(bolsa, hastaFin),
  };
}

/**
 * `pendientes` son las ocurrencias sin pagar. Cuentan solo las que sacan plata de la bolsa
 * antes del próximo pago, incluidas las vencidas de quincenas anteriores.
 */
export function calcularResumenQuincena(
  bolsa: CuentaSaldo,
  periodo: Periodo,
  movimientos: readonly MovimientoSaldo[],
  pendientes: readonly MovimientoSaldo[],
): ResumenQuincena {
  const corte = calcularCorte(bolsa, periodo, movimientos);
  const totalPendiente = pendientes
    .filter((p) => p.fecha < periodo.proximoPago && efectoEnCuenta(p, bolsa.id) < 0)
    .reduce((total, p) => sumarDinero(total, p.monto), crearDinero(0));

  return {
    ...corte,
    disponible: corte.sobrante,
    pendientes: totalPendiente,
    teQuedaria: restarDinero(corte.sobrante, totalPendiente),
  };
}
