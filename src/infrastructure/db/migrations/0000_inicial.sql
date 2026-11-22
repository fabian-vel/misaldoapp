CREATE TABLE `ajuste` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categoria` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`icono` text NOT NULL,
	`orden` integer DEFAULT 0 NOT NULL,
	`archivada` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `corte_quincena` (
	`id` text PRIMARY KEY NOT NULL,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text NOT NULL,
	`pago_programado` text NOT NULL,
	`cerrado_en` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `corte_inicio_unico` ON `corte_quincena` (`fecha_inicio`);--> statement-breakpoint
CREATE TABLE `cuenta` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`tipo` text NOT NULL,
	`saldo_inicial` integer DEFAULT 0 NOT NULL,
	`moneda` text DEFAULT 'COP' NOT NULL,
	`archivada` integer DEFAULT false NOT NULL,
	`creado_en` text NOT NULL,
	`actualizado_en` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cuenta_quincena_unica` ON `cuenta` (`tipo`) WHERE tipo = 'QUINCENA';--> statement-breakpoint
CREATE TABLE `deuda` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`acreedor` text,
	`tipo` text NOT NULL,
	`monto_inicial` integer NOT NULL,
	`saldo_al_registrar` integer NOT NULL,
	`cuota` integer,
	`fecha_inicio` text NOT NULL,
	`regla_id` text,
	`estado` text DEFAULT 'ACTIVA' NOT NULL,
	`creado_en` text NOT NULL,
	`actualizado_en` text NOT NULL,
	FOREIGN KEY (`regla_id`) REFERENCES `regla_recurrencia`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`clave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movimiento` (
	`id` text PRIMARY KEY NOT NULL,
	`tipo` text NOT NULL,
	`monto` integer NOT NULL,
	`fecha` text NOT NULL,
	`cuenta_id` text,
	`categoria_id` text,
	`deuda_id` text,
	`ocurrencia_id` text,
	`cuenta_destino_id` text,
	`nota` text,
	`medio_pago` text,
	`creado_en` text NOT NULL,
	`actualizado_en` text NOT NULL,
	FOREIGN KEY (`cuenta_id`) REFERENCES `cuenta`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deuda_id`) REFERENCES `deuda`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ocurrencia_id`) REFERENCES `ocurrencia`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`cuenta_destino_id`) REFERENCES `cuenta`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "movimiento_monto_positivo" CHECK("movimiento"."monto" > 0)
);
--> statement-breakpoint
CREATE INDEX `movimiento_fecha` ON `movimiento` (`fecha`);--> statement-breakpoint
CREATE INDEX `movimiento_deuda` ON `movimiento` (`deuda_id`);--> statement-breakpoint
CREATE TABLE `notificacion_programada` (
	`id` text PRIMARY KEY NOT NULL,
	`ocurrencia_id` text NOT NULL,
	`expo_notification_id` text NOT NULL,
	`dispara_en` text NOT NULL,
	FOREIGN KEY (`ocurrencia_id`) REFERENCES `ocurrencia`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ocurrencia` (
	`id` text PRIMARY KEY NOT NULL,
	`regla_id` text NOT NULL,
	`fecha` text NOT NULL,
	`monto` integer NOT NULL,
	`estado` text DEFAULT 'PENDIENTE' NOT NULL,
	`movimiento_id` text,
	FOREIGN KEY (`regla_id`) REFERENCES `regla_recurrencia`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`movimiento_id`) REFERENCES `movimiento`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "ocurrencia_monto_positivo" CHECK("ocurrencia"."monto" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ocurrencia_regla_fecha_unica` ON `ocurrencia` (`regla_id`,`fecha`);--> statement-breakpoint
CREATE INDEX `ocurrencia_estado_fecha` ON `ocurrencia` (`estado`,`fecha`);--> statement-breakpoint
CREATE TABLE `regla_recurrencia` (
	`id` text PRIMARY KEY NOT NULL,
	`nombre` text NOT NULL,
	`tipo_movimiento` text NOT NULL,
	`monto` integer NOT NULL,
	`cuenta_id` text,
	`categoria_id` text,
	`deuda_id` text,
	`frecuencia` text NOT NULL,
	`dias_mes` text,
	`intervalo_dias` integer,
	`fecha_inicio` text NOT NULL,
	`fecha_fin` text,
	`es_sueldo` integer DEFAULT false NOT NULL,
	`recordatorio_activo` integer DEFAULT true NOT NULL,
	`recordatorio_dias_antes` integer DEFAULT 1 NOT NULL,
	`recordatorio_hora` text DEFAULT '08:00' NOT NULL,
	`activa` integer DEFAULT true NOT NULL,
	`creado_en` text NOT NULL,
	`actualizado_en` text NOT NULL,
	FOREIGN KEY (`cuenta_id`) REFERENCES `cuenta`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deuda_id`) REFERENCES `deuda`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "regla_monto_positivo" CHECK("regla_recurrencia"."monto" > 0)
);
