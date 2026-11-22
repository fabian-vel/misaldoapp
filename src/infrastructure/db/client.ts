import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';

import migraciones from './migrations/migrations';
import * as schema from './schema';

export async function abrirBaseDatos() {
  const cliente = openDatabaseSync('misaldo.db');
  cliente.execSync('PRAGMA foreign_keys = ON;');
  const db = drizzle(cliente, { schema });
  await migrate(db, migraciones);
  return db;
}
