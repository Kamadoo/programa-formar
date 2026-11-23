ALTER TABLE "email_saida" ADD COLUMN "tentativas" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "email_saida" ADD COLUMN "proxima_tentativa_em" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "email_saida" ADD COLUMN "ultimo_erro" text;--> statement-breakpoint
ALTER TABLE "email_saida" ADD COLUMN "desistiu_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_saida" ADD COLUMN "id_provedor" text;