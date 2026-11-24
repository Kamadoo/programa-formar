ALTER TABLE "formacao" ALTER COLUMN "freq_minima" SET DEFAULT '0.75';--> statement-breakpoint
ALTER TABLE "encontro" ADD COLUMN "topico" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "encontro" ADD COLUMN "carga_h" numeric(5, 1);--> statement-breakpoint
-- Nova regra: 75% libera automaticamente (antes 80%).
UPDATE "formacao" SET "freq_minima" = '0.75' WHERE "freq_minima" = '0.80';--> statement-breakpoint
-- "Números · fundamentos" passa a ser módulo "Números" + tópico "fundamentos".
UPDATE "encontro" SET "topico" = btrim(substr("modulo", strpos("modulo", ' · ') + 3)), "modulo" = btrim(substr("modulo", 1, strpos("modulo", ' · ') - 1)) WHERE strpos("modulo", ' · ') > 1;
