import { ErrorDominio } from '../errors/error-dominio';

/** Entero en la unidad mínima de la moneda (pesos en COP). Puede ser negativo en saldos. */
export type Dinero = number & { readonly __marca: 'Dinero' };

export function crearDinero(valor: number): Dinero {
  if (!Number.isSafeInteger(valor)) {
    throw new ErrorDominio('MONTO_INVALIDO', `El valor ${valor} no es un monto entero válido`);
  }
  return (valor + 0) as Dinero; // + 0 convierte -0 en 0
}

/** Monto de un movimiento: siempre mayor que cero. */
export function crearMonto(valor: number): Dinero {
  const monto = crearDinero(valor);
  if (monto <= 0) {
    throw new ErrorDominio('MONTO_INVALIDO', 'El monto debe ser mayor que cero');
  }
  return monto;
}

export const sumarDinero = (a: Dinero, b: Dinero): Dinero => crearDinero(a + b);

export const restarDinero = (a: Dinero, b: Dinero): Dinero => crearDinero(a - b);

const conMiles = (valor: number): string =>
  String(Math.abs(valor)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const formatearDinero = (valor: Dinero): string =>
  `${valor < 0 ? '− ' : ''}$ ${conMiles(valor)}`;

export const formatearIngreso = (monto: Dinero): string => `+ $ ${conMiles(monto)}`;

export const formatearGasto = (monto: Dinero): string => `− $ ${conMiles(monto)}`;
