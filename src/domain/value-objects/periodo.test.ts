import { ErrorDominio } from '../errors/error-dominio';
import { crearFecha, diferenciaDias, sumarDias, type Fecha } from './fecha';
import {
  abrirPeriodo,
  cerrarPeriodo,
  periodoProgramado,
  siguientePagoProgramado,
  type Periodo,
} from './periodo';

const f = crearFecha;

const codigoDe = (accion: () => unknown) => {
  try {
    accion();
  } catch (error) {
    return error instanceof ErrorDominio ? error.codigo : 'OTRO_ERROR';
  }
  return 'SIN_ERROR';
};

describe('siguientePagoProgramado', () => {
  test.each([
    ['2026-11-01', '2026-11-15'],
    ['2026-11-14', '2026-11-15'],
    ['2026-11-15', '2026-11-30'],
    ['2026-11-22', '2026-11-30'],
    ['2026-11-30', '2026-12-15'],
    ['2026-12-31', '2027-01-15'],
    ['2026-02-15', '2026-02-28'],
    ['2026-02-28', '2026-03-15'],
    ['2028-02-28', '2028-02-29'],
    ['2028-02-29', '2028-03-15'],
  ])('después de %s es %s', (fecha, esperado) => {
    expect(siguientePagoProgramado(f(fecha))).toBe(esperado);
  });
});

describe('periodoProgramado', () => {
  test.each([
    ['2026-11-22', '2026-11-15', '2026-11-29', '2026-11-30'],
    ['2026-11-15', '2026-11-15', '2026-11-29', '2026-11-30'],
    ['2026-11-29', '2026-11-15', '2026-11-29', '2026-11-30'],
    ['2026-11-30', '2026-11-30', '2026-12-14', '2026-12-15'],
    ['2026-12-14', '2026-11-30', '2026-12-14', '2026-12-15'],
    ['2026-12-31', '2026-12-31', '2027-01-14', '2027-01-15'],
    ['2027-01-01', '2026-12-31', '2027-01-14', '2027-01-15'],
    ['2026-02-27', '2026-02-15', '2026-02-27', '2026-02-28'],
    ['2026-02-28', '2026-02-28', '2026-03-14', '2026-03-15'],
    ['2028-02-28', '2028-02-15', '2028-02-28', '2028-02-29'],
    ['2028-02-29', '2028-02-29', '2028-03-14', '2028-03-15'],
    ['2026-05-10', '2026-04-30', '2026-05-14', '2026-05-15'],
  ])('%s pertenece a %s – %s (próximo %s)', (fecha, inicio, fin, proximoPago) => {
    expect(periodoProgramado(f(fecha))).toEqual({
      inicio,
      fin,
      pagoProgramado: inicio,
      proximoPago,
    });
  });

  test('cubre dos años seguidos sin huecos ni días repetidos', () => {
    let fecha = f('2027-01-01');
    let actual = periodoProgramado(fecha);
    while (fecha < '2029-01-01') {
      const p = periodoProgramado(fecha);
      expect(p.inicio <= fecha && fecha <= p.fin).toBe(true);
      if (p.inicio !== actual.inicio) {
        expect(p.inicio).toBe(sumarDias(actual.fin, 1));
        actual = p;
      }
      fecha = sumarDias(fecha, 1);
    }
  });
});

