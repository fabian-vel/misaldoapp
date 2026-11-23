import { crearCasosDeUso, type CasosDeUso } from '@/application/use-cases/casos-de-uso';
import { crearSystemClock } from '@/infrastructure/clock/system-clock';
import { abrirBaseDatos } from '@/infrastructure/db/client';
import { crearUnidadDeTrabajo } from '@/infrastructure/db/repositories/repositorios-drizzle';
import { aplicarSemillas } from '@/infrastructure/db/semillas';
import { generarUuid } from '@/infrastructure/id/generador-uuid';

export type Contenedor = { readonly casos: CasosDeUso };

let inicio: Promise<Contenedor> | null = null;

async function construir(): Promise<Contenedor> {
  const reloj = crearSystemClock();
  const db = await abrirBaseDatos();
  aplicarSemillas(db, reloj.ahora());
  const casos = crearCasosDeUso({
    unidad: crearUnidadDeTrabajo(db),
    reloj,
    generarId: generarUuid,
  });
  casos.quincena.generarOcurrencias();
  return { casos };
}

/** Abre la base una sola vez; si falla, el siguiente intento vuelve a probar. */
export function iniciarAplicacion(): Promise<Contenedor> {
  inicio ??= construir().catch((error: unknown) => {
    inicio = null;
    throw error;
  });
  return inicio;
}
