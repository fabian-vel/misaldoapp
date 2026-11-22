import type { MovimientoSaldo, TipoMovimiento } from '../entities/movimiento';
import { crearDinero, crearMonto } from '../value-objects/dinero';
import { crearFecha } from '../value-objects/fecha';
import { abrirPeriodo, cerrarPeriodo } from '../value-objects/periodo';
import { calcularCorte, calcularResumenQuincena } from './resumen-quincena';

const f = crearFecha;
const bolsa = { id: 'quincena', saldoInicial: crearDinero(0) };

const mov = (
  tipo: TipoMovimiento,
  monto: number,
  fecha: string,
  cuentaId: string | null = 'quincena',
  cuentaDestinoId: string | null = null,
): MovimientoSaldo => ({
  tipo,
  monto: crearMonto(monto),
  fecha: f(fecha),
  cuentaId,
  cuentaDestinoId,
});

const noviembre = abrirPeriodo(f('2026-11-15'), f('2026-11-15'));

// Mismos valores del prototipo.
const movimientosPrototipo = [
  mov('INGRESO', 120000, '2026-11-01'),
  mov('INGRESO', 3000000, '2026-11-15'),
  mov('INGRESO', 180000, '2026-11-15'),
  mov('DESCUENTO', 100000, '2026-11-15'),
  mov('GASTO', 549500, '2026-11-18'),
  mov('PAGO_DEUDA', 610000, '2026-11-20'),
  mov('TRANSFERENCIA', 200000, '2026-11-21', 'quincena', 'ahorros'),
];
const pendientesPrototipo = [
  mov('PAGO_DEUDA', 420000, '2026-11-23'),
  mov('GASTO', 38900, '2026-11-25'),
  mov('GASTO', 95000, '2026-11-28'),
  mov('PAGO_DEUDA', 200000, '2026-11-30'), // cae con el pago: es de la quincena nueva
];

describe('calcularResumenQuincena', () => {
  test('reproduce las cifras del prototipo', () => {
    expect(
      calcularResumenQuincena(bolsa, noviembre, movimientosPrototipo, pendientesPrototipo),
    ).toEqual({
      saldoAnterior: 120000,
      ingresos: 3180000,
      descuentos: 100000,
      gastos: 549500,
      pagosDeuda: 610000,
      transferidoEntrada: 0,
      transferidoSalida: 200000,
      sobrante: 1840500,
      disponible: 1840500,
      pendientes: 553900,
      teQuedaria: 1286600,
    });
  });

  test('pasar sobrante baja el disponible sin contar como gasto', () => {
    const conTransferencia = [
      ...movimientosPrototipo,
      mov('TRANSFERENCIA', 500000, '2026-11-22', 'quincena', 'nequi'),
    ];
    const resumen = calcularResumenQuincena(bolsa, noviembre, conTransferencia, []);
    expect(resumen.disponible).toBe(1340500);
    expect(resumen.gastos).toBe(549500);
    expect(resumen.transferidoSalida).toBe(700000);
  });

  test('traer plata de una billetera sube el disponible', () => {
    const resumen = calcularResumenQuincena(
      bolsa,
      noviembre,
      [mov('TRANSFERENCIA', 40000, '2026-11-20', 'nequi', 'quincena')],
      [],
    );
    expect(resumen.transferidoEntrada).toBe(40000);
    expect(resumen.disponible).toBe(40000);
  });

  test('gastar desde otra cuenta o a crédito no toca la quincena', () => {
    const resumen = calcularResumenQuincena(
      bolsa,
      noviembre,
      [
        mov('INGRESO', 100000, '2026-11-15'),
        mov('GASTO', 30000, '2026-11-16', 'nequi'),
        mov('PAGO_DEUDA', 20000, '2026-11-17', 'ahorros'),
        mov('COMPRA_CREDITO', 90000, '2026-11-18', null),
      ],
      [],
    );
    expect(resumen.gastos).toBe(0);
    expect(resumen.pagosDeuda).toBe(0);
    expect(resumen.disponible).toBe(100000);
  });

  test('cuenta pendientes vencidos de quincenas anteriores', () => {
    const resumen = calcularResumenQuincena(
      bolsa,
      noviembre,
      [mov('INGRESO', 100000, '2026-11-15')],
      [mov('PAGO_DEUDA', 30000, '2026-11-05')],
    );
    expect(resumen.pendientes).toBe(30000);
    expect(resumen.teQuedaria).toBe(70000);
  });

  test('ignora pendientes que no sacan plata de la bolsa', () => {
    const resumen = calcularResumenQuincena(
      bolsa,
      noviembre,
      [mov('INGRESO', 100000, '2026-11-15')],
      [
        mov('INGRESO', 3000000, '2026-11-29'),
        mov('GASTO', 10000, '2026-11-20', 'nequi'),
        mov('COMPRA_CREDITO', 20000, '2026-11-20', null),
        mov('TRANSFERENCIA', 5000, '2026-11-20', 'nequi', 'quincena'),
      ],
    );
    expect(resumen.pendientes).toBe(0);
    expect(resumen.teQuedaria).toBe(100000);
  });

  test('te quedaría puede ser negativo', () => {
    const resumen = calcularResumenQuincena(
      bolsa,
      noviembre,
      [mov('INGRESO', 100000, '2026-11-15')],
      [mov('PAGO_DEUDA', 150000, '2026-11-23')],
    );
    expect(resumen.teQuedaria).toBe(-50000);
  });

  test('incluye el saldo inicial de la bolsa en el saldo anterior', () => {
    const conSaldo = { ...bolsa, saldoInicial: crearDinero(75000) };
    const resumen = calcularResumenQuincena(conSaldo, noviembre, [], []);
    expect(resumen.saldoAnterior).toBe(75000);
    expect(resumen.disponible).toBe(75000);
  });
});

