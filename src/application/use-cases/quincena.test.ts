/** @jest-environment node */
import { crearMonto } from '../../domain/value-objects/dinero';
import { crearFecha } from '../../domain/value-objects/fecha';
import { crearCasosCuentas } from './cuentas';
import { codigoDe, crearEntorno } from './entorno-prueba';
import { crearCasosMovimientos } from './movimientos';
import { crearCasosQuincena } from './quincena';

const MERCADO = 'cat-gasto-mercado';
const BONO = 'cat-ingreso-bono';
const HORAS = 'cat-ingreso-horas-extra';
const LIBRANZA = 'cat-descuento-libranza';

let entorno: ReturnType<typeof crearEntorno>;
let quincena: ReturnType<typeof crearCasosQuincena>;
let movimientos: ReturnType<typeof crearCasosMovimientos>;

const pendiente = (fecha: string) => {
  const ocurrencia = entorno.repos.ocurrencias.listarPendientes().find((o) => o.fecha === fecha);
  if (!ocurrencia) throw new Error(`Sin pendiente el ${fecha}`);
  return ocurrencia;
};
const fechasPendientes = () => entorno.repos.ocurrencias.listarPendientes().map((o) => o.fecha);

const confirmar = (programada: string, real = programada, monto = 3000000) => {
  entorno.irA(real);
  return quincena.confirmarSueldo({
    ocurrenciaId: pendiente(programada).id,
    monto,
    fechaReal: real,
  });
};
const gastar = (monto: number, fecha?: string) =>
  movimientos.registrarMovimiento({ tipo: 'GASTO', monto, categoriaId: MERCADO, fecha });
const disponible = () => quincena.obtenerResumenQuincena().resumen.disponible;

beforeEach(() => {
  entorno = crearEntorno('2026-11-14');
  quincena = crearCasosQuincena(entorno.dependencias);
  movimientos = crearCasosMovimientos(entorno.dependencias);
  quincena.configurarSueldo({ montoQuincena: 3000000, montoFinDeMes: 3200000 });
});
afterEach(() => entorno.cerrar());

describe('configurarSueldo y generarOcurrencias', () => {
  test('crea las quincenas pendientes del 15 y fin de mes con su monto', () => {
    expect(fechasPendientes()).toEqual(['2026-11-15', '2026-11-30', '2026-12-15', '2026-12-31']);
    expect(pendiente('2026-11-15').monto).toBe(3000000);
    expect(pendiente('2026-11-30').monto).toBe(3200000);
    expect(entorno.repos.reglas.listarActivas().every((r) => r.esSueldo)).toBe(true);
  });

  test('no crea movimientos: el sueldo siempre se confirma', () => {
    entorno.irA('2026-12-20');
    quincena.generarOcurrencias();
    expect(entorno.repos.movimientos.listar()).toHaveLength(0);
  });

  test('generar varias veces no duplica', () => {
    quincena.generarOcurrencias();
    quincena.generarOcurrencias();
    expect(fechasPendientes()).toHaveLength(4);
  });

  test('si la app no se abrió en meses no pierde ninguna quincena', () => {
    entorno.irA('2027-03-01');
    quincena.generarOcurrencias();
    expect(fechasPendientes()).toEqual([
      '2026-11-15',
      '2026-11-30',
      '2026-12-15',
      '2026-12-31',
      '2027-01-15',
      '2027-01-31',
      '2027-02-15',
      '2027-02-28',
      '2027-03-15',
      '2027-03-31',
      '2027-04-15',
      '2027-04-30',
    ]);
  });

  test('reconfigurar cambia solo las futuras y no crea reglas nuevas', () => {
    confirmar('2026-11-15');
    entorno.irA('2026-11-20');
    quincena.configurarSueldo({ montoQuincena: 3500000, montoFinDeMes: 3600000 });

    expect(entorno.repos.reglas.listarActivas()).toHaveLength(2);
    expect(pendiente('2026-11-30').monto).toBe(3600000);
    expect(pendiente('2026-12-15').monto).toBe(3500000);
    const confirmada = entorno.repos.ocurrencias
      .listarEnRango(crearFecha('2026-11-15'), crearFecha('2026-11-15'))
      .at(0);
    expect(confirmada?.monto).toBe(3000000);
  });

  test.each([
    [0, 1000],
    [1000, -1],
    [1.5, 1000],
  ])('rechaza montos %d y %d sin guardar nada a medias', (montoQuincena, montoFinDeMes) => {
    const otro = crearEntorno('2026-11-14');
    const casos = crearCasosQuincena(otro.dependencias);
    expect(codigoDe(() => casos.configurarSueldo({ montoQuincena, montoFinDeMes }))).toBe(
      'MONTO_INVALIDO',
    );
    expect(otro.repos.reglas.listarActivas()).toHaveLength(0);
    otro.cerrar();
  });
});

