import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';

import { TIPOS_CATEGORIA } from '../../domain/entities/categoria';
import { TIPOS_CUENTA } from '../../domain/entities/cuenta';
import { MEDIOS_PAGO, TIPOS_MOVIMIENTO } from '../../domain/entities/movimiento';
import { ESTADOS_OCURRENCIA } from '../../domain/entities/ocurrencia';
import { FRECUENCIAS } from '../../domain/entities/regla-recurrencia';

const booleano = (nombre: string) => integer(nombre, { mode: 'boolean' });

export const cuenta = sqliteTable(
  'cuenta',
  {
    id: text('id').primaryKey(),
    nombre: text('nombre').notNull(),
    tipo: text('tipo', { enum: TIPOS_CUENTA }).notNull(),
    saldoInicial: integer('saldo_inicial').notNull().default(0),
    moneda: text('moneda').notNull().default('COP'),
    archivada: booleano('archivada').notNull().default(false),
    creadoEn: text('creado_en').notNull(),
    actualizadoEn: text('actualizado_en').notNull(),
  },
  (t) => [
    uniqueIndex('cuenta_quincena_unica')
      .on(t.tipo)
      .where(sql`tipo = 'QUINCENA'`),
  ],
);

export const categoria = sqliteTable('categoria', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  tipo: text('tipo', { enum: TIPOS_CATEGORIA }).notNull(),
  icono: text('icono').notNull(),
  orden: integer('orden').notNull().default(0),
  archivada: booleano('archivada').notNull().default(false),
});

export const reglaRecurrencia = sqliteTable(
  'regla_recurrencia',
  {
    id: text('id').primaryKey(),
    nombre: text('nombre').notNull(),
    tipoMovimiento: text('tipo_movimiento', { enum: TIPOS_MOVIMIENTO }).notNull(),
    monto: integer('monto').notNull(),
    cuentaId: text('cuenta_id').references(() => cuenta.id),
    categoriaId: text('categoria_id').references(() => categoria.id),
    deudaId: text('deuda_id').references((): AnySQLiteColumn => deuda.id, {
      onDelete: 'set null',
    }),
    frecuencia: text('frecuencia', { enum: FRECUENCIAS }).notNull(),
    diasMes: text('dias_mes'),
    intervaloDias: integer('intervalo_dias'),
    fechaInicio: text('fecha_inicio').notNull(),
    fechaFin: text('fecha_fin'),
    esSueldo: booleano('es_sueldo').notNull().default(false),
    recordatorioActivo: booleano('recordatorio_activo').notNull().default(true),
    recordatorioDiasAntes: integer('recordatorio_dias_antes').notNull().default(1),
    recordatorioHora: text('recordatorio_hora').notNull().default('08:00'),
    activa: booleano('activa').notNull().default(true),
    creadoEn: text('creado_en').notNull(),
    actualizadoEn: text('actualizado_en').notNull(),
  },
  (t) => [check('regla_monto_positivo', sql`${t.monto} > 0`)],
);

export const ocurrencia = sqliteTable(
  'ocurrencia',
  {
    id: text('id').primaryKey(),
    reglaId: text('regla_id')
      .notNull()
      .references(() => reglaRecurrencia.id),
    fecha: text('fecha').notNull(),
    monto: integer('monto').notNull(),
    estado: text('estado', { enum: ESTADOS_OCURRENCIA }).notNull().default('PENDIENTE'),
    movimientoId: text('movimiento_id').references((): AnySQLiteColumn => movimiento.id, {
      onDelete: 'set null',
    }),
  },
  (t) => [
    uniqueIndex('ocurrencia_regla_fecha_unica').on(t.reglaId, t.fecha),
    index('ocurrencia_estado_fecha').on(t.estado, t.fecha),
    check('ocurrencia_monto_positivo', sql`${t.monto} > 0`),
  ],
);

export const movimiento = sqliteTable(
  'movimiento',
  {
    id: text('id').primaryKey(),
    tipo: text('tipo', { enum: TIPOS_MOVIMIENTO }).notNull(),
    monto: integer('monto').notNull(),
    fecha: text('fecha').notNull(),
    cuentaId: text('cuenta_id').references(() => cuenta.id),
    categoriaId: text('categoria_id').references(() => categoria.id),
    deudaId: text('deuda_id').references((): AnySQLiteColumn => deuda.id),
    ocurrenciaId: text('ocurrencia_id').references((): AnySQLiteColumn => ocurrencia.id, {
      onDelete: 'set null',
    }),
    cuentaDestinoId: text('cuenta_destino_id').references(() => cuenta.id),
    nota: text('nota'),
    medioPago: text('medio_pago', { enum: MEDIOS_PAGO }),
    creadoEn: text('creado_en').notNull(),
    actualizadoEn: text('actualizado_en').notNull(),
  },
  (t) => [
    index('movimiento_fecha').on(t.fecha),
    index('movimiento_deuda').on(t.deudaId),
    check('movimiento_monto_positivo', sql`${t.monto} > 0`),
  ],
);

export const deuda = sqliteTable('deuda', {
  id: text('id').primaryKey(),
  nombre: text('nombre').notNull(),
  acreedor: text('acreedor'),
  tipo: text('tipo', { enum: ['PRESTAMO', 'TARJETA_CREDITO', 'OTRA'] }).notNull(),
  montoInicial: integer('monto_inicial').notNull(),
  saldoAlRegistrar: integer('saldo_al_registrar').notNull(),
  cuota: integer('cuota'),
  fechaInicio: text('fecha_inicio').notNull(),
  reglaId: text('regla_id').references((): AnySQLiteColumn => reglaRecurrencia.id, {
    onDelete: 'set null',
  }),
  estado: text('estado', { enum: ['ACTIVA', 'SALDADA'] })
    .notNull()
    .default('ACTIVA'),
  creadoEn: text('creado_en').notNull(),
  actualizadoEn: text('actualizado_en').notNull(),
});

export const corteQuincena = sqliteTable(
  'corte_quincena',
  {
    id: text('id').primaryKey(),
    fechaInicio: text('fecha_inicio').notNull(),
    fechaFin: text('fecha_fin').notNull(),
    pagoProgramado: text('pago_programado').notNull(),
    cerradoEn: text('cerrado_en').notNull(),
  },
  (t) => [uniqueIndex('corte_inicio_unico').on(t.fechaInicio)],
);

export const notificacionProgramada = sqliteTable('notificacion_programada', {
  id: text('id').primaryKey(),
  ocurrenciaId: text('ocurrencia_id')
    .notNull()
    .references(() => ocurrencia.id, { onDelete: 'cascade' }),
  expoNotificationId: text('expo_notification_id').notNull(),
  disparaEn: text('dispara_en').notNull(),
});

export const ajuste = sqliteTable('ajuste', {
  clave: text('clave').primaryKey(),
  valor: text('valor').notNull(),
});

export const meta = sqliteTable('meta', {
  clave: text('clave').primaryKey(),
  valor: text('valor').notNull(),
});
