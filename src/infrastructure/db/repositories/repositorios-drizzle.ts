import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';

import { ErrorDominio } from '../../../domain/errors/error-dominio';
import type { Repositorios, UnidadDeTrabajo } from '../../../domain/ports/repositorios';
import { crearFecha } from '../../../domain/value-objects/fecha';
import {
  categoria,
  corteQuincena,
  cuenta,
  movimiento,
  ocurrencia,
  reglaRecurrencia,
} from '../schema';
import type { BaseDatos } from '../tipos';
import { aCorte, aCuenta, aFilaRegla, aMovimiento, aOcurrencia, aRegla } from './mapeadores';

export function crearRepositorios(db: BaseDatos): Repositorios {
  return {
    cuentas: {
      guardar: (c) => {
        db.insert(cuenta).values(c).onConflictDoUpdate({ target: cuenta.id, set: c }).run();
      },
      obtener: (id) => {
        const fila = db.select().from(cuenta).where(eq(cuenta.id, id)).get();
        return fila ? aCuenta(fila) : null;
      },
      listar: () =>
        db
          .select()
          .from(cuenta)
          .where(eq(cuenta.archivada, false))
          .orderBy(asc(cuenta.creadoEn), asc(cuenta.nombre))
          .all()
          .map(aCuenta),
      obtenerBolsa: () => {
        const fila = db.select().from(cuenta).where(eq(cuenta.tipo, 'QUINCENA')).get();
        if (!fila) throw new ErrorDominio('BOLSA_NO_ENCONTRADA', 'No existe la cuenta Quincena');
        return aCuenta(fila);
      },
    },

    categorias: {
      guardar: (c) => {
        db.insert(categoria).values(c).onConflictDoUpdate({ target: categoria.id, set: c }).run();
      },
      obtener: (id) => db.select().from(categoria).where(eq(categoria.id, id)).get() ?? null,
      listar: (tipo) =>
        db
          .select()
          .from(categoria)
          .where(and(eq(categoria.tipo, tipo), eq(categoria.archivada, false)))
          .orderBy(asc(categoria.orden))
          .all(),
    },

    movimientos: {
      guardar: (m) => {
        db.insert(movimiento).values(m).onConflictDoUpdate({ target: movimiento.id, set: m }).run();
      },
      obtener: (id) => {
        const fila = db.select().from(movimiento).where(eq(movimiento.id, id)).get();
        return fila ? aMovimiento(fila) : null;
      },
      eliminar: (id) => {
        db.delete(movimiento).where(eq(movimiento.id, id)).run();
      },
      listar: () =>
        db
          .select()
          .from(movimiento)
          .orderBy(asc(movimiento.fecha), asc(movimiento.creadoEn))
          .all()
          .map(aMovimiento),
      listarRecientes: (limite) =>
        db
          .select()
          .from(movimiento)
          .orderBy(desc(movimiento.fecha), desc(movimiento.creadoEn))
          .limit(limite)
          .all()
          .map(aMovimiento),
      listarPorOcurrencia: (ocurrenciaId) =>
        db
          .select()
          .from(movimiento)
          .where(eq(movimiento.ocurrenciaId, ocurrenciaId))
          .all()
          .map(aMovimiento),
    },

    reglas: {
      guardar: (r) => {
        const fila = aFilaRegla(r);
        db.insert(reglaRecurrencia)
          .values(fila)
          .onConflictDoUpdate({ target: reglaRecurrencia.id, set: fila })
          .run();
      },
      obtener: (id) => {
        const fila = db.select().from(reglaRecurrencia).where(eq(reglaRecurrencia.id, id)).get();
        return fila ? aRegla(fila) : null;
      },
      listarActivas: () =>
        db
          .select()
          .from(reglaRecurrencia)
          .where(eq(reglaRecurrencia.activa, true))
          .all()
          .map(aRegla),
    },

    ocurrencias: {
      insertarNuevas: (ocurrencias) => {
        if (ocurrencias.length === 0) return;
        db.insert(ocurrencia)
          .values([...ocurrencias])
          .onConflictDoNothing({ target: [ocurrencia.reglaId, ocurrencia.fecha] })
          .run();
      },
      guardar: (o) => {
        db.insert(ocurrencia).values(o).onConflictDoUpdate({ target: ocurrencia.id, set: o }).run();
      },
      obtener: (id) => {
        const fila = db.select().from(ocurrencia).where(eq(ocurrencia.id, id)).get();
        return fila ? aOcurrencia(fila) : null;
      },
      listarPendientes: () =>
        db
          .select()
          .from(ocurrencia)
          .where(eq(ocurrencia.estado, 'PENDIENTE'))
          .orderBy(asc(ocurrencia.fecha))
          .all()
          .map(aOcurrencia),
      listarEnRango: (desde, hasta) =>
        db
          .select()
          .from(ocurrencia)
          .where(and(gte(ocurrencia.fecha, desde), lte(ocurrencia.fecha, hasta)))
          .orderBy(asc(ocurrencia.fecha))
          .all()
          .map(aOcurrencia),
      ultimaFecha: (reglaId) => {
        const fila = db
          .select({ fecha: ocurrencia.fecha })
          .from(ocurrencia)
          .where(eq(ocurrencia.reglaId, reglaId))
          .orderBy(desc(ocurrencia.fecha))
          .limit(1)
          .get();
        return fila ? crearFecha(fila.fecha) : null;
      },
      ultimaPagadaDeReglas: (reglaIds) => {
        if (reglaIds.length === 0) return null;
        const fila = db
          .select()
          .from(ocurrencia)
          .where(and(inArray(ocurrencia.reglaId, [...reglaIds]), eq(ocurrencia.estado, 'PAGADA')))
          .orderBy(desc(ocurrencia.fecha))
          .limit(1)
          .get();
        return fila ? aOcurrencia(fila) : null;
      },
    },

    cortes: {
      guardar: (c) => {
        db.insert(corteQuincena).values(c).run();
      },
      ultimo: () => {
        const fila = db
          .select()
          .from(corteQuincena)
          .orderBy(desc(corteQuincena.fechaInicio))
          .limit(1)
          .get();
        return fila ? aCorte(fila) : null;
      },
      listar: () =>
        db.select().from(corteQuincena).orderBy(desc(corteQuincena.fechaInicio)).all().map(aCorte),
      eliminar: (id) => {
        db.delete(corteQuincena).where(eq(corteQuincena.id, id)).run();
      },
    },
  };
}

export const crearUnidadDeTrabajo = (db: BaseDatos): UnidadDeTrabajo => ({
  ejecutar: (trabajo) => db.transaction((tx) => trabajo(crearRepositorios(tx))),
});