describe('confirmarSueldo', () => {
  test('registra el ingreso con la fecha real y marca la ocurrencia', () => {
    const { periodo, corte } = confirmar('2026-11-15', '2026-11-15', 2950000);
    expect(periodo).toMatchObject({ inicio: '2026-11-15', fin: '2026-11-29' });
    expect(corte).toBeNull();
    const [ingreso] = entorno.repos.movimientos.listar();
    expect(ingreso).toMatchObject({
      tipo: 'INGRESO',
      monto: 2950000,
      fecha: '2026-11-15',
      cuentaId: 'cuenta-quincena',
      categoriaId: 'cat-ingreso-sueldo',
    });
    expect(entorno.repos.ocurrencias.obtener(ingreso.ocurrenciaId ?? '')).toMatchObject({
      estado: 'PAGADA',
      monto: 2950000,
      movimientoId: ingreso.id,
    });
  });

  test('acepta el pago un día antes y deja corta la quincena anterior', () => {
    confirmar('2026-11-15');
    gastar(100000, '2026-11-20');
    const { periodo, corte } = confirmar('2026-11-30', '2026-11-29', 3200000);

    expect(periodo.inicio).toBe('2026-11-29');
    expect(corte?.sobrante).toBe(2900000);
    expect(entorno.repos.cortes.ultimo()).toMatchObject({
      fechaInicio: '2026-11-15',
      fechaFin: '2026-11-28',
      pagoProgramado: '2026-11-15',
    });
    const { resumen } = quincena.obtenerResumenQuincena();
    expect(resumen.saldoAnterior).toBe(2900000);
    expect(resumen.disponible).toBe(6100000);
  });

  test('registra novedades junto con el sueldo', () => {
    entorno.irA('2026-11-15');
    quincena.confirmarSueldo({
      ocurrenciaId: pendiente('2026-11-15').id,
      monto: 3000000,
      fechaReal: '2026-11-15',
      novedades: [
        { tipo: 'INGRESO', categoriaId: HORAS, monto: 180000 },
        { tipo: 'INGRESO', categoriaId: BONO, monto: 250000, nota: 'Navidad' },
        { tipo: 'DESCUENTO', categoriaId: LIBRANZA, monto: 100000 },
      ],
    });
    const { resumen } = quincena.obtenerResumenQuincena();
    expect(resumen.ingresos).toBe(3430000);
    expect(resumen.descuentos).toBe(100000);
    expect(resumen.disponible).toBe(3330000);
  });

  test('si una novedad es inválida no guarda nada', () => {
    entorno.irA('2026-11-15');
    const ocurrencia = pendiente('2026-11-15');
    expect(
      codigoDe(() =>
        quincena.confirmarSueldo({
          ocurrenciaId: ocurrencia.id,
          monto: 3000000,
          fechaReal: '2026-11-15',
          novedades: [
            { tipo: 'INGRESO', categoriaId: BONO, monto: 1000 },
            { tipo: 'DESCUENTO', categoriaId: BONO, monto: 1000 },
          ],
        }),
      ),
    ).toBe('CATEGORIA_INVALIDA');
    expect(entorno.repos.movimientos.listar()).toHaveLength(0);
    expect(entorno.repos.ocurrencias.obtener(ocurrencia.id)?.estado).toBe('PENDIENTE');
  });

  test('si falla al cerrar el corte revierte el sueldo', () => {
    confirmar('2026-11-15');
    const ocurrencia = pendiente('2026-11-30');
    entorno.repos.cortes.guardar({
      id: 'choque',
      fechaInicio: crearFecha('2026-11-15'),
      fechaFin: crearFecha('2026-11-20'),
      pagoProgramado: crearFecha('2026-11-15'),
      cerradoEn: 'x',
    });
    entorno.irA('2026-11-30');
    expect(() =>
      quincena.confirmarSueldo({
        ocurrenciaId: ocurrencia.id,
        monto: 3200000,
        fechaReal: '2026-11-30',
      }),
    ).toThrow(/UNIQUE/);
    expect(entorno.repos.movimientos.listar()).toHaveLength(1);
    expect(entorno.repos.ocurrencias.obtener(ocurrencia.id)?.estado).toBe('PENDIENTE');
  });

  test.each([
    ['dos días antes', '2026-11-13', '2026-11-13'],
    ['fecha futura', '2026-11-14', '2026-11-15'],
  ])('rechaza %s', (_, hoy, fechaReal) => {
    entorno.irA(hoy);
    expect(
      codigoDe(() =>
        quincena.confirmarSueldo({
          ocurrenciaId: pendiente('2026-11-15').id,
          monto: 3000000,
          fechaReal,
        }),
      ),
    ).toBe('PERIODO_INVALIDO');
  });

  test('no se puede confirmar dos veces', () => {
    const ocurrencia = pendiente('2026-11-15');
    confirmar('2026-11-15');
    expect(
      codigoDe(() =>
        quincena.confirmarSueldo({
          ocurrenciaId: ocurrencia.id,
          monto: 3000000,
          fechaReal: '2026-11-15',
        }),
      ),
    ).toBe('OCURRENCIA_INVALIDA');
    expect(entorno.repos.movimientos.listar()).toHaveLength(1);
  });

  test('exige confirmar antes la quincena anterior', () => {
    entorno.irA('2026-11-30');
    expect(
      codigoDe(() =>
        quincena.confirmarSueldo({
          ocurrenciaId: pendiente('2026-11-30').id,
          monto: 3200000,
          fechaReal: '2026-11-30',
        }),
      ),
    ).toBe('OCURRENCIA_INVALIDA');
  });

  test('rechaza una ocurrencia inexistente o que no es sueldo', () => {
    entorno.irA('2026-11-25');
    expect(
      codigoDe(() =>
        quincena.confirmarSueldo({ ocurrenciaId: 'x', monto: 1000, fechaReal: '2026-11-25' }),
      ),
    ).toBe('OCURRENCIA_NO_ENCONTRADA');

    entorno.repos.reglas.guardar({
      id: 'netflix',
      nombre: 'Netflix',
      tipoMovimiento: 'GASTO',
      monto: crearMonto(38900),
      cuentaId: 'cuenta-quincena',
      categoriaId: 'cat-gasto-servicios',
      deudaId: null,
      fechas: { frecuencia: 'MENSUAL', dia: 25, fechaInicio: crearFecha('2026-11-01') },
      esSueldo: false,
      recordatorioActivo: true,
      recordatorioDiasAntes: 1,
      recordatorioHora: '08:00',
      activa: true,
      creadoEn: 'x',
      actualizadoEn: 'x',
    });
    quincena.generarOcurrencias();
    expect(
      codigoDe(() =>
        quincena.confirmarSueldo({
          ocurrenciaId: pendiente('2026-11-25').id,
          monto: 1000,
          fechaReal: '2026-11-25',
        }),
      ),
    ).toBe('OCURRENCIA_INVALIDA');
  });
});

