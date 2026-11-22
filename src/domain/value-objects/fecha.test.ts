import { ErrorDominio } from '../errors/error-dominio';
import {
  crearFecha,
  descomponerFecha,
  diasDelMes,
  diferenciaDias,
  sumarDias,
  ultimoDiaDelMes,
} from './fecha';

const codigoDe = (accion: () => unknown) => {
  try {
    accion();
  } catch (error) {
    return error instanceof ErrorDominio ? error.codigo : 'OTRO_ERROR';
  }
  return 'SIN_ERROR';
};

describe('crearFecha', () => {
  test.each(['2026-11-22', '2028-02-29', '2000-02-29', '2026-12-31', '2026-04-30'])(
    'acepta %s',
    (valor) => {
      expect(crearFecha(valor)).toBe(valor);
    },
  );

  test.each([
    '',
    'hoy',
    '2026-1-05',
    '22-11-2026',
    '2026-11-22T00:00:00Z',
    '2026-00-10',
    '2026-13-01',
    '2026-11-00',
    '2026-04-31',
    '2026-02-29',
    '1900-02-29',
    '1899-12-31',
  ])('rechaza "%s"', (valor) => {
    expect(codigoDe(() => crearFecha(valor))).toBe('FECHA_INVALIDA');
  });
});

describe('diasDelMes', () => {
  test.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2028, 2, 29],
    [2100, 2, 28],
    [2000, 2, 29],
    [2026, 4, 30],
    [2026, 12, 31],
  ])('%d-%d tiene %d días', (anio, mes, dias) => {
    expect(diasDelMes(anio, mes)).toBe(dias);
  });
});

test('descompone una fecha en números', () => {
  expect(descomponerFecha(crearFecha('2026-03-09'))).toEqual({ anio: 2026, mes: 3, dia: 9 });
});

describe('sumarDias', () => {
  test.each([
    ['2026-11-22', 8, '2026-11-30'],
    ['2026-11-30', 1, '2026-12-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2026-02-28', 1, '2026-03-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2028-03-01', -1, '2028-02-29'],
    ['2026-11-22', 0, '2026-11-22'],
  ])('%s + %d = %s', (inicio, dias, esperado) => {
    expect(sumarDias(crearFecha(inicio), dias)).toBe(esperado);
  });

  test.each([1.5, NaN, Infinity, 1e15])('rechaza sumar %d días', (dias) => {
    expect(codigoDe(() => sumarDias(crearFecha('2026-11-22'), dias))).toBe('FECHA_INVALIDA');
  });
});

describe('diferenciaDias', () => {
  test.each([
    ['2026-11-22', '2026-11-30', 8],
    ['2026-11-30', '2026-11-22', -8],
    ['2026-12-31', '2027-01-01', 1],
    ['2028-02-28', '2028-03-01', 2],
    ['2026-11-22', '2026-11-22', 0],
  ])('de %s a %s hay %d días', (desde, hasta, dias) => {
    expect(diferenciaDias(crearFecha(desde), crearFecha(hasta))).toBe(dias);
  });
});

describe('ultimoDiaDelMes', () => {
  test.each([
    ['2026-11-15', '2026-11-30'],
    ['2026-12-01', '2026-12-31'],
    ['2026-02-10', '2026-02-28'],
    ['2028-02-10', '2028-02-29'],
  ])('de %s es %s', (fecha, esperado) => {
    expect(ultimoDiaDelMes(crearFecha(fecha))).toBe(esperado);
  });
});

test('las fechas ISO se comparan en orden cronológico', () => {
  expect(crearFecha('2026-12-31') < crearFecha('2027-01-01')).toBe(true);
});
