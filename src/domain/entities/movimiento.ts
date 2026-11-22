import type { Dinero } from '../value-objects/dinero';
import type { Fecha } from '../value-objects/fecha';

export type TipoMovimiento =
  | 'GASTO'
  | 'INGRESO'
  | 'DESCUENTO'
  | 'PAGO_DEUDA'
  | 'COMPRA_CREDITO'
  | 'AJUSTE_DEUDA_MAS'
  | 'AJUSTE_DEUDA_MENOS'
  | 'TRANSFERENCIA';

/** Lo que un movimiento aporta a los saldos. `monto` siempre es mayor que cero. */
export type MovimientoSaldo = {
  readonly tipo: TipoMovimiento;
  readonly monto: Dinero;
  readonly fecha: Fecha;
  readonly cuentaId: string | null;
  readonly cuentaDestinoId?: string | null;
};
