ALTER TABLE "gestor" ADD COLUMN "documento_tipo" text;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "documento_hash" text;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "documento_cifrado" text;--> statement-breakpoint
ALTER TABLE "gestor" ADD COLUMN "primeiro_acesso_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "token_gestor" ADD COLUMN "tipo" text DEFAULT 'link' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "gestor_documento_uq" ON "gestor" USING btree ("documento_hash");;--> statement-breakpoint
ALTER TABLE "gestor" ADD CONSTRAINT "gestor_documento_tipo_ck" CHECK ("documento_tipo" IS NULL OR "documento_tipo" IN ('cpf', 'cnpj'));--> statement-breakpoint
-- Contas que já definiram a senha contam como primeiro acesso concluído.
UPDATE "gestor" SET "primeiro_acesso_em" = "senha_alterada_em" WHERE "senha_alterada_em" IS NOT NULL;
