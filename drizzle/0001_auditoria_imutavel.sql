-- A auditoria é só de inclusão: ninguém altera nem apaga registros, nem a própria aplicação.
CREATE OR REPLACE FUNCTION auditoria_bloqueia_alteracao() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'A auditoria não pode ser alterada nem apagada';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER auditoria_imutavel
  BEFORE UPDATE OR DELETE ON auditoria
  FOR EACH ROW EXECUTE FUNCTION auditoria_bloqueia_alteracao();
--> statement-breakpoint
-- Um certificado ativo por participação.
CREATE UNIQUE INDEX certificado_ativo_uq ON certificado (participacao_id) WHERE revogado_em IS NULL;
