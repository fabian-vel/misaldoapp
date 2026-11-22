/** @jest-environment node */
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';

import type { Movimiento } from '../../domain/entities/movimiento';
import type { Ocurrencia } from '../../domain/entities/ocurrencia';
import type { ReglaRecurrencia } from '../../domain/entities/regla-recurrencia';
import { ErrorDominio } from '../../domain/errors/error-dominio';
import type { Repositorios, UnidadDeTrabajo } from '../../domain/ports/repositorios';
import type { ReglaFechas } from '../../domain/services/calculadora-recurrencias';
import { calcularResumenQuincena } from '../../domain/services/resumen-quincena';
import { crearDinero, crearMonto } from '../../domain/value-objects/dinero';
import { crearFecha } from '../../domain/value-objects/fecha';
import { abrirPeriodo } from '../../domain/value-objects/periodo';
import { crearRepositorios, crearUnidadDeTrabajo } from './repositories/repositorios-drizzle';
import * as schema from './schema';
import { aplicarSemillas } from './semillas';

const f = crearFecha;
const AHORA = '2026-11-22T17:00:00.000Z';

let sqlite: Database.Database;
let db: ReturnType<typeof crearDb>;
let repos: Repositorios;
let unidad: UnidadDeTrabajo;

function crearDb() {
  return drizzle(sqlite, { schema });
}

beforeEach(() => {
  sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  db = crearDb();
  migrate(db, { migrationsFolder: path.join(__dirname, 'migrations') });
  aplicarSemillas(db, AHORA);
  repos = crearRepositorios(db);
  unidad = crearUnidadDeTrabajo(db);
});

afterEach(() => sqlite.close());

const movimiento = (datos: Partial<Movimiento> & { id: string }): Movimiento => ({
  tipo: 'GASTO',
  monto: crearMonto(1000),
  fecha: f('2026-11-20'),
  cuentaId: 'cuenta-quincena',
  cuentaDestinoId: null,
  categoriaId: 'cat-gasto-mercado',
  deudaId: null,
  ocurrenciaId: null,
  nota: null,
  medioPago: 'EFECTIVO',
  creadoEn: AHORA,
  actualizadoEn: AHORA,
  ...datos,
});

const regla = (id: string, fechas: ReglaFechas): ReglaRecurrencia => ({
  id,
  nombre: 'Regla',
  tipoMovimiento: 'GASTO',
  monto: crearMonto(38900),
  cuentaId: 'cuenta-quincena',
  categoriaId: 'cat-gasto-servicios',
  deudaId: null,
  fechas,
  esSueldo: false,
  recordatorioActivo: true,
  recordatorioDiasAntes: 1,
  recordatorioHora: '08:00',
  activa: true,
  creadoEn: AHORA,
  actualizadoEn: AHORA,
});

const ocurrencia = (id: string, fecha: string, reglaId = 'r1'): Ocurrencia => ({
  id,
  reglaId,
  fecha: f(fecha),
  monto: crearMonto(38900),
  estado: 'PENDIENTE',
  movimientoId: null,
});

const REGLA_MENSUAL: ReglaFechas = {
  frecuencia: 'MENSUAL',
  dia: 25,
  fechaInicio: f('2026-01-01'),
};

describe('semillas', () => {
  test('crean las cuentas y categorías iniciales', () => {
    expect(repos.cuentas.listar().map((c) => c.nombre)).toEqual(['Efectivo', 'Quincena']);
    expect(repos.categorias.listar('GASTO')).toHaveLength(8);
    expect(repos.categorias.listar('INGRESO').map((c) => c.nombre)).toEqual([
      'Sueldo',
      'Horas extra',
      'Bono',
      'Prima',
      'Vacaciones',
      'Otro',
    ]);
    expect(repos.categorias.listar('DESCUENTO')).toHaveLength(4);
  });

  test('se aplican una sola vez y respetan los cambios del usuario', () => {
    const bolsa = repos.cuentas.obtenerBolsa();
    repos.cuentas.guardar({ ...bolsa, saldoInicial: crearDinero(50000) });
    db.delete(schema.categoria).where(eq(schema.categoria.id, 'cat-gasto-ocio')).run();

    aplicarSemillas(db, '2027-01-01T00:00:00.000Z');

    expect(repos.cuentas.listar()).toHaveLength(2);
    expect(repos.cuentas.obtenerBolsa().saldoInicial).toBe(50000);
    expect(repos.categorias.obtener('cat-gasto-ocio')).toBeNull();
  });
});

