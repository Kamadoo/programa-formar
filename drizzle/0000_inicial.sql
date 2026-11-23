CREATE TYPE "public"."finalidade_token" AS ENUM('primeiro_acesso', 'redefinir_senha');--> statement-breakpoint
CREATE TYPE "public"."perfil_gestor" AS ENUM('gestor_nucleo', 'admin');--> statement-breakpoint
CREATE TYPE "public"."status_formacao" AS ENUM('planejada', 'em_andamento', 'encerrada');--> statement-breakpoint
CREATE TYPE "public"."status_participacao" AS ENUM('em_andamento', 'liberado_auto', 'em_conferencia', 'liberado_validado', 'recusado');--> statement-breakpoint
CREATE TYPE "public"."tipo_sessao" AS ENUM('gestor', 'servidor');--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"em" timestamp with time zone DEFAULT now() NOT NULL,
	"ator_tipo" text NOT NULL,
	"ator_id" uuid,
	"acao" text NOT NULL,
	"entidade" text NOT NULL,
	"entidade_id" text,
	"detalhes" jsonb
);
--> statement-breakpoint
CREATE TABLE "certificado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participacao_id" uuid NOT NULL,
	"codigo_validacao" text NOT NULL,
	"carga_cumprida_h" integer NOT NULL,
	"frequencia_pct" integer NOT NULL,
	"data_emissao" date NOT NULL,
	"emitido_em" timestamp with time zone DEFAULT now() NOT NULL,
	"revogado_em" timestamp with time zone,
	"motivo_revogacao" text
);
--> statement-breakpoint
CREATE TABLE "email_saida" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"para" text NOT NULL,
	"assunto" text NOT NULL,
	"texto" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"enviado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "encontro" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formacao_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"data" date NOT NULL,
	"modulo" text NOT NULL,
	"realizado" boolean DEFAULT false NOT NULL,
	"lancado_por" uuid,
	"lancado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "formacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"titulo" text NOT NULL,
	"titulo_curto" text NOT NULL,
	"programa_eixo" text NOT NULL,
	"formador" text NOT NULL,
	"local" text NOT NULL,
	"carga_presencial_h" integer NOT NULL,
	"carga_estudo_h" integer DEFAULT 0 NOT NULL,
	"freq_minima" numeric(3, 2) DEFAULT '0.80' NOT NULL,
	"conteudo_programatico" text DEFAULT '' NOT NULL,
	"prefixo_codigo" text NOT NULL,
	"modelo_certificado_id" uuid,
	"status" "status_formacao" DEFAULT 'planejada' NOT NULL,
	"criado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formacao_cargas_ck" CHECK ("formacao"."carga_presencial_h" >= 0 and "formacao"."carga_estudo_h" >= 0),
	CONSTRAINT "formacao_prefixo_ck" CHECK ("formacao"."prefixo_codigo" ~ '^[A-Z0-9]{2,12}$')
);
--> statement-breakpoint
CREATE TABLE "gestor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"perfil" "perfil_gestor" DEFAULT 'gestor_nucleo' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ultimo_login_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modelo_certificado" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"assinaturas" jsonb NOT NULL,
	"cidade" text DEFAULT 'Serra Clara' NOT NULL,
	"em_uso" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formacao_id" uuid NOT NULL,
	"servidor_id" uuid NOT NULL,
	"vinculado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"vinculado_por" uuid,
	"status" "status_participacao" DEFAULT 'em_andamento' NOT NULL,
	"decidido_por" uuid,
	"decidido_em" timestamp with time zone,
	"motivo_recusa" text
);
--> statement-breakpoint
CREATE TABLE "presenca" (
	"participacao_id" uuid NOT NULL,
	"encontro_id" uuid NOT NULL,
	"presente" boolean NOT NULL,
	"lancado_por" uuid,
	"lancado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "presenca_participacao_id_encontro_id_pk" PRIMARY KEY("participacao_id","encontro_id")
);
--> statement-breakpoint
CREATE TABLE "servidor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome_completo" text NOT NULL,
	"nome_busca" text NOT NULL,
	"cpf_hash" text NOT NULL,
	"cpf_cifrado" text NOT NULL,
	"cpf_mascara" text NOT NULL,
	"matricula" text NOT NULL,
	"email_institucional" text NOT NULL,
	"funcao" text,
	"lotacao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessao" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"tipo" "tipo_sessao" NOT NULL,
	"usuario_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"ultimo_uso_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativa_login" (
	"chave" text PRIMARY KEY NOT NULL,
	"falhas" integer DEFAULT 0 NOT NULL,
	"janela_inicio" timestamp with time zone DEFAULT now() NOT NULL,
	"bloqueado_ate" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "token_acesso" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"servidor_id" uuid NOT NULL,
	"finalidade" "finalidade_token" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado_em" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "usuario_portal" (
	"servidor_id" uuid PRIMARY KEY NOT NULL,
	"senha_hash" text,
	"liberado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"primeiro_acesso_em" timestamp with time zone,
	"ultimo_login_em" timestamp with time zone,
	"senha_alterada_em" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "certificado" ADD CONSTRAINT "certificado_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encontro" ADD CONSTRAINT "encontro_formacao_id_formacao_id_fk" FOREIGN KEY ("formacao_id") REFERENCES "public"."formacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "encontro" ADD CONSTRAINT "encontro_lancado_por_gestor_id_fk" FOREIGN KEY ("lancado_por") REFERENCES "public"."gestor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formacao" ADD CONSTRAINT "formacao_modelo_certificado_id_modelo_certificado_id_fk" FOREIGN KEY ("modelo_certificado_id") REFERENCES "public"."modelo_certificado"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formacao" ADD CONSTRAINT "formacao_criado_por_gestor_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."gestor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_formacao_id_formacao_id_fk" FOREIGN KEY ("formacao_id") REFERENCES "public"."formacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_servidor_id_servidor_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_vinculado_por_gestor_id_fk" FOREIGN KEY ("vinculado_por") REFERENCES "public"."gestor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participacao" ADD CONSTRAINT "participacao_decidido_por_gestor_id_fk" FOREIGN KEY ("decidido_por") REFERENCES "public"."gestor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_participacao_id_participacao_id_fk" FOREIGN KEY ("participacao_id") REFERENCES "public"."participacao"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_encontro_id_encontro_id_fk" FOREIGN KEY ("encontro_id") REFERENCES "public"."encontro"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "presenca" ADD CONSTRAINT "presenca_lancado_por_gestor_id_fk" FOREIGN KEY ("lancado_por") REFERENCES "public"."gestor"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_acesso" ADD CONSTRAINT "token_acesso_servidor_id_servidor_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_portal" ADD CONSTRAINT "usuario_portal_servidor_id_servidor_id_fk" FOREIGN KEY ("servidor_id") REFERENCES "public"."servidor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_em_idx" ON "auditoria" USING btree ("em");--> statement-breakpoint
CREATE INDEX "auditoria_entidade_idx" ON "auditoria" USING btree ("entidade","entidade_id");--> statement-breakpoint
CREATE UNIQUE INDEX "certificado_codigo_uq" ON "certificado" USING btree ("codigo_validacao");--> statement-breakpoint
CREATE INDEX "certificado_participacao_idx" ON "certificado" USING btree ("participacao_id");--> statement-breakpoint
CREATE UNIQUE INDEX "encontro_ordem_uq" ON "encontro" USING btree ("formacao_id","ordem");--> statement-breakpoint
CREATE UNIQUE INDEX "gestor_email_uq" ON "gestor" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "participacao_uq" ON "participacao" USING btree ("formacao_id","servidor_id");--> statement-breakpoint
CREATE INDEX "participacao_servidor_idx" ON "participacao" USING btree ("servidor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "servidor_cpf_hash_uq" ON "servidor" USING btree ("cpf_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "servidor_matricula_uq" ON "servidor" USING btree ("matricula");--> statement-breakpoint
CREATE INDEX "servidor_nome_busca_idx" ON "servidor" USING btree ("nome_busca");--> statement-breakpoint
CREATE INDEX "sessao_usuario_idx" ON "sessao" USING btree ("tipo","usuario_id");