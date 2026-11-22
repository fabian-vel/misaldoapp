import { ErrorDominio } from '../errors/error-dominio';

/** Fecha contable `YYYY-MM-DD`. Al ser ISO, se puede comparar con `<`, `>` e `===`. */
export type Fecha = string & { readonly __marca: 'Fecha' };

const MS_POR_DIA = 86_400_000;
const ANIO_MINIMO = 1900;

const invalida = (valor: string) =>
  new ErrorDominio('FECHA_INVALIDA', `La fecha ${valor} no es válida`);

const esBisiesto = (anio: number): boolean =>
  (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

export function diasDelMes(anio: number, mes: number): number {
  if (mes === 2) return esBisiesto(anio) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

export function crearFecha(valor: string): Fecha {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) throw invalida(valor);
  const [anio, mes, dia] = partes.slice(1).map(Number);
  if (anio < ANIO_MINIMO || mes < 1 || mes > 12 || dia < 1 || dia > diasDelMes(anio, mes)) {
    throw invalida(valor);
  }
  return valor as Fecha;
}

export function descomponerFecha(fecha: Fecha): { anio: number; mes: number; dia: number } {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return { anio, mes, dia };
}

const aUtc = (fecha: Fecha): number => {
  const { anio, mes, dia } = descomponerFecha(fecha);
  return Date.UTC(anio, mes - 1, dia);
};

export function sumarDias(fecha: Fecha, dias: number): Fecha {
  if (!Number.isSafeInteger(dias)) throw invalida(`${fecha} + ${dias} días`);
  const resultado = new Date(aUtc(fecha) + dias * MS_POR_DIA);
  if (Number.isNaN(resultado.getTime())) throw invalida(`${fecha} + ${dias} días`);
  return crearFecha(resultado.toISOString().slice(0, 10));
}

/** Días desde `desde` hasta `hasta`; negativo si `hasta` es anterior. */
export const diferenciaDias = (desde: Fecha, hasta: Fecha): number =>
  (aUtc(hasta) - aUtc(desde)) / MS_POR_DIA;

export function ultimoDiaDelMes(fecha: Fecha): Fecha {
  const { anio, mes } = descomponerFecha(fecha);
  return `${fecha.slice(0, 8)}${diasDelMes(anio, mes)}` as Fecha;
}
