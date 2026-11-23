/** @jest-environment node */
import { saldoCuenta } from '../../domain/services/saldos';
import { crearCasosCuentas } from './cuentas';
import { codigoDe, crearEntorno } from './entorno-prueba';
import { crearCasosMovimientos } from './movimientos';

const BOLSA = 'cuenta-quincena';
const EFECTIVO = 'cuenta-efectivo';
const MERCADO = 'cat-gasto-mercado';
const SUELDO = 'cat-ingreso-sueldo';

let entorno: ReturnType<typeof crearEntorno>;
let movimientos: ReturnType<typeof crearCasosMovimientos>;
let cuentas: ReturnType<typeof crearCasosCuentas>;

const saldo = (id: string) => {
  const cuenta = entorno.repos.cuentas.obtener(id);
  if (!cuenta) throw new Error('sin cuenta');
  return saldoCuenta(cuenta, entorno.repos.movimientos.listar());
};
const ingresar = (monto: number) =>
  movimientos.registrarMovimiento({ tipo: 'INGRESO', monto, categoriaId: SUELDO });
const nuevaBilletera = (saldoInicial = 0) =>
  cuentas.crearCuenta({ nombre: 'Nequi', tipo: 'BILLETERA', saldoInicial });

beforeEach(() => {
  entorno = crearEntorno('2026-11-22');
  movimientos = crearCasosMovimientos(entorno.dependencias);
  cuentas = crearCasosCuentas(entorno.dependencias);
});
afterEach(() => entorno.cerrar());

describe('registrarMovimiento', () => {
  test('por defecto usa la bolsa y la fecha de hoy', () => {
    const gasto = movimientos.registrarMovimiento({
      tipo: 'GASTO',
      monto: 86400,
      categoriaId: MERCADO,
      medioPago: 'DEBITO',
    });
    expect(gasto).toMatchObject({ cuentaId: BOLSA, fecha: '2026-11-22', medioPago: 'DEBITO' });
    expect(saldo(BOLSA)).toBe(-86400);
  });

  test('un gasto desde otra cuenta no toca la bolsa', () => {
    movimientos.registrarMovimiento({
      tipo: 'GASTO',
      monto: 5000,
      categoriaId: MERCADO,
      cuentaId: EFECTIVO,
    });
    expect(saldo(BOLSA)).toBe(0);
    expect(saldo(EFECTIVO)).toBe(-5000);
  });

  test('registra un descuento', () => {
    movimientos.registrarMovimiento({
      tipo: 'DESCUENTO',
      monto: 100000,
      categoriaId: 'cat-descuento-libranza',
    });
    expect(saldo(BOLSA)).toBe(-100000);
  });

  test.each([
    ['monto cero', { monto: 0 }, 'MONTO_INVALIDO'],
    ['monto negativo', { monto: -1 }, 'MONTO_INVALIDO'],
    ['monto decimal', { monto: 1.5 }, 'MONTO_INVALIDO'],
    ['fecha inválida', { fecha: '2026-02-30' }, 'FECHA_INVALIDA'],
    ['cuenta inexistente', { cuentaId: 'x' }, 'CUENTA_NO_ENCONTRADA'],
    ['categoría de otro tipo', { categoriaId: SUELDO }, 'CATEGORIA_INVALIDA'],
    ['categoría inexistente', { categoriaId: 'x' }, 'CATEGORIA_INVALIDA'],
  ])('rechaza %s', (_, datos, codigo) => {
    expect(
      codigoDe(() =>
        movimientos.registrarMovimiento({
          tipo: 'GASTO',
          monto: 1000,
          categoriaId: MERCADO,
          ...datos,
        }),
      ),
    ).toBe(codigo);
    expect(entorno.repos.movimientos.listar()).toHaveLength(0);
  });

  test('rechaza una cuenta archivada', () => {
    const billetera = nuevaBilletera();
    cuentas.archivarCuenta(billetera.id);
    expect(
      codigoDe(() =>
        movimientos.registrarMovimiento({
          tipo: 'GASTO',
          monto: 1000,
          categoriaId: MERCADO,
          cuentaId: billetera.id,
        }),
      ),
    ).toBe('CUENTA_INVALIDA');
  });
});

