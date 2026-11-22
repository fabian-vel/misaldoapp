export const TIPOS_CATEGORIA = ['GASTO', 'INGRESO', 'DESCUENTO'] as const;
export type TipoCategoria = (typeof TIPOS_CATEGORIA)[number];

export type Categoria = {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoCategoria;
  readonly icono: string;
  readonly orden: number;
  readonly archivada: boolean;
};
