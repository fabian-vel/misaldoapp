import { crearCasosCuentas } from './cuentas';
import type { Dependencias } from './dependencias';
import { crearCasosMovimientos } from './movimientos';
import { crearCasosQuincena } from './quincena';

export const crearCasosDeUso = (dependencias: Dependencias) => ({
  cuentas: crearCasosCuentas(dependencias),
  movimientos: crearCasosMovimientos(dependencias),
  quincena: crearCasosQuincena(dependencias),
});

export type CasosDeUso = ReturnType<typeof crearCasosDeUso>;
