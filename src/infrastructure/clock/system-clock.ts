import type { Reloj } from '../../domain/ports/reloj';
import { crearFecha } from '../../domain/value-objects/fecha';

// Colombia usa UTC−5 todo el año, sin horario de verano.
const DESFASE_BOGOTA_MS = 5 * 60 * 60 * 1000;

export const crearSystemClock = (ahoraMs: () => number = Date.now): Reloj => ({
  hoy: () => crearFecha(new Date(ahoraMs() - DESFASE_BOGOTA_MS).toISOString().slice(0, 10)),
  ahora: () => new Date(ahoraMs()).toISOString(),
});
