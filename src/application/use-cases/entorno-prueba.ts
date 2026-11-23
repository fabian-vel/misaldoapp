import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

import { ErrorDominio } from '../../domain/errors/error-dominio';
import type { Reloj } from '../../domain/ports/reloj';
import { crearFecha, type Fecha } from '../../domain/value-objects/fecha';
import {
  crearRepositorios,
  crearUnidadDeTrabajo,
} from '../../infrastructure/db/repositories/repositorios-drizzle';
import * as schema from '../../infrastructure/db/schema';
import { aplicarSemillas } from '../../infrastructure/db/semillas';
import type { Dependencias } from './dependencias';

/** Base SQLite real en memoria con reloj controlable; solo para pruebas. */
export function crearEntorno(fechaInicial: string) {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, {
    migrationsFolder: path.join(__dirname, '../../infrastructure/db/migrations'),
  });

  let hoy: Fecha = crearFecha(fechaInicial);
  let secuencia = 0;
  const reloj: Reloj = { hoy: () => hoy, ahora: () => `${hoy}T12:00:00.000Z` };
  aplicarSemillas(db, reloj.ahora());

  const dependencias: Dependencias = {
    unidad: crearUnidadDeTrabajo(db),
    reloj,
    generarId: () => `id-${++secuencia}`,
  };
  return {
    dependencias,
    repos: crearRepositorios(db),
    irA: (fecha: string) => {
      hoy = crearFecha(fecha);
    },
    cerrar: () => sqlite.close(),
  };
}

export function codigoDe(accion: () => unknown): string {
  try {
    accion();
  } catch (error) {
    return error instanceof ErrorDominio ? error.codigo : `OTRO_ERROR: ${String(error)}`;
  }
  return 'SIN_ERROR';
}
