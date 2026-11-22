import { ErrorDominio } from '../errors/error-dominio';
import { crearFecha, descomponerFecha, sumarDias, ultimoDiaDelMes, type Fecha } from './fecha';

export type Periodo = {
  readonly inicio: Fecha;
  readonly fin: Fecha;
  /** Fecha programada del pago que abrió esta quincena. */
  readonly pagoProgramado: Fecha;
  /** Fecha programada del pago que abrirá la siguiente. */
  readonly proximoPago: Fecha;
};

// shortcut: días de pago fijos (15 y último), parametrizar si la app se abre a otros usuarios.
const DIA_QUINCENA = 15;

const dia15 = (fecha: Fecha): Fecha =>
  crearFecha(`${fecha.slice(0, 8)}${String(DIA_QUINCENA).padStart(2, '0')}`);

function pagoProgramadoEnOAntes(fecha: Fecha): Fecha {
  const { dia } = descomponerFecha(fecha);
  if (fecha === ultimoDiaDelMes(fecha)) return fecha;
  return dia >= DIA_QUINCENA ? dia15(fecha) : sumarDias(fecha, -dia);
}

export function siguientePagoProgramado(fecha: Fecha): Fecha {
  const ultimo = ultimoDiaDelMes(fecha);
  if (descomponerFecha(fecha).dia < DIA_QUINCENA) return dia15(fecha);
  return fecha < ultimo ? ultimo : sumarDias(ultimo, DIA_QUINCENA);
}

/** Quincena teórica que contiene `fecha`, antes de conocer las fechas reales de pago. */
export function periodoProgramado(fecha: Fecha): Periodo {
  const pagoProgramado = pagoProgramadoEnOAntes(fecha);
  const proximoPago = siguientePagoProgramado(pagoProgramado);
  return { inicio: pagoProgramado, fin: sumarDias(proximoPago, -1), pagoProgramado, proximoPago };
}

/**
 * Abre la quincena en la fecha real del pago: desde un día antes de lo programado
 * hasta dos días antes del próximo pago, para que dos quincenas nunca empiecen el mismo día.
 */
export function abrirPeriodo(pagoProgramado: Fecha, fechaReal: Fecha): Periodo {
  if (pagoProgramado !== pagoProgramadoEnOAntes(pagoProgramado)) {
    throw new ErrorDominio('PERIODO_INVALIDO', `${pagoProgramado} no es una fecha de pago`);
  }
  const proximoPago = siguientePagoProgramado(pagoProgramado);
  if (fechaReal < sumarDias(pagoProgramado, -1) || fechaReal > sumarDias(proximoPago, -2)) {
    throw new ErrorDominio(
      'PERIODO_INVALIDO',
      `El pago del ${pagoProgramado} no puede registrarse el ${fechaReal}`,
    );
  }
  return { inicio: fechaReal, fin: sumarDias(proximoPago, -1), pagoProgramado, proximoPago };
}

/** Cierra la quincena el día anterior al pago real siguiente y abre la nueva. */
export function cerrarPeriodo(
  actual: Periodo,
  fechaRealSiguiente: Fecha,
): { cerrado: Periodo; siguiente: Periodo } {
  const siguiente = abrirPeriodo(actual.proximoPago, fechaRealSiguiente);
  return { cerrado: { ...actual, fin: sumarDias(siguiente.inicio, -1) }, siguiente };
}