describe('cuentas', () => {
  test('guarda, actualiza y oculta las archivadas', () => {
    const nequi = {
      id: 'nequi',
      nombre: 'Nequi',
      tipo: 'BILLETERA' as const,
      saldoInicial: crearDinero(320000),
      moneda: 'COP',
      archivada: false,
      creadoEn: AHORA,
      actualizadoEn: AHORA,
    };
    repos.cuentas.guardar(nequi);
    repos.cuentas.guardar({ ...nequi, nombre: 'Mi Nequi' });
    expect(repos.cuentas.obtener('nequi')).toEqual({ ...nequi, nombre: 'Mi Nequi' });

    repos.cuentas.guardar({ ...nequi, archivada: true });
    expect(repos.cuentas.listar().map((c) => c.id)).not.toContain('nequi');
    expect(repos.cuentas.obtener('nequi')?.archivada).toBe(true);
  });

  test('solo puede existir una bolsa Quincena', () => {
    expect(() =>
      repos.cuentas.guardar({
        ...repos.cuentas.obtenerBolsa(),
        id: 'otra-bolsa',
      }),
    ).toThrow();
  });

  test('avisa con un error tipado si falta la bolsa', () => {
    sqlite.prepare("DELETE FROM cuenta WHERE tipo = 'QUINCENA'").run();
    try {
      repos.cuentas.obtenerBolsa();
      throw new Error('debía fallar');
    } catch (error) {
      expect(error).toBeInstanceOf(ErrorDominio);
      expect((error as ErrorDominio).codigo).toBe('BOLSA_NO_ENCONTRADA');
    }
  });
});

describe('movimientos', () => {
  test('guarda, lee, edita y elimina', () => {
    const gasto = movimiento({ id: 'm1', nota: 'Almuerzo', medioPago: 'DEBITO' });
    repos.movimientos.guardar(gasto);
    expect(repos.movimientos.obtener('m1')).toEqual(gasto);

    repos.movimientos.guardar({ ...gasto, monto: crearMonto(2000) });
    expect(repos.movimientos.obtener('m1')?.monto).toBe(2000);

    repos.movimientos.eliminar('m1');
    expect(repos.movimientos.obtener('m1')).toBeNull();
  });

  test('lista recientes del más nuevo al más antiguo', () => {
    repos.movimientos.guardar(movimiento({ id: 'a', fecha: f('2026-11-18') }));
    repos.movimientos.guardar(movimiento({ id: 'b', fecha: f('2026-11-22') }));
    repos.movimientos.guardar(movimiento({ id: 'c', fecha: f('2026-11-20') }));
    expect(repos.movimientos.listarRecientes(2).map((m) => m.id)).toEqual(['b', 'c']);
    expect(repos.movimientos.listar().map((m) => m.id)).toEqual(['a', 'c', 'b']);
  });

  test('la base rechaza montos cero o negativos', () => {
    const insertar = (monto: number) =>
      sqlite
        .prepare(
          "INSERT INTO movimiento (id, tipo, monto, fecha, creado_en, actualizado_en) VALUES (?, 'GASTO', ?, '2026-11-22', 'x', 'x')",
        )
        .run(`m${monto}`, monto);
    expect(() => insertar(0)).toThrow(/CHECK/);
    expect(() => insertar(-1)).toThrow(/CHECK/);
  });

  test('la base rechaza una cuenta inexistente', () => {
    expect(() =>
      repos.movimientos.guardar(movimiento({ id: 'm1', cuentaId: 'no-existe' })),
    ).toThrow(/FOREIGN KEY/);
  });

  test('una compra a crédito puede no tener cuenta', () => {
    const compra = movimiento({ id: 'm1', tipo: 'COMPRA_CREDITO', cuentaId: null });
    repos.movimientos.guardar(compra);
    expect(repos.movimientos.obtener('m1')?.cuentaId).toBeNull();
  });
});

describe('reglas', () => {
  test.each<[string, ReglaFechas]>([
    ['mensual', REGLA_MENSUAL],
    ['último día', { frecuencia: 'MENSUAL', dia: 'ULTIMO', fechaInicio: f('2026-01-01') }],
    [
      'quincenal',
      { frecuencia: 'QUINCENAL_DIAS', dias: [15, 'ULTIMO'], fechaInicio: f('2026-01-01') },
    ],
    [
      'cada N días',
      {
        frecuencia: 'CADA_N_DIAS',
        intervaloDias: 14,
        fechaInicio: f('2026-01-01'),
        fechaFin: f('2027-01-01'),
      },
    ],
    ['semanal', { frecuencia: 'SEMANAL', fechaInicio: f('2026-01-01') }],
    ['anual', { frecuencia: 'ANUAL', fechaInicio: f('2028-02-29') }],
  ])('conserva una regla %s', (_, fechas) => {
    repos.reglas.guardar(regla('r1', fechas));
    expect(repos.reglas.obtener('r1')?.fechas).toEqual({ fechaFin: null, ...fechas });
  });

  test('lista solo las activas', () => {
    repos.reglas.guardar(regla('r1', REGLA_MENSUAL));
    repos.reglas.guardar({ ...regla('r2', REGLA_MENSUAL), activa: false });
    expect(repos.reglas.listarActivas().map((r) => r.id)).toEqual(['r1']);
  });

  test.each(['no-json', '[]', '["OTRO"]', '[1,2]'])('rechaza días guardados como %s', (diasMes) => {
    repos.reglas.guardar(regla('r1', REGLA_MENSUAL));
    sqlite.prepare('UPDATE regla_recurrencia SET dias_mes = ?').run(diasMes);
    expect(() => repos.reglas.obtener('r1')).toThrow(ErrorDominio);
  });
});

