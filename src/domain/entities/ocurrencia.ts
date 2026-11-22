import type { Dinero } from '../value-objects/dinero';
import type { Fecha } from '../value-objects/fecha';

export const ESTADOS_OCURRENCIA = ['PENDIENTE', 'PAGADA', 'OMITIDA'] as const;
export type EstadoOcurrencia = (typeof ESTADOS_OCURRENCIA)[number];

export type Ocurrencia = {
  readonly id: string;
  readonly reglaId: string;
  readonly fecha: Fecha;
  readonly monto: Dinero;
  readonly estado: EstadoOcurrencia;
  readonly movimientoId: string | null;
};
