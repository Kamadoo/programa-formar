CREATE TABLE "convite_servidor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"servidor_id" uuid NOT NULL,
	"enviado_por" uuid,
	"email_id" uuid,
	"reenvio" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "convite_servidor" ADD CONSTRAINT "convite_servidor_servidor_id_servidor_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "convite_servidor" ADD CONSTRAINT "convite_servidor_enviado_por_gestor_id_fk" FOREIGN KEY ("enviado_por") REFERENCES "public"."gestor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "convite_servidor_idx" ON "convite_servidor" USING btree ("servidor_id","criado_em");--> statement-breakpoint
ALTER TABLE "convite_servidor" ENABLE ROW LEVEL SECURITY;