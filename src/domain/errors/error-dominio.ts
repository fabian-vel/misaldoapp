export type CodigoErrorDominio =
  'MONTO_INVALIDO' | 'FECHA_INVALIDA' | 'PERIODO_INVALIDO' | 'REGLA_INVALIDA';

export class ErrorDominio extends Error {
  readonly codigo: CodigoErrorDominio;

  constructor(codigo: CodigoErrorDominio, mensaje: string) {
    super(mensaje);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
  }
}
