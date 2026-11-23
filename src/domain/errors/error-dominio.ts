export type CodigoErrorDominio =
  | 'MONTO_INVALIDO'
  | 'FECHA_INVALIDA'
  | 'PERIODO_INVALIDO'
  | 'REGLA_INVALIDA'
  | 'BOLSA_NO_ENCONTRADA'
  | 'CUENTA_NO_ENCONTRADA'
  | 'CUENTA_INVALIDA'
  | 'CUENTA_CON_SALDO'
  | 'CATEGORIA_INVALIDA'
  | 'MOVIMIENTO_NO_ENCONTRADO'
  | 'MOVIMIENTO_PROTEGIDO'
  | 'DISPONIBLE_INSUFICIENTE'
  | 'OCURRENCIA_NO_ENCONTRADA'
  | 'OCURRENCIA_INVALIDA';

export class ErrorDominio extends Error {
  readonly codigo: CodigoErrorDominio;

  constructor(codigo: CodigoErrorDominio, mensaje: string) {
    super(mensaje);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
  }
}
