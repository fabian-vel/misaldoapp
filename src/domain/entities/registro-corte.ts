import type { Fecha } from '../value-objects/fecha';

/** Quincena cerrada. Solo guarda fechas: sus totales siempre se calculan. */
export type RegistroCorte = {
  readonly id: string;
  readonly fechaInicio: Fecha;
  readonly fechaFin: Fecha;
  readonly pagoProgramado: Fecha;
  readonly cerradoEn: string;
};
