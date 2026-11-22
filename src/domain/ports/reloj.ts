import type { Fecha } from '../value-objects/fecha';

export interface Reloj {
  /** Fecha contable actual en America/Bogota. */
  hoy(): Fecha;
  /** Instante actual como timestamp ISO UTC. */
  ahora(): string;
}
