import { ErrorDominio } from '../errors/error-dominio';
import {
  crearFecha,
  descomponerFecha,
  diasDelMes,
  diferenciaDias,
  sumarDias,
  type Fecha,
} from '../value-objects/fecha';

export type DiaMes = number | 'ULTIMO';

type Vigencia = { readonly fechaInicio: Fecha; readonly fechaFin?: Fecha | null };

export type ReglaFechas = Vigencia &
  (
    | { readonly frecuencia: 'MENSUAL'; readonly dia: DiaMes }
    | { readonly frecuencia: 'QUINCENAL_DIAS'; readonly dias: readonly [DiaMes, DiaMes] }
    | { readonly frecuencia: 'CADA_N_DIAS'; readonly intervaloDias: number }
    | { readonly frecuencia: 'SEMANAL' }
    | { readonly frecuencia: 'ANUAL' }
  );

const DIAS_POR_SEMANA = 7;

const reglaInvalida = (mensaje: string) => new ErrorDominio('REGLA_INVALIDA', mensaje);

function validarDia(dia: DiaMes): void {
  if (dia !== 'ULTIMO' && (!Number.isInteger(dia) || dia < 1 || dia > 31)) {
    throw reglaInvalida(`El día ${dia} no es un día del mes válido`);
  }
}

function validarRegla(regla: ReglaFechas): void {
  if (regla.fechaFin && regla.fechaFin < regla.fechaInicio) {
    throw reglaInvalida('La fecha final no puede ser anterior a la inicial');
  }
  if (regla.frecuencia === 'MENSUAL') validarDia(regla.dia);
  if (regla.frecuencia === 'QUINCENAL_DIAS') {
    regla.dias.forEach(validarDia);
    if (regla.dias[0] === regla.dias[1]) throw reglaInvalida('Los dos días deben ser distintos');
  }
  if (
    regla.frecuencia === 'CADA_N_DIAS' &&
    (!Number.isSafeInteger(regla.intervaloDias) || regla.intervaloDias < 1)
  ) {
    throw reglaInvalida('El intervalo debe ser un entero mayor que cero');
  }
}

/** Si el mes no tiene ese día, usa el último. */
function fechaEnMes(anio: number, mes: number, dia: DiaMes): Fecha {
  const ultimo = diasDelMes(anio, mes);
  const real = dia === 'ULTIMO' ? ultimo : Math.min(dia, ultimo);
  const dosCifras = (n: number) => String(n).padStart(2, '0');
  return crearFecha(`${anio}-${dosCifras(mes)}-${dosCifras(real)}`);
}

function porDiasDelMes(dias: readonly DiaMes[], desde: Fecha, hasta: Fecha): Fecha[] {
  const a = descomponerFecha(desde);
  const b = descomponerFecha(hasta);
  const fechas = new Set<Fecha>(); // Set: 30 y ULTIMO coinciden en meses de 30 días
  for (let indice = a.anio * 12 + a.mes - 1; indice <= b.anio * 12 + b.mes - 1; indice++) {
    const anio = Math.floor(indice / 12);
    const mes = (indice % 12) + 1;
    for (const dia of dias) {
      const fecha = fechaEnMes(anio, mes, dia);
      if (fecha >= desde && fecha <= hasta) fechas.add(fecha);
    }
  }
  return [...fechas].sort();
}

function cadaNDias(ancla: Fecha, intervalo: number, desde: Fecha, hasta: Fecha): Fecha[] {
  const fechas: Fecha[] = [];
  const limite = diferenciaDias(ancla, hasta);
  const primero = Math.ceil(diferenciaDias(ancla, desde) / intervalo) * intervalo;
  for (let dias = primero; dias <= limite; dias += intervalo) {
    fechas.push(sumarDias(ancla, dias));
  }
  return fechas;
}

function anual(ancla: Fecha, desde: Fecha, hasta: Fecha): Fecha[] {
  const { mes, dia } = descomponerFecha(ancla);
  const fechas: Fecha[] = [];
  for (let anio = descomponerFecha(desde).anio; anio <= descomponerFecha(hasta).anio; anio++) {
    const fecha = fechaEnMes(anio, mes, dia);
    if (fecha >= desde && fecha <= hasta) fechas.push(fecha);
  }
  return fechas;
}

/** Fechas de la regla dentro de `[desde, hasta]`, en orden y sin repetir. */
export function fechasEnVentana(regla: ReglaFechas, desde: Fecha, hasta: Fecha): Fecha[] {
  validarRegla(regla);
  const inicio = desde > regla.fechaInicio ? desde : regla.fechaInicio;
  const fin = regla.fechaFin && regla.fechaFin < hasta ? regla.fechaFin : hasta;
  if (inicio > fin) return [];

  switch (regla.frecuencia) {
    case 'MENSUAL':
      return porDiasDelMes([regla.dia], inicio, fin);
    case 'QUINCENAL_DIAS':
      return porDiasDelMes(regla.dias, inicio, fin);
    case 'CADA_N_DIAS':
      return cadaNDias(regla.fechaInicio, regla.intervaloDias, inicio, fin);
    case 'SEMANAL':
      return cadaNDias(regla.fechaInicio, DIAS_POR_SEMANA, inicio, fin);
    case 'ANUAL':
      return anual(regla.fechaInicio, inicio, fin);
  }
}
