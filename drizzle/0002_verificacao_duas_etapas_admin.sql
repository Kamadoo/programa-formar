CREATE TYPE "public"."etapa_sessao" AS ENUM('senha', 'completa');--> statement-breakpoint
CREATE TABLE "codigo_recuperacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gestor_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "token_gestor" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"gestor_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "totp_segredo" text;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "totp_pendente" text;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "totp_ativado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "totp_ultimo_passo" integer;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "senha_alterada_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "criado_por" uuid;--> statement-breakpoint
ALTER TABLE "servidor" ADD COLUMN "importado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sessao" ADD COLUMN "etapa" "etapa_sessao" DEFAULT 'completa' NOT NULL;--> statement-breakpoint
ALTER TABLE "codigo_recuperacao" ADD CONSTRAINT "codigo_recuperacao_gestor_id_gestor_id_fk" FOREIGN KEY ("gestor_id") REFERENCES "public"."gestor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_gestor" ADD CONSTRAINT "token_gestor_gestor_id_gestor_id_fk" FOREIGN KEY ("gestor_id") REFERENCES "public"."gestor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigo_recuperacao_gestor_idx" ON "codigo_recuperacao" USING btree ("gestor_id");--> statement-breakpoint
-- Sessões de gestão abertas antes da verificação em duas etapas deixam de valer.
DELETE FROM "sessao" WHERE "tipo" = 'gestor';
