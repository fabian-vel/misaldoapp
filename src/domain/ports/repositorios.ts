import type { Categoria, TipoCategoria } from '../entities/categoria';
import type { Cuenta } from '../entities/cuenta';
import type { Movimiento } from '../entities/movimiento';
import type { Ocurrencia } from '../entities/ocurrencia';
import type { ReglaRecurrencia } from '../entities/regla-recurrencia';
import type { RegistroCorte } from '../entities/registro-corte';
import type { Fecha } from '../value-objects/fecha';

export interface CuentaRepositorio {
  guardar(cuenta: Cuenta): void;
  obtener(id: string): Cuenta | null;
  /** Cuentas no archivadas. */
  listar(): Cuenta[];
  obtenerBolsa(): Cuenta;
}

export interface CategoriaRepositorio {
  guardar(categoria: Categoria): void;
  obtener(id: string): Categoria | null;
  /** Categorías no archivadas del tipo, en su orden. */
  listar(tipo: TipoCategoria): Categoria[];
}

export interface MovimientoRepositorio {
  guardar(movimiento: Movimiento): void;
  obtener(id: string): Movimiento | null;
  eliminar(id: string): void;
  listar(): Movimiento[];
  listarRecientes(limite: number): Movimiento[];
}

export interface ReglaRepositorio {
  guardar(regla: ReglaRecurrencia): void;
  obtener(id: string): ReglaRecurrencia | null;
  listarActivas(): ReglaRecurrencia[];
}

export interface OcurrenciaRepositorio {
  /** Inserta las que no existan para su `(regla, fecha)`; es idempotente. */
  insertarNuevas(ocurrencias: readonly Ocurrencia[]): void;
  guardar(ocurrencia: Ocurrencia): void;
  obtener(id: string): Ocurrencia | null;
  listarPendientes(): Ocurrencia[];
  listarEnRango(desde: Fecha, hasta: Fecha): Ocurrencia[];
}

export interface CorteRepositorio {
  guardar(corte: RegistroCorte): void;
  ultimo(): RegistroCorte | null;
  listar(): RegistroCorte[];
}

export type Repositorios = {
  readonly cuentas: CuentaRepositorio;
  readonly categorias: CategoriaRepositorio;
  readonly movimientos: MovimientoRepositorio;
  readonly reglas: ReglaRepositorio;
  readonly ocurrencias: OcurrenciaRepositorio;
  readonly cortes: CorteRepositorio;
};

export interface UnidadDeTrabajo {
  /** Ejecuta todo o nada: si `trabajo` lanza un error, se revierte. */
  ejecutar<T>(trabajo: (repositorios: Repositorios) => T): T;
}
