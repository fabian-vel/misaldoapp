import type { Cuenta } from '../../../domain/entities/cuenta';
import type { Movimiento } from '../../../domain/entities/movimiento';
import type { Ocurrencia } from '../../../domain/entities/ocurrencia';
import type { ReglaRecurrencia } from '../../../domain/entities/regla-recurrencia';
import type { RegistroCorte } from '../../../domain/entities/registro-corte';
import { ErrorDominio } from '../../../domain/errors/error-dominio';
import type { DiaMes, ReglaFechas } from '../../../domain/services/calculadora-recurrencias';
import { crearDinero, crearMonto } from '../../../domain/value-objects/dinero';
import { crearFecha } from '../../../domain/value-objects/fecha';
import type { corteQuincena, cuenta, movimiento, ocurrencia, reglaRecurrencia } from '../schema';

type FilaRegla = typeof reglaRecurrencia.$inferSelect;

export const aCuenta = (fila: typeof cuenta.$inferSelect): Cuenta => ({
  ...fila,
  saldoInicial: crearDinero(fila.saldoInicial),
});

export const aMovimiento = (fila: typeof movimiento.$inferSelect): Movimiento => ({
  ...fila,
  monto: crearMonto(fila.monto),
  fecha: crearFecha(fila.fecha),
});

export const aOcurrencia = (fila: typeof ocurrencia.$inferSelect): Ocurrencia => ({
  ...fila,
  monto: crearMonto(fila.monto),
  fecha: crearFecha(fila.fecha),
});

export const aCorte = (fila: typeof corteQuincena.$inferSelect): RegistroCorte => ({
  ...fila,
  fechaInicio: crearFecha(fila.fechaInicio),
  fechaFin: crearFecha(fila.fechaFin),
  pagoProgramado: crearFecha(fila.pagoProgramado),
});

const reglaDanada = (id: string) =>
  new ErrorDominio('REGLA_INVALIDA', `La regla ${id} tiene datos de frecuencia inválidos`);

function leerDias(fila: FilaRegla, cantidad: number): DiaMes[] {
  let dias: unknown;
  try {
    dias = JSON.parse(fila.diasMes ?? '');
  } catch {
    throw reglaDanada(fila.id);
  }
  const validos =
    Array.isArray(dias) &&
    dias.length === cantidad &&
    dias.every((dia) => dia === 'ULTIMO' || typeof dia === 'number');
  if (!validos) throw reglaDanada(fila.id);
  return dias as DiaMes[];
}

function aFechas(fila: FilaRegla): ReglaFechas {
  const vigencia = {
    fechaInicio: crearFecha(fila.fechaInicio),
    fechaFin: fila.fechaFin ? crearFecha(fila.fechaFin) : null,
  };
  switch (fila.frecuencia) {
    case 'MENSUAL':
      return { ...vigencia, frecuencia: 'MENSUAL', dia: leerDias(fila, 1)[0] };
    case 'QUINCENAL_DIAS': {
      const [a, b] = leerDias(fila, 2);
      return { ...vigencia, frecuencia: 'QUINCENAL_DIAS', dias: [a, b] };
    }
    case 'CADA_N_DIAS':
      if (fila.intervaloDias === null) throw reglaDanada(fila.id);
      return { ...vigencia, frecuencia: 'CADA_N_DIAS', intervaloDias: fila.intervaloDias };
    case 'SEMANAL':
      return { ...vigencia, frecuencia: 'SEMANAL' };
    case 'ANUAL':
      return { ...vigencia, frecuencia: 'ANUAL' };
  }
}

export function aRegla(fila: FilaRegla): ReglaRecurrencia {
  const { frecuencia, diasMes, intervaloDias, fechaInicio, fechaFin, monto, ...resto } = fila;
  return { ...resto, monto: crearMonto(monto), fechas: aFechas(fila) };
}

export function aFilaRegla(regla: ReglaRecurrencia): FilaRegla {
  const { fechas, ...resto } = regla;
  const diasMes =
    fechas.frecuencia === 'MENSUAL'
      ? JSON.stringify([fechas.dia])
      : fechas.frecuencia === 'QUINCENAL_DIAS'
        ? JSON.stringify(fechas.dias)
        : null;
  return {
    ...resto,
    frecuencia: fechas.frecuencia,
    diasMes,
    intervaloDias: fechas.frecuencia === 'CADA_N_DIAS' ? fechas.intervaloDias : null,
    fechaInicio: fechas.fechaInicio,
    fechaFin: fechas.fechaFin ?? null,
  };
}