describe('corte y sobrante', () => {
  test('el sobrante pasa a la siguiente quincena', () => {
    confirmar('2026-11-15');
    gastar(1000000, '2026-11-20');
    const { corte } = confirmar('2026-11-30', '2026-11-30', 3200000);
    expect(corte?.sobrante).toBe(2000000);
    expect(quincena.obtenerResumenQuincena().resumen).toMatchObject({
      saldoAnterior: 2000000,
      disponible: 5200000,
    });
  });

  test('un sobrante negativo también pasa', () => {
    confirmar('2026-11-15', '2026-11-15', 100000);
    gastar(130000, '2026-11-20');
    const { corte } = confirmar('2026-11-30', '2026-11-30', 500000);
    expect(corte?.sobrante).toBe(-30000);
    expect(disponible()).toBe(470000);
  });

  test('pasar sobrante a una billetera lo descuenta del corte', () => {
    const cuentas = crearCasosCuentas(entorno.dependencias);
    confirmar('2026-11-15');
    const nequi = cuentas.crearCuenta({ nombre: 'Nequi', tipo: 'BILLETERA' });
    entorno.irA('2026-11-28');
    movimientos.transferirEntreCuentas({
      monto: 3000000,
      cuentaOrigenId: 'cuenta-quincena',
      cuentaDestinoId: nequi.id,
    });
    expect(disponible()).toBe(0);
    const { corte } = confirmar('2026-11-30', '2026-11-30', 3200000);
    expect(corte).toMatchObject({ transferidoSalida: 3000000, sobrante: 0 });
  });

  test('obtenerCorte recalcula si se corrige un movimiento antiguo', () => {
    confirmar('2026-11-15');
    const gasto = gastar(1000000, '2026-11-20');
    confirmar('2026-11-30', '2026-11-30', 3200000);
    const registro = entorno.repos.cortes.ultimo();
    if (!registro) throw new Error('sin corte');

    movimientos.editarMovimiento(gasto.id, { monto: 1500000 });

    expect(quincena.obtenerCorte(registro.id)?.corte.sobrante).toBe(1500000);
    expect(quincena.obtenerResumenQuincena().resumen.saldoAnterior).toBe(1500000);
    expect(quincena.obtenerCorte('x')).toBeNull();
  });
});