describe('ocurrencias', () => {
  beforeEach(() => repos.reglas.guardar(regla('r1', REGLA_MENSUAL)));

  test('insertar dos veces la misma fecha no duplica ni pisa el estado', () => {
    repos.ocurrencias.insertarNuevas([ocurrencia('o1', '2026-11-25')]);
    repos.ocurrencias.guardar({ ...ocurrencia('o1', '2026-11-25'), estado: 'OMITIDA' });

    repos.ocurrencias.insertarNuevas([
      ocurrencia('otro-id', '2026-11-25'),
      ocurrencia('o2', '2026-12-25'),
    ]);

    const todas = repos.ocurrencias.listarEnRango(f('2026-01-01'), f('2026-12-31'));
    expect(todas.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(todas[0].estado).toBe('OMITIDA');
  });

  test('aceptar una lista vacía no hace nada', () => {
    expect(() => repos.ocurrencias.insertarNuevas([])).not.toThrow();
  });

  test('lista pendientes en orden y filtra por rango', () => {
    repos.ocurrencias.insertarNuevas([
      ocurrencia('b', '2026-12-25'),
      ocurrencia('a', '2026-11-25'),
      { ...ocurrencia('c', '2027-01-25'), estado: 'PAGADA' },
    ]);
    expect(repos.ocurrencias.listarPendientes().map((o) => o.id)).toEqual(['a', 'b']);
    expect(
      repos.ocurrencias.listarEnRango(f('2026-12-01'), f('2027-01-31')).map((o) => o.id),
    ).toEqual(['b', 'c']);
  });

  test('borrar el movimiento deja la ocurrencia sin vínculo', () => {
    repos.ocurrencias.insertarNuevas([ocurrencia('o1', '2026-11-25')]);
    repos.movimientos.guardar(movimiento({ id: 'm1', ocurrenciaId: 'o1' }));
    repos.ocurrencias.guardar({
      ...ocurrencia('o1', '2026-11-25'),
      estado: 'PAGADA',
      movimientoId: 'm1',
    });

    repos.movimientos.eliminar('m1');

    expect(repos.ocurrencias.obtener('o1')?.movimientoId).toBeNull();
  });
});

describe('cortes', () => {
  const corte = (id: string, inicio: string, fin: string, programado = inicio) => ({
    id,
    fechaInicio: f(inicio),
    fechaFin: f(fin),
    pagoProgramado: f(programado),
    cerradoEn: AHORA,
  });

  test('devuelve el último y conserva la fecha programada', () => {
    expect(repos.cortes.ultimo()).toBeNull();
    repos.cortes.guardar(corte('c1', '2026-10-31', '2026-11-14'));
    repos.cortes.guardar(corte('c2', '2026-11-14', '2026-11-28', '2026-11-15'));
    expect(repos.cortes.ultimo()).toEqual(corte('c2', '2026-11-14', '2026-11-28', '2026-11-15'));
    expect(repos.cortes.listar().map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  test('no permite cerrar dos veces la misma quincena', () => {
    repos.cortes.guardar(corte('c1', '2026-11-15', '2026-11-29'));
    expect(() => repos.cortes.guardar(corte('c2', '2026-11-15', '2026-11-29'))).toThrow(/UNIQUE/);
  });
});

describe('unidad de trabajo', () => {
  test('confirma todo y devuelve el resultado', () => {
    const resultado = unidad.ejecutar((r) => {
      r.movimientos.guardar(movimiento({ id: 'm1' }));
      r.movimientos.guardar(movimiento({ id: 'm2' }));
      return r.movimientos.listar().length;
    });
    expect(resultado).toBe(2);
    expect(repos.movimientos.listar()).toHaveLength(2);
  });

  test('si algo falla no guarda nada', () => {
    expect(() =>
      unidad.ejecutar((r) => {
        r.movimientos.guardar(movimiento({ id: 'm1' }));
        throw new ErrorDominio('MONTO_INVALIDO', 'falla a propósito');
      }),
    ).toThrow(ErrorDominio);
    expect(repos.movimientos.listar()).toHaveLength(0);
  });
});

test('los datos guardados alimentan el resumen de quincena', () => {
  const bolsa = repos.cuentas.obtenerBolsa();
  repos.movimientos.guardar(
    movimiento({
      id: 'sueldo',
      tipo: 'INGRESO',
      monto: crearMonto(3000000),
      fecha: f('2026-11-15'),
      categoriaId: 'cat-ingreso-sueldo',
    }),
  );
  repos.movimientos.guardar(movimiento({ id: 'gasto', monto: crearMonto(86400) }));

  const resumen = calcularResumenQuincena(
    bolsa,
    abrirPeriodo(f('2026-11-15'), f('2026-11-15')),
    repos.movimientos.listar(),
    [],
  );

  expect(resumen.disponible).toBe(2913600);
});