describe('abrirPeriodo', () => {
  test('el pago puntual abre la quincena en la fecha programada', () => {
    expect(abrirPeriodo(f('2026-11-15'), f('2026-11-15'))).toEqual({
      inicio: '2026-11-15',
      fin: '2026-11-29',
      pagoProgramado: '2026-11-15',
      proximoPago: '2026-11-30',
    });
  });

  test.each([
    ['2026-11-15', '2026-11-14'],
    ['2026-11-30', '2026-11-29'],
    ['2026-12-31', '2026-12-30'],
    ['2027-01-15', '2027-01-14'],
    ['2026-02-28', '2026-02-27'],
    ['2028-02-29', '2028-02-28'],
  ])('el pago del %s puede llegar adelantado el %s', (programado, real) => {
    expect(abrirPeriodo(f(programado), f(real)).inicio).toBe(real);
  });

  test('un pago con retraso abre la quincena en su fecha real', () => {
    const periodo = abrirPeriodo(f('2026-11-15'), f('2026-11-18'));
    expect(periodo.inicio).toBe('2026-11-18');
    expect(periodo.fin).toBe('2026-11-29');
  });

  test.each([
    ['2026-11-15', '2026-11-13'],
    ['2026-11-15', '2026-11-29'],
    ['2026-11-15', '2026-11-30'],
    ['2026-11-30', '2026-12-14'],
  ])('rechaza el pago del %s registrado el %s', (programado, real) => {
    expect(codigoDe(() => abrirPeriodo(f(programado), f(real)))).toBe('PERIODO_INVALIDO');
  });

  test.each(['2026-11-14', '2026-11-29', '2026-02-27', '2028-02-28'])(
    'rechaza %s porque no es día de pago',
    (programado) => {
      expect(codigoDe(() => abrirPeriodo(f(programado), f(programado)))).toBe('PERIODO_INVALIDO');
    },
  );
});

describe('cerrarPeriodo', () => {
  const actual = abrirPeriodo(f('2026-11-15'), f('2026-11-15'));

  test('con pago puntual cierra el día anterior', () => {
    const { cerrado, siguiente } = cerrarPeriodo(actual, f('2026-11-30'));
    expect(cerrado.fin).toBe('2026-11-29');
    expect(siguiente.inicio).toBe('2026-11-30');
    expect(siguiente.pagoProgramado).toBe('2026-11-30');
  });

  test('con pago adelantado la quincena se acorta un día', () => {
    const { cerrado, siguiente } = cerrarPeriodo(actual, f('2026-11-29'));
    expect(cerrado.fin).toBe('2026-11-28');
    expect(siguiente.inicio).toBe('2026-11-29');
    expect(siguiente.fin).toBe('2026-12-14');
  });

  test('con pago retrasado la quincena se alarga', () => {
    const { cerrado, siguiente } = cerrarPeriodo(actual, f('2026-12-02'));
    expect(cerrado.fin).toBe('2026-12-01');
    expect(siguiente.inicio).toBe('2026-12-02');
  });

  test('funciona en el cambio de año con pago adelantado', () => {
    const diciembre = abrirPeriodo(f('2026-12-31'), f('2026-12-30'));
    const { cerrado, siguiente } = cerrarPeriodo(diciembre, f('2027-01-14'));
    expect(cerrado).toMatchObject({ inicio: '2026-12-30', fin: '2027-01-13' });
    expect(siguiente.inicio).toBe('2027-01-14');
  });

  test('rechaza un pago siguiente demasiado temprano', () => {
    expect(codigoDe(() => cerrarPeriodo(actual, f('2026-11-28')))).toBe('PERIODO_INVALIDO');
  });

  test('una quincena abierta con retraso máximo no queda vacía', () => {
    const tardia = abrirPeriodo(f('2026-11-15'), f('2026-11-28'));
    const { cerrado } = cerrarPeriodo(tardia, f('2026-11-29'));
    expect(diferenciaDias(cerrado.inicio, cerrado.fin)).toBe(0);
  });

  test('encadena un año de pagos adelantados sin huecos', () => {
    let periodo: Periodo = abrirPeriodo(f('2027-12-31'), f('2027-12-30'));
    for (let i = 0; i < 24; i++) {
      const real: Fecha = sumarDias(periodo.proximoPago, -1);
      const { cerrado, siguiente } = cerrarPeriodo(periodo, real);
      expect(sumarDias(cerrado.fin, 1)).toBe(siguiente.inicio);
      expect(cerrado.inicio <= cerrado.fin).toBe(true);
      periodo = siguiente;
    }
    expect(periodo.pagoProgramado).toBe('2028-12-31');
  });
});
