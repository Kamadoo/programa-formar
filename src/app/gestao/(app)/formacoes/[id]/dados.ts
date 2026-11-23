import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { obterFormacao } from '@/lib/dominio/servico';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Carrega a formação uma vez por requisição (layout e página compartilham). */
export const carregarFormacao = cache(async (id: string) => {
  if (!UUID.test(id)) notFound();
  const det = await obterFormacao(id);
  if (!det) notFound();
  return det;
});
