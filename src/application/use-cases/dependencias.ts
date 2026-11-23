import type { Categoria, TipoCategoria } from '../../domain/entities/categoria';
import type { Cuenta } from '../../domain/entities/cuenta';
import { ErrorDominio } from '../../domain/errors/error-dominio';
import type { GeneradorId } from '../../domain/ports/generador-id';
import type { Reloj } from '../../domain/ports/reloj';
import type { Repositorios, UnidadDeTrabajo } from '../../domain/ports/repositorios';

export type Dependencias = {
  readonly unidad: UnidadDeTrabajo;
  readonly reloj: Reloj;
  readonly generarId: GeneradorId;
};

export function cuentaActiva(r: Repositorios, id: string): Cuenta {
  const cuenta = r.cuentas.obtener(id);
  if (!cuenta) throw new ErrorDominio('CUENTA_NO_ENCONTRADA', 'La cuenta no existe');
  if (cuenta.archivada) throw new ErrorDominio('CUENTA_INVALIDA', 'La cuenta está archivada');
  return cuenta;
}

export function categoriaDeTipo(r: Repositorios, id: string, tipo: TipoCategoria): Categoria {
  const categoria = r.categorias.obtener(id);
  if (!categoria || categoria.archivada || categoria.tipo !== tipo) {
    throw new ErrorDominio('CATEGORIA_INVALIDA', 'La categoría no corresponde al movimiento');
  }
  return categoria;
}
