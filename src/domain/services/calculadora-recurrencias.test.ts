import { ErrorDominio } from '../errors/error-dominio';
import { crearFecha, sumarDias } from '../value-objects/fecha';
import { siguientePagoProgramado } from '../value-objects/periodo';
import { fechasEnVentana, type DiaMes, type ReglaFechas } from './calculadora-recurrencias';

const f = crearFecha;
const INICIO = f('2026-01-01');

const ventana = (regla: ReglaFechas, desde: string, hasta: string) =>
  fechasEnVentana(regla, f(desde), f(hasta));

const mensual = (dia: DiaMes, fechaInicio = INICIO): ReglaFechas => ({
  frecuencia: 'MENSUAL',
  dia,
  fechaInicio,
});

const codigoDe = (accion: () => unknown) => {
  try {
    accion();
  } catch (error) {
    return error instanceof ErrorDominio ? error.codigo : 'OTRO_ERROR';
  }
  return 'SIN_ERROR';
};

describe('MENSUAL', () => {
  test('repite el mismo día cada mes', () => {
    expect(ventana(mensual(5), '2026-11-01', '2027-01-31')).toEqual([
      '2026-11-05',
      '2026-12-05',
      '2027-01-05',
    ]);
  });

  test('el día 31 usa el último día en meses cortos y no se desplaza', () => {
    expect(ventana(mensual(31), '2026-01-01', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  test('el día 30 usa el 28 o 29 en febrero', () => {
    expect(ventana(mensual(30), '2026-02-01', '2026-03-31')).toEqual(['2026-02-28', '2026-03-30']);
    expect(ventana(mensual(30), '2028-02-01', '2028-03-31')).toEqual(['2028-02-29', '2028-03-30']);
  });

  test('ULTIMO respeta 28, 29, 30 y 31', () => {
    expect(ventana(mensual('ULTIMO'), '2028-01-01', '2028-04-30')).toEqual([
      '2028-01-31',
      '2028-02-29',
      '2028-03-31',
      '2028-04-30',
    ]);
    expect(ventana(mensual('ULTIMO'), '2026-02-01', '2026-02-28')).toEqual(['2026-02-28']);
  });

  test('cruza el cambio de año', () => {
    expect(ventana(mensual('ULTIMO'), '2026-12-01', '2027-01-31')).toEqual([
      '2026-12-31',
      '2027-01-31',
    ]);
  });
});

describe('QUINCENAL_DIAS', () => {
  const regla: ReglaFechas = {
    frecuencia: 'QUINCENAL_DIAS',
    dias: [15, 'ULTIMO'],
    fechaInicio: INICIO,
  };

  test('genera 15 y último día en orden', () => {
    expect(ventana(regla, '2026-11-01', '2027-02-28')).toEqual([
      '2026-11-15',
      '2026-11-30',
      '2026-12-15',
      '2026-12-31',
      '2027-01-15',
      '2027-01-31',
      '2027-02-15',
      '2027-02-28',
    ]);
  });

  test('ordena aunque los días vengan invertidos', () => {
    const invertida: ReglaFechas = { ...regla, dias: ['ULTIMO', 15] };
    expect(ventana(invertida, '2026-11-01', '2026-11-30')).toEqual(['2026-11-15', '2026-11-30']);
  });

  test('no repite cuando dos días caen en la misma fecha', () => {
    const coincide: ReglaFechas = { ...regla, dias: [30, 'ULTIMO'] };
    expect(ventana(coincide, '2026-11-01', '2026-11-30')).toEqual(['2026-11-30']);
    expect(ventana(coincide, '2026-02-01', '2026-02-28')).toEqual(['2026-02-28']);
  });

  test('coincide con las fechas de pago de la quincena durante dos años', () => {
    const fechas = ventana(regla, '2027-01-01', '2028-12-31');
    expect(fechas).toHaveLength(48);
    fechas.slice(0, -1).forEach((fecha, i) => {
      expect(siguientePagoProgramado(fecha)).toBe(fechas[i + 1]);
    });
  });
});

describe('CADA_N_DIAS', () => {
  const regla: ReglaFechas = {
    frecuencia: 'CADA_N_DIAS',
    intervaloDias: 14,
    fechaInicio: f('2026-11-01'),
  };

  test('cuenta desde la fecha de inicio', () => {
    expect(ventana(regla, '2026-11-01', '2026-12-01')).toEqual([
      '2026-11-01',
      '2026-11-15',
      '2026-11-29',
    ]);
  });

  test('mantiene el ritmo aunque la ventana empiece después', () => {
    expect(ventana(regla, '2026-11-20', '2026-12-20')).toEqual(['2026-11-29', '2026-12-13']);
  });

  test('una ventana justo sobre una repetición la incluye', () => {
    expect(ventana(regla, '2026-11-15', '2026-11-15')).toEqual(['2026-11-15']);
  });

  test('cruza febrero bisiesto y el cambio de año', () => {
    const cada30: ReglaFechas = { ...regla, intervaloDias: 30, fechaInicio: f('2027-12-31') };
    expect(ventana(cada30, '2027-12-31', '2028-03-01')).toEqual([
      '2027-12-31',
      '2028-01-30',
      '2028-02-29',
    ]);
  });

  test('intervalo de 1 genera todos los días', () => {
    const diaria: ReglaFechas = { ...regla, intervaloDias: 1 };
    expect(ventana(diaria, '2026-11-01', '2026-11-03')).toHaveLength(3);
  });
});

describe('SEMANAL', () => {
  const regla: ReglaFechas = { frecuencia: 'SEMANAL', fechaInicio: f('2026-11-22') };

  test('repite cada 7 días desde el inicio', () => {
    expect(ventana(regla, '2026-11-23', '2026-12-13')).toEqual([
      '2026-11-29',
      '2026-12-06',
      '2026-12-13',
    ]);
  });

  test('cruza el cambio de año', () => {
    expect(ventana(regla, '2026-12-25', '2027-01-05')).toEqual(['2026-12-27', '2027-01-03']);
  });
});

describe('ANUAL', () => {
  test('repite la misma fecha cada año', () => {
    const regla: ReglaFechas = { frecuencia: 'ANUAL', fechaInicio: f('2026-06-30') };
    expect(ventana(regla, '2026-01-01', '2028-12-31')).toEqual([
      '2026-06-30',
      '2027-06-30',
      '2028-06-30',
    ]);
  });

  test('el 29 de febrero usa el 28 sin perder el 29 en el siguiente bisiesto', () => {
    const regla: ReglaFechas = { frecuencia: 'ANUAL', fechaInicio: f('2028-02-29') };
    expect(ventana(regla, '2028-01-01', '2032-12-31')).toEqual([
      '2028-02-29',
      '2029-02-28',
      '2030-02-28',
      '2031-02-28',
      '2032-02-29',
    ]);
  });
});

describe('vigencia y ventana', () => {
  test('no genera antes de la fecha de inicio', () => {
    expect(ventana(mensual(5, f('2026-12-10')), '2026-11-01', '2027-01-31')).toEqual([
      '2027-01-05',
    ]);
  });

  test('no genera después de la fecha final', () => {
    const regla: ReglaFechas = { ...mensual(5), fechaFin: f('2026-12-05') };
    expect(ventana(regla, '2026-11-01', '2027-02-28')).toEqual(['2026-11-05', '2026-12-05']);
  });

  test.each([
    ['ventana invertida', '2026-12-01', '2026-11-01'],
    ['ventana anterior al inicio', '2025-01-01', '2025-12-31'],
  ])('devuelve vacío con %s', (_, desde, hasta) => {
    expect(ventana(mensual(5), desde, hasta)).toEqual([]);
  });

  test('es idempotente', () => {
    const regla = mensual('ULTIMO');
    expect(ventana(regla, '2026-11-01', '2027-01-01')).toEqual(
      ventana(regla, '2026-11-01', '2027-01-01'),
    );
  });

  test('ventanas móviles solapadas producen las mismas fechas', () => {
    const regla = mensual(15);
    const hoy = f('2026-11-22');
    const primera = fechasEnVentana(regla, hoy, sumarDias(hoy, 60));
    const manana = sumarDias(hoy, 1);
    const segunda = fechasEnVentana(regla, manana, sumarDias(manana, 60));
    expect(segunda.filter((fecha) => primera.includes(fecha))).toEqual(primera);
  });
});

describe('reglas inválidas', () => {
  test.each([0, 32, -1, 1.5, NaN])('rechaza el día %d', (dia) => {
    expect(codigoDe(() => ventana(mensual(dia), '2026-01-01', '2026-02-01'))).toBe(
      'REGLA_INVALIDA',
    );
  });

  test.each([0, -7, 1.5, NaN, Infinity])('rechaza el intervalo %d', (intervaloDias) => {
    const regla: ReglaFechas = { frecuencia: 'CADA_N_DIAS', intervaloDias, fechaInicio: INICIO };
    expect(codigoDe(() => ventana(regla, '2026-01-01', '2026-02-01'))).toBe('REGLA_INVALIDA');
  });

  test('rechaza dos días iguales en quincenal', () => {
    const regla: ReglaFechas = {
      frecuencia: 'QUINCENAL_DIAS',
      dias: [15, 15],
      fechaInicio: INICIO,
    };
    expect(codigoDe(() => ventana(regla, '2026-01-01', '2026-02-01'))).toBe('REGLA_INVALIDA');
  });

  test('rechaza fecha final anterior a la inicial', () => {
    const regla: ReglaFechas = { ...mensual(5), fechaFin: f('2025-12-31') };
    expect(codigoDe(() => ventana(regla, '2026-01-01', '2026-02-01'))).toBe('REGLA_INVALIDA');
  });
});
