ALTER TABLE "gestor" ADD COLUMN "usuario" text;--> statement-breakpoint
-- Contas que já existem: mesma regra do portal (nome.sobrenome, sem acento e sem "da/de/do/das/dos/e"; repetidos ganham 2, 3…).
WITH base AS (
	SELECT "id", "criado_em",
		array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(
			regexp_split_to_array(trim(regexp_replace(
				translate(lower("nome"), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'),
				'[^a-z]+', ' ', 'g')), ' '),
		'da'), 'de'), 'do'), 'das'), 'dos'), 'e') AS p
	FROM "gestor"
), nomes AS (
	SELECT "id", "criado_em",
		left(coalesce(nullif(p[1], ''), 'gestor'), 14)
		|| CASE WHEN cardinality(p) > 1 AND p[cardinality(p)] <> '' THEN '.' || left(p[cardinality(p)], 12) ELSE '' END AS u
	FROM base
), numerados AS (
	SELECT "id", u, row_number() OVER (PARTITION BY u ORDER BY "criado_em", "id") AS n FROM nomes
)
UPDATE "gestor" g
SET "usuario" = CASE WHEN numerados.n = 1 THEN left(numerados.u, 30) ELSE left(numerados.u, 30 - length(numerados.n::text)) || numerados.n END
FROM numerados
WHERE numerados."id" = g."id";--> statement-breakpoint
ALTER TABLE "gestor" ALTER COLUMN "usuario" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "gestor_usuario_uq" ON "gestor" USING btree ("usuario");
