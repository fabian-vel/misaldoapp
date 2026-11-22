import type { ReglaFechas } from '../services/calculadora-recurrencias';
import type { Dinero } from '../value-objects/dinero';
import type { TipoMovimiento } from './movimiento';

export const FRECUENCIAS = [
  'QUINCENAL_DIAS',
  'MENSUAL',
  'CADA_N_DIAS',
  'SEMANAL',
  'ANUAL',
] as const;

export type ReglaRecurrencia = {
  readonly id: string;
  readonly nombre: string;
  readonly tipoMovimiento: TipoMovimiento;
  readonly monto: Dinero;
  /** Null en compras recurrentes con tarjeta de crédito. */
  readonly cuentaId: string | null;
  readonly categoriaId: string | null;
  readonly deudaId: string | null;
  readonly fechas: ReglaFechas;
  readonly esSueldo: boolean;
  readonly recordatorioActivo: boolean;
  readonly recordatorioDiasAntes: number;
  readonly recordatorioHora: string;
  readonly activa: boolean;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
};
