import type { Dinero } from '../value-objects/dinero';
import type { Fecha } from '../value-objects/fecha';

export const TIPOS_MOVIMIENTO = [
  'GASTO',
  'INGRESO',
  'DESCUENTO',
  'PAGO_DEUDA',
  'COMPRA_CREDITO',
  'AJUSTE_DEUDA_MAS',
  'AJUSTE_DEUDA_MENOS',
  'TRANSFERENCIA',
] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const MEDIOS_PAGO = ['EFECTIVO', 'DEBITO', 'CONSIGNACION', 'TRANSFERENCIA'] as const;
export type MedioPago = (typeof MEDIOS_PAGO)[number];

/** Lo que un movimiento aporta a los saldos. `monto` siempre es mayor que cero. */
export type MovimientoSaldo = {
  readonly tipo: TipoMovimiento;
  readonly monto: Dinero;
  readonly fecha: Fecha;
  readonly cuentaId: string | null;
  readonly cuentaDestinoId?: string | null;
};

export type Movimiento = MovimientoSaldo & {
  readonly id: string;
  readonly cuentaDestinoId: string | null;
  readonly categoriaId: string | null;
  readonly deudaId: string | null;
  readonly ocurrenciaId: string | null;
  readonly nota: string | null;
  readonly medioPago: MedioPago | null;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
};
