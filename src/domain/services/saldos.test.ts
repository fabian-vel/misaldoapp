import type { MovimientoSaldo, TipoMovimiento } from '../entities/movimiento';
import { crearDinero, crearMonto } from '../value-objects/dinero';
import { crearFecha } from '../value-objects/fecha';
import { efectoEnCuenta, saldoCuenta } from './saldos';

const mov = (
  tipo: TipoMovimiento,
  monto: number,
  cuentaId: string | null = 'nequi',
  cuentaDestinoId: string | null = null,
): MovimientoSaldo => ({
  tipo,
  monto: crearMonto(monto),
  fecha: crearFecha('2026-11-22'),
  cuentaId,
  cuentaDestinoId,
});

describe('efectoEnCuenta', () => {
  test.each<[TipoMovimiento, number]>([
    ['INGRESO', 1000],
    ['GASTO', -1000],
    ['DESCUENTO', -1000],
    ['PAGO_DEUDA', -1000],
    ['COMPRA_CREDITO', 0],
    ['AJUSTE_DEUDA_MAS', 0],
    ['AJUSTE_DEUDA_MENOS', 0],
  ])('%s cambia la cuenta en %d', (tipo, esperado) => {
    expect(efectoEnCuenta(mov(tipo, 1000), 'nequi')).toBe(esperado);
  });

  test('no afecta a otra cuenta', () => {
    expect(efectoEnCuenta(mov('GASTO', 1000), 'ahorros')).toBe(0);
  });

  test('una transferencia resta del origen y suma al destino', () => {
    const transferencia = mov('TRANSFERENCIA', 500, 'quincena', 'ahorros');
    expect(efectoEnCuenta(transferencia, 'quincena')).toBe(-500);
    expect(efectoEnCuenta(transferencia, 'ahorros')).toBe(500);
    expect(efectoEnCuenta(transferencia, 'nequi')).toBe(0);
  });

  test('una transferencia a la misma cuenta no cambia el saldo', () => {
    expect(efectoEnCuenta(mov('TRANSFERENCIA', 500, 'nequi', 'nequi'), 'nequi')).toBe(0);
  });

  test('una compra a crédito sin cuenta no afecta ninguna cuenta', () => {
    expect(efectoEnCuenta(mov('COMPRA_CREDITO', 500, null), 'nequi')).toBe(0);
  });
});

describe('saldoCuenta', () => {
  const nequi = { id: 'nequi', saldoInicial: crearDinero(100000) };

  test('sin movimientos es el saldo inicial', () => {
    expect(saldoCuenta(nequi, [])).toBe(100000);
  });

  test('aplica todos los tipos de movimiento', () => {
    expect(
      saldoCuenta(nequi, [
        mov('INGRESO', 50000),
        mov('GASTO', 20000),
        mov('DESCUENTO', 5000),
        mov('PAGO_DEUDA', 10000),
        mov('COMPRA_CREDITO', 999999),
        mov('TRANSFERENCIA', 30000, 'quincena', 'nequi'),
        mov('TRANSFERENCIA', 15000, 'nequi', 'ahorros'),
      ]),
    ).toBe(130000);
  });

  test('puede quedar negativo', () => {
    expect(saldoCuenta(nequi, [mov('GASTO', 150000)])).toBe(-50000);
  });

  test('una transferencia conserva el total entre cuentas', () => {
    const ahorros = { id: 'ahorros', saldoInicial: crearDinero(200000) };
    const movimientos = [mov('TRANSFERENCIA', 70000, 'nequi', 'ahorros')];
    expect(saldoCuenta(nequi, movimientos) + saldoCuenta(ahorros, movimientos)).toBe(300000);
  });
});