describe('resumen de la quincena vigente', () => {
  test('sin sueldo confirmado usa la quincena programada', () => {
    entorno.irA('2026-11-22');
    expect(quincena.obtenerResumenQuincena().periodo).toMatchObject({
      inicio: '2026-11-15',
      fin: '2026-11-29',
    });
  });

  test('si el sueldo se retrasa la quincena sigue abierta y cuenta los gastos', () => {
    confirmar('2026-11-15');
    entorno.irA('2026-12-02');
    gastar(50000);
    const { periodo, resumen } = quincena.obtenerResumenQuincena();
    expect(periodo).toMatchObject({ inicio: '2026-11-15', fin: '2026-12-02' });
    expect(resumen.gastos).toBe(50000);
    expect(resumen.disponible).toBe(2950000);
  });

  test('los sueldos pendientes no restan de lo que te quedaría', () => {
    confirmar('2026-11-15');
    expect(quincena.obtenerResumenQuincena().resumen).toMatchObject({
      pendientes: 0,
      teQuedaria: 3000000,
    });
  });
});

describe('deshacer confirmación', () => {
  test('restaura el sueldo, sus novedades y reabre la quincena', () => {
    confirmar('2026-11-15');
    gastar(100000, '2026-11-20');
    entorno.irA('2026-11-30');
    const ocurrencia = pendiente('2026-11-30');
    quincena.confirmarSueldo({
      ocurrenciaId: ocurrencia.id,
      monto: 2000000,
      fechaReal: '2026-11-30',
      novedades: [{ tipo: 'INGRESO', categoriaId: BONO, monto: 50000 }],
    });

    quincena.deshacerConfirmacionSueldo(ocurrencia.id);

    expect(entorno.repos.ocurrencias.obtener(ocurrencia.id)).toMatchObject({
      estado: 'PENDIENTE',
      monto: 3200000,
      movimientoId: null,
    });
    expect(entorno.repos.cortes.ultimo()).toBeNull();
    expect(entorno.repos.movimientos.listar()).toHaveLength(2);
    expect(quincena.obtenerResumenQuincena().periodo.inicio).toBe('2026-11-15');
    expect(disponible()).toBe(2900000);
  });

  test('después de deshacer se puede confirmar con otra fecha', () => {
    confirmar('2026-11-15');
    const ocurrencia = pendiente('2026-11-30');
    confirmar('2026-11-30');
    quincena.deshacerConfirmacionSueldo(ocurrencia.id);
    const { periodo } = quincena.confirmarSueldo({
      ocurrenciaId: ocurrencia.id,
      monto: 3200000,
      fechaReal: '2026-11-29',
    });
    expect(periodo.inicio).toBe('2026-11-29');
    expect(entorno.repos.cortes.ultimo()?.fechaFin).toBe('2026-11-28');
  });

  test('solo permite deshacer el último sueldo', () => {
    const primera = pendiente('2026-11-15');
    confirmar('2026-11-15');
    confirmar('2026-11-30');
    expect(codigoDe(() => quincena.deshacerConfirmacionSueldo(primera.id))).toBe(
      'OCURRENCIA_INVALIDA',
    );
    expect(entorno.repos.cortes.listar()).toHaveLength(1);
  });
});

describe('movimientos del sueldo', () => {
  const ingresoPrincipal = () => {
    const movimiento = entorno.repos.movimientos
      .listar()
      .find((m) => m.categoriaId === 'cat-ingreso-sueldo');
    if (!movimiento) throw new Error('sin sueldo');
    return movimiento;
  };

  test('no se borra ni cambia de fecha directamente', () => {
    confirmar('2026-11-15');
    const sueldo = ingresoPrincipal();
    expect(codigoDe(() => movimientos.eliminarMovimiento(sueldo.id))).toBe('MOVIMIENTO_PROTEGIDO');
    expect(codigoDe(() => movimientos.editarMovimiento(sueldo.id, { fecha: '2026-11-16' }))).toBe(
      'MOVIMIENTO_PROTEGIDO',
    );
  });

  test('corregir su monto actualiza también la ocurrencia', () => {
    confirmar('2026-11-15');
    const sueldo = ingresoPrincipal();
    movimientos.editarMovimiento(sueldo.id, { monto: 2800000 });
    expect(entorno.repos.ocurrencias.obtener(sueldo.ocurrenciaId ?? '')?.monto).toBe(2800000);
    expect(disponible()).toBe(2800000);
  });

  test('una novedad sí se puede borrar', () => {
    entorno.irA('2026-11-15');
    quincena.confirmarSueldo({
      ocurrenciaId: pendiente('2026-11-15').id,
      monto: 3000000,
      fechaReal: '2026-11-15',
      novedades: [{ tipo: 'INGRESO', categoriaId: BONO, monto: 50000 }],
    });
    const bono = entorno.repos.movimientos.listar().find((m) => m.categoriaId === BONO);
    movimientos.eliminarMovimiento(bono?.id ?? '');
    expect(disponible()).toBe(3000000);
  });
});
