import { eq } from 'drizzle-orm';

import type { TipoCategoria } from '../../domain/entities/categoria';
import { categoria, cuenta, meta } from './schema';
import type { BaseDatos } from './tipos';

const CLAVE_SEMILLAS = 'semillas_aplicadas';

const CATEGORIAS: Record<TipoCategoria, readonly (readonly [string, string, string])[]> = {
  GASTO: [
    ['mercado', 'Mercado', 'shopping-cart'],
    ['transporte', 'Transporte', 'fuel'],
    ['comida', 'Comida', 'coffee'],
    ['hogar', 'Hogar', 'house'],
    ['salud', 'Salud', 'heart-pulse'],
    ['ocio', 'Ocio', 'ticket'],
    ['servicios', 'Servicios', 'plug'],
    ['otro', 'Otro', 'circle-ellipsis'],
  ],
  INGRESO: [
    ['sueldo', 'Sueldo', 'banknote'],
    ['horas-extra', 'Horas extra', 'clock'],
    ['bono', 'Bono', 'gift'],
    ['prima', 'Prima', 'award'],
    ['vacaciones', 'Vacaciones', 'palmtree'],
    ['otro', 'Otro', 'circle-ellipsis'],
  ],
  DESCUENTO: [
    ['libranza', 'Libranza', 'landmark'],
    ['incapacidad', 'Incapacidad', 'stethoscope'],
    ['ausencia', 'Ausencia', 'calendar-x'],
    ['otro', 'Otro', 'circle-ellipsis'],
  ],
};

/** Crea los datos iniciales una sola vez, aunque el usuario los cambie después. */
export function aplicarSemillas(db: BaseDatos, ahora: string): void {
  db.transaction((tx) => {
    if (tx.select().from(meta).where(eq(meta.clave, CLAVE_SEMILLAS)).get()) return;

    const fechas = { creadoEn: ahora, actualizadoEn: ahora };
    tx.insert(cuenta)
      .values([
        { id: 'cuenta-quincena', nombre: 'Quincena', tipo: 'QUINCENA', ...fechas },
        { id: 'cuenta-efectivo', nombre: 'Efectivo', tipo: 'EFECTIVO', ...fechas },
      ])
      .run();

    const categorias = (Object.keys(CATEGORIAS) as TipoCategoria[]).flatMap((tipo) =>
      CATEGORIAS[tipo].map(([clave, nombre, icono], orden) => ({
        id: `cat-${tipo.toLowerCase()}-${clave}`,
        nombre,
        tipo,
        icono,
        orden,
      })),
    );
    tx.insert(categoria).values(categorias).run();

    tx.insert(meta)
      .values([
        { clave: CLAVE_SEMILLAS, valor: ahora },
        { clave: 'version_esquema', valor: '1' },
      ])
      .run();
  });
}
