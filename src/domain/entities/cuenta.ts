import type { Dinero } from '../value-objects/dinero';

export const TIPOS_CUENTA = ['QUINCENA', 'EFECTIVO', 'AHORRO', 'BILLETERA'] as const;
export type TipoCuenta = (typeof TIPOS_CUENTA)[number];

export type Cuenta = {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoCuenta;
  readonly saldoInicial: Dinero;
  readonly moneda: string;
  readonly archivada: boolean;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
};