describe('editar y eliminar', () => {
  test('editar recalcula el saldo y conserva lo no cambiado', () => {
    const gasto = movimientos.registrarMovimiento({
      tipo: 'GASTO',
      monto: 1000,
      categoriaId: MERCADO,
      nota: 'Almuerzo',
    });
    entorno.irA('2026-11-23');
    const editado = movimientos.editarMovimiento(gasto.id, { monto: 2500 });
    expect(editado).toMatchObject({ monto: 2500, nota: 'Almuerzo', fecha: '2026-11-22' });
    expect(editado.actualizadoEn).toBe('2026-11-23T12:00:00.000Z');
    expect(saldo(BOLSA)).toBe(-2500);
  });

  test('permite borrar la nota', () => {
    const gasto = movimientos.registrarMovimiento({
      tipo: 'GASTO',
      monto: 1000,
      categoriaId: MERCADO,
      nota: 'x',
    });
    expect(movimientos.editarMovimiento(gasto.id, { nota: null }).nota).toBeNull();
  });

  test('rechaza una categoría incoherente al editar', () => {
    const gasto = movimientos.registrarMovimiento({
      tipo: 'GASTO',
      monto: 1000,
      categoriaId: MERCADO,
    });
    expect(codigoDe(() => movimientos.editarMovimiento(gasto.id, { categoriaId: SUELDO }))).toBe(
      'CATEGORIA_INVALIDA',
    );
  });

  test('eliminar restaura el saldo', () => {
    const gasto = movimientos.registrarMovimiento({
      tipo: 'GASTO',
      monto: 1000,
      categoriaId: MERCADO,
    });
    movimientos.eliminarMovimiento(gasto.id);
    expect(saldo(BOLSA)).toBe(0);
  });

  test('avisa si el movimiento no existe', () => {
    expect(codigoDe(() => movimientos.eliminarMovimiento('x'))).toBe('MOVIMIENTO_NO_ENCONTRADO');
    expect(codigoDe(() => movimientos.editarMovimiento('x', { monto: 1 }))).toBe(
      'MOVIMIENTO_NO_ENCONTRADO',
    );
  });
});

