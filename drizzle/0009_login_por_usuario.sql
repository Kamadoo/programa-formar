CREATE TABLE "codigo_recuperacao_servidor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servidor_id" uuid NOT NULL,
	"hash" text NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "usuario_portal" ADD COLUMN "usuario" text;--> statement-breakpoint
ALTER TABLE "usuario_portal" ADD COLUMN "totp_segredo" text;--> statement-breakpoint
ALTER TABLE "usuario_portal" ADD COLUMN "totp_pendente" text;--> statement-breakpoint
ALTER TABLE "usuario_portal" ADD COLUMN "totp_ativado_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "usuario_portal" ADD COLUMN "totp_ultimo_passo" integer;--> statement-breakpoint
ALTER TABLE "codigo_recuperacao_servidor" ADD CONSTRAINT "codigo_recuperacao_servidor_servidor_id_servidor_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "codigo_recuperacao_servidor_idx" ON "codigo_recuperacao_servidor" USING btree ("servidor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuario_portal_usuario_uq" ON "usuario_portal" USING btree ("usuario");--> statement-breakpoint
ALTER TABLE "codigo_recuperacao_servidor" ENABLE ROW LEVEL SECURITY;