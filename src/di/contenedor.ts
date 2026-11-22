import type { Reloj } from '@/domain/ports/reloj';
import type { Repositorios, UnidadDeTrabajo } from '@/domain/ports/repositorios';
import { crearSystemClock } from '@/infrastructure/clock/system-clock';
import { abrirBaseDatos } from '@/infrastructure/db/client';
import {
  crearRepositorios,
  crearUnidadDeTrabajo,
} from '@/infrastructure/db/repositories/repositorios-drizzle';
import { aplicarSemillas } from '@/infrastructure/db/semillas';

export type Contenedor = {
  readonly reloj: Reloj;
  readonly repositorios: Repositorios;
  readonly unidadDeTrabajo: UnidadDeTrabajo;
};

let inicio: Promise<Contenedor> | null = null;

async function construir(): Promise<Contenedor> {
  const reloj = crearSystemClock();
  const db = await abrirBaseDatos();
  aplicarSemillas(db, reloj.ahora());
  return {
    reloj,
    repositorios: crearRepositorios(db),
    unidadDeTrabajo: crearUnidadDeTrabajo(db),
  };
}

/** Abre la base una sola vez; si falla, el siguiente intento vuelve a probar. */
export function iniciarAplicacion(): Promise<Contenedor> {
  inicio ??= construir().catch((error: unknown) => {
    inicio = null;
    throw error;
  });
  return inicio;
}
