import { ErrorDominio } from '../errors/error-dominio';
import {
  crearDinero,
  crearMonto,
  formatearDinero,
  formatearGasto,
  formatearIngreso,
  restarDinero,
  sumarDinero,
} from './dinero';

const codigoDe = (accion: () => unknown) => {
  try {
    accion();
  } catch (error) {
    return error instanceof ErrorDominio ? error.codigo : 'OTRO_ERROR';
  }
  return 'SIN_ERROR';
};

describe('crearDinero', () => {
  test.each([0, 1, -1, 1840500, Number.MAX_SAFE_INTEGER])('acepta el entero %d', (valor) => {
    expect(crearDinero(valor)).toBe(valor);
  });

  test('convierte -0 en 0', () => {
    expect(Object.is(crearDinero(-0), 0)).toBe(true);
  });

  test.each([1.5, 0.1 + 0.2, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza %d',
    (valor) => {
      expect(codigoDe(() => crearDinero(valor))).toBe('MONTO_INVALIDO');
    },
  );
});

describe('crearMonto', () => {
  test('acepta montos positivos', () => {
    expect(crearMonto(86400)).toBe(86400);
  });

  test.each([0, -0, -1, 1.5])('rechaza %d', (valor) => {
    expect(codigoDe(() => crearMonto(valor))).toBe('MONTO_INVALIDO');
  });
});

describe('operaciones', () => {
  test('suma y resta en enteros exactos', () => {
    expect(sumarDinero(crearDinero(3200000), crearDinero(120000))).toBe(3320000);
    expect(restarDinero(crearDinero(100), crearDinero(250))).toBe(-150);
  });

  test('rechaza un resultado que pierde precisión', () => {
    const maximo = crearDinero(Number.MAX_SAFE_INTEGER);
    expect(codigoDe(() => sumarDinero(maximo, crearDinero(1)))).toBe('MONTO_INVALIDO');
  });
});

describe('formato', () => {
  test.each([
    [0, '$ 0'],
    [999, '$ 999'],
    [1000, '$ 1.000'],
    [86400, '$ 86.400'],
    [1840500, '$ 1.840.500'],
    [1234567890, '$ 1.234.567.890'],
    [-553900, '− $ 553.900'],
  ])('formatea %d como %s', (valor, esperado) => {
    expect(formatearDinero(crearDinero(valor))).toBe(esperado);
  });

  test('aplica el signo de ingreso y gasto', () => {
    expect(formatearIngreso(crearMonto(3200000))).toBe('+ $ 3.200.000');
    expect(formatearGasto(crearMonto(86400))).toBe('− $ 86.400');
  });
});
