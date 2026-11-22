import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

import type * as schema from './schema';

/** Conexión o transacción síncrona; la usan tanto expo-sqlite como las pruebas en el PC. */
export type BaseDatos = BaseSQLiteDatabase<'sync', unknown, typeof schema>;
