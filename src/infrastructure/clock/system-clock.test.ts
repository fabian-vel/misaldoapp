import { crearSystemClock } from './system-clock';

const reloj = (iso: string) => crearSystemClock(() => Date.parse(iso));

describe('SystemClock', () => {
  test.each([
    ['2026-11-22T17:00:00.000Z', '2026-11-22'],
    ['2026-11-23T04:59:59.000Z', '2026-11-22'],
    ['2026-11-23T05:00:00.000Z', '2026-11-23'],
    ['2027-01-01T04:59:59.000Z', '2026-12-31'],
    ['2028-03-01T04:00:00.000Z', '2028-02-29'],
  ])('a las %s en Bogotá es %s', (instante, esperado) => {
    expect(reloj(instante).hoy()).toBe(esperado);
  });

  test('ahora devuelve el instante en UTC', () => {
    expect(reloj('2026-11-22T17:00:00.000Z').ahora()).toBe('2026-11-22T17:00:00.000Z');
  });
});