describe('transferirEntreCuentas', () => {
  test('baja la bolsa, sube la billetera y no cuenta como gasto', () => {
    ingresar(500000);
    const billetera = nuevaBilletera(10000);
    movimientos.transferirEntreCuentas({
      monto: 200000,
      cuentaOrigenId: BOLSA,
      cuentaDestinoId: billetera.id,
    });
    expect(saldo(BOLSA)).toBe(300000);
    expect(saldo(billetera.id)).toBe(210000);
  });

  test('permite pasar exactamente todo el disponible', () => {
    ingresar(500000);
    const billetera = nuevaBilletera();
    movimientos.transferirEntreCuentas({
      monto: 500000,
      cuentaOrigenId: BOLSA,
      cuentaDestinoId: billetera.id,
    });
    expect(saldo(BOLSA)).toBe(0);
  });

  test('rechaza un valor mayor al disponible y no guarda nada', () => {
    ingresar(500000);
    const billetera = nuevaBilletera();
    expect(
      codigoDe(() =>
        movimientos.transferirEntreCuentas({
          monto: 500001,
          cuentaOrigenId: BOLSA,
          cuentaDestinoId: billetera.id,
        }),
      ),
    ).toBe('DISPONIBLE_INSUFICIENTE');
    expect(saldo(BOLSA)).toBe(500000);
    expect(saldo(billetera.id)).toBe(0);
  });

  test('un ingreso con fecha futura no cuenta como disponible hoy', () => {
    movimientos.registrarMovimiento({
      tipo: 'INGRESO',
      monto: 500000,
      categoriaId: SUELDO,
      fecha: '2026-11-30',
    });
    const billetera = nuevaBilletera();
    expect(
      codigoDe(() =>
        movimientos.transferirEntreCuentas({
          monto: 1000,
          cuentaOrigenId: BOLSA,
          cuentaDestinoId: billetera.id,
        }),
      ),
    ).toBe('DISPONIBLE_INSUFICIENTE');
  });

  test('traer plata a la bolsa desde otra cuenta sube el disponible', () => {
    const billetera = nuevaBilletera(50000);
    movimientos.transferirEntreCuentas({
      monto: 20000,
      cuentaOrigenId: billetera.id,
      cuentaDestinoId: BOLSA,
    });
    expect(saldo(BOLSA)).toBe(20000);
  });

  test.each([
    ['misma cuenta', BOLSA, BOLSA, 'CUENTA_INVALIDA'],
    ['origen inexistente', 'x', BOLSA, 'CUENTA_NO_ENCONTRADA'],
    ['destino inexistente', BOLSA, 'x', 'CUENTA_NO_ENCONTRADA'],
  ])('rechaza %s', (_, cuentaOrigenId, cuentaDestinoId, codigo) => {
    ingresar(1000);
    expect(
      codigoDe(() =>
        movimientos.transferirEntreCuentas({ monto: 100, cuentaOrigenId, cuentaDestinoId }),
      ),
    ).toBe(codigo);
  });

  test('al editar no cuenta dos veces su propio valor', () => {
    ingresar(500000);
    const billetera = nuevaBilletera();
    const t = movimientos.transferirEntreCuentas({
      monto: 400000,
      cuentaOrigenId: BOLSA,
      cuentaDestinoId: billetera.id,
    });
    expect(movimientos.editarMovimiento(t.id, { monto: 500000 }).monto).toBe(500000);
    expect(codigoDe(() => movimientos.editarMovimiento(t.id, { monto: 500001 }))).toBe(
      'DISPONIBLE_INSUFICIENTE',
    );
    expect(saldo(BOLSA)).toBe(0);
  });
});

describe('cuentas', () => {
  test('crea una billetera con su saldo y nombre limpio', () => {
    const cuenta = cuentas.crearCuenta({
      nombre: '  Nequi ',
      tipo: 'BILLETERA',
      saldoInicial: 320000,
    });
    expect(cuenta).toMatchObject({ nombre: 'Nequi', saldoInicial: 320000, moneda: 'COP' });
    expect(saldo(cuenta.id)).toBe(320000);
  });

  test('rechaza nombre vacío, saldo decimal y una segunda bolsa', () => {
    expect(codigoDe(() => cuentas.crearCuenta({ nombre: '  ', tipo: 'AHORRO' }))).toBe(
      'CUENTA_INVALIDA',
    );
    expect(
      codigoDe(() => cuentas.crearCuenta({ nombre: 'A', tipo: 'AHORRO', saldoInicial: 1.5 })),
    ).toBe('MONTO_INVALIDO');
    expect(codigoDe(() => cuentas.crearCuenta({ nombre: 'B', tipo: 'QUINCENA' as 'AHORRO' }))).toBe(
      'CUENTA_INVALIDA',
    );
  });

  test('edita nombre y saldo inicial', () => {
    const cuenta = nuevaBilletera(1000);
    expect(
      cuentas.editarCuenta(cuenta.id, { nombre: 'Daviplata', saldoInicial: 2000 }),
    ).toMatchObject({ nombre: 'Daviplata', saldoInicial: 2000 });
  });

  test('no archiva la bolsa ni una cuenta con saldo', () => {
    const cuenta = nuevaBilletera(1000);
    expect(codigoDe(() => cuentas.archivarCuenta(BOLSA))).toBe('CUENTA_INVALIDA');
    expect(codigoDe(() => cuentas.archivarCuenta(cuenta.id))).toBe('CUENTA_CON_SALDO');
  });

  test('archiva una cuenta en cero y la oculta', () => {
    const cuenta = nuevaBilletera();
    cuentas.archivarCuenta(cuenta.id);
    expect(entorno.repos.cuentas.listar().map((c) => c.id)).not.toContain(cuenta.id);
  });
});