describe('calcularCorte', () => {
  test('el sobrante cuadra con la suma de sus partes', () => {
    const c = calcularCorte(bolsa, noviembre, movimientosPrototipo);
    expect(
      c.saldoAnterior +
        c.ingresos -
        c.descuentos -
        c.gastos -
        c.pagosDeuda +
        c.transferidoEntrada -
        c.transferidoSalida,
    ).toBe(c.sobrante);
  });

  test('ignora movimientos posteriores al cierre', () => {
    const corte = calcularCorte(bolsa, noviembre, [
      mov('INGRESO', 100000, '2026-11-29'),
      mov('GASTO', 40000, '2026-11-30'),
    ]);
    expect(corte.gastos).toBe(0);
    expect(corte.sobrante).toBe(100000);
  });

  test('el sobrante pasa a la siguiente quincena', () => {
    const { cerrado, siguiente } = cerrarPeriodo(noviembre, f('2026-11-30'));
    const movimientos = [...movimientosPrototipo, mov('INGRESO', 3000000, '2026-11-30')];
    const corte = calcularCorte(bolsa, cerrado, movimientos);
    const nueva = calcularCorte(bolsa, siguiente, movimientos);
    expect(corte.sobrante).toBe(1840500);
    expect(nueva.saldoAnterior).toBe(1840500);
    expect(nueva.sobrante).toBe(4840500);
  });

  test('un sobrante negativo también pasa a la siguiente quincena', () => {
    const { cerrado, siguiente } = cerrarPeriodo(noviembre, f('2026-11-30'));
    const movimientos = [
      mov('INGRESO', 100000, '2026-11-15'),
      mov('GASTO', 130000, '2026-11-20'),
      mov('INGRESO', 500000, '2026-11-30'),
    ];
    expect(calcularCorte(bolsa, cerrado, movimientos).sobrante).toBe(-30000);
    const nueva = calcularCorte(bolsa, siguiente, movimientos);
    expect(nueva.saldoAnterior).toBe(-30000);
    expect(nueva.sobrante).toBe(470000);
  });

  test('con pago adelantado, el día del pago ya es de la quincena nueva', () => {
    const { cerrado, siguiente } = cerrarPeriodo(noviembre, f('2026-11-29'));
    const movimientos = [
      mov('INGRESO', 100000, '2026-11-15'),
      mov('INGRESO', 500000, '2026-11-29'),
      mov('GASTO', 20000, '2026-11-29'),
    ];
    expect(calcularCorte(bolsa, cerrado, movimientos).sobrante).toBe(100000);
    expect(calcularCorte(bolsa, siguiente, movimientos)).toMatchObject({
      saldoAnterior: 100000,
      ingresos: 500000,
      gastos: 20000,
      sobrante: 580000,
    });
  });

  test('corregir un movimiento antiguo se refleja en las quincenas siguientes', () => {
    const { cerrado, siguiente } = cerrarPeriodo(noviembre, f('2026-11-30'));
    const original = [mov('INGRESO', 100000, '2026-11-15'), mov('GASTO', 10000, '2026-11-20')];
    const corregido = [mov('INGRESO', 100000, '2026-11-15'), mov('GASTO', 25000, '2026-11-20')];
    expect(calcularCorte(bolsa, cerrado, original).sobrante).toBe(90000);
    expect(calcularCorte(bolsa, cerrado, corregido).sobrante).toBe(75000);
    expect(calcularCorte(bolsa, siguiente, corregido).saldoAnterior).toBe(75000);
  });
});
