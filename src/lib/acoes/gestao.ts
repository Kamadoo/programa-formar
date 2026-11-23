'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { falha, sucesso, type Resultado } from '@/lib/acao';
import { exigirAdmin, exigirGestor } from '@/lib/auth/sessao';
import { hashCpf } from '@/lib/cripto';
import { dataBR, somenteDigitos } from '@/lib/dominio/regras';
import {
  adicionarEncontro,
  atualizarFormacao,
  buscarServidores,
  criarFormacao,
  decidirConferencia,
  definirPresenca,
  desfazerUltimoLancamento,
  desvincularServidor,
  editarEncontro,
  excluirFormacao,
  ErroNegocio,
  lancarProximoEncontro,
  removerEncontro,
  vincularServidor
} from '@/lib/dominio/servico';

const uuid = z.string().uuid();

/** Executa a operação e transforma erros de negócio em mensagem para a tela. */
async function tratar(fn: () => Promise<Resultado>): Promise<Resultado> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ErroNegocio) return falha(e.message);
    console.error(e);
    return falha('Não foi possível concluir agora. Tente de novo em instantes.');
  }
}

function revalidarFormacao(id: string) {
  revalidatePath('/gestao', 'layout');
  revalidatePath(`/gestao/formacoes/${id}`, 'layout');
}

/* ---------- Formação ---------- */

const texto = (max: number, rotulo: string) =>
  z.string().trim().min(1, `Informe ${rotulo}.`).max(max, `Use no máximo ${max} caracteres.`);
const horas = z.coerce
  .number({ message: 'Informe um número.' })
  .int('Use horas inteiras.')
  .min(0, 'Não pode ser negativo.')
  .max(2000, 'Valor muito alto.');

const esquemaFormacao = z.object({
  titulo: texto(200, 'o nome da formação'),
  tituloCurto: z
    .string()
    .trim()
    .min(2, 'Informe um nome curto.')
    .max(40, 'Use no máximo 40 caracteres.')
    .regex(/^[\p{L}\p{N} ]+$/u, 'Use só letras, números e espaços.'),
  programaEixo: texto(160, 'o programa ou eixo'),
  formador: texto(160, 'o(a) formador(a)'),
  local: texto(160, 'o local'),
  cargaPresencialH: horas,
  cargaEstudoH: horas,
  conteudoProgramatico: z.string().max(6000, 'Conteúdo muito longo.').default(''),
  prefixoCodigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,12}$/, 'De 2 a 12 letras ou números, sem espaços.')
});

export async function salvarFormacao(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const id = form.get('id');
  const p = esquemaFormacao.safeParse(Object.fromEntries(form));
  if (!p.success) {
    const erros: Record<string, string> = {};
    for (const i of p.error.issues) erros[String(i.path[0])] ??= i.message;
    return falha('Confira os campos destacados.', erros);
  }
  if (p.data.cargaPresencialH + p.data.cargaEstudoH === 0) {
    return falha('A carga total precisa ser maior que zero.', { cargaPresencialH: 'Informe a carga horária.' });
  }
  if (typeof id === 'string' && id) {
    if (!uuid.safeParse(id).success) return falha('Formação inválida.');
    return tratar(async () => {
      await atualizarFormacao(id, p.data, g.id);
      revalidarFormacao(id);
      return sucesso('Formação salva.');
    });
  }
  let novoId = '';
  const r = await tratar(async () => {
    novoId = await criarFormacao(p.data, g.id);
    return sucesso('Formação criada.');
  });
  if (!r?.ok) return r;
  revalidatePath('/gestao', 'layout');
  redirect(`/gestao/formacoes/${novoId}?criada=1`);
}

const esquemaEncontro = z.object({
  formacaoId: uuid,
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Informe a data.'),
  modulo: texto(160, 'o módulo')
});

export async function novoEncontro(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const p = esquemaEncontro.safeParse(Object.fromEntries(form));
  if (!p.success) {
    const erros: Record<string, string> = {};
    for (const i of p.error.issues) erros[String(i.path[0])] ??= i.message;
    return falha('Confira a data e o módulo.', erros);
  }
  return tratar(async () => {
    await adicionarEncontro(p.data.formacaoId, p.data.data, p.data.modulo, g.id);
    revalidarFormacao(p.data.formacaoId);
    return sucesso(`Encontro de ${dataBR(p.data.data)} adicionado.`);
  });
}

export async function excluirEncontro(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const f = uuid.safeParse(form.get('formacaoId'));
  const e = uuid.safeParse(form.get('encontroId'));
  if (!f.success || !e.success) return falha('Encontro inválido.');
  return tratar(async () => {
    await removerEncontro(f.data, e.data, g.id);
    revalidarFormacao(f.data);
    return sucesso('Encontro removido.');
  });
}

/* ---------- Participantes ---------- */

export type ServidorEncontrado = {
  id: string;
  nome: string;
  cpfMascara: string;
  matricula: string;
  email: string;
  funcao: string | null;
  lotacao: string | null;
};

export async function pesquisarServidores(formacaoId: string, q: string): Promise<ServidorEncontrado[]> {
  await exigirGestor();
  if (!uuid.safeParse(formacaoId).success) return [];
  const termo = String(q ?? '')
    .trim()
    .slice(0, 80);
  if (termo.length < 2) return [];
  const dig = somenteDigitos(termo);
  return buscarServidores(termo, formacaoId, dig.length === 11 ? hashCpf(dig) : null);
}

export async function vincular(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const f = uuid.safeParse(form.get('formacaoId'));
  const sv = uuid.safeParse(form.get('servidorId'));
  if (!f.success || !sv.success) return falha('Dados inválidos.');
  return tratar(async () => {
    const nome = await vincularServidor(f.data, sv.data, g.id);
    revalidarFormacao(f.data);
    return sucesso(`${nome} vinculado(a). O acesso ao portal foi liberado e o aviso foi para o e-mail institucional.`);
  });
}

export async function desvincular(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const f = uuid.safeParse(form.get('formacaoId'));
  const p = uuid.safeParse(form.get('participacaoId'));
  if (!f.success || !p.success) return falha('Dados inválidos.');
  return tratar(async () => {
    const nome = await desvincularServidor(f.data, p.data, g.id);
    revalidarFormacao(f.data);
    return sucesso(`${nome} foi removido(a) desta formação.`);
  });
}

/* ---------- Presença ---------- */

export async function lancarEncontro(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const f = uuid.safeParse(form.get('formacaoId'));
  if (!f.success) return falha('Formação inválida.');
  return tratar(async () => {
    const ordem = await lancarProximoEncontro(f.data, g.id);
    revalidarFormacao(f.data);
    return sucesso(`Encontro E${ordem} lançado com todos presentes. Clique nas células para marcar as faltas.`);
  });
}

export async function alternarPresenca(
  formacaoId: string,
  participacaoId: string,
  encontroId: string,
  presente: boolean
): Promise<Resultado> {
  const g = await exigirGestor();
  if (![formacaoId, participacaoId, encontroId].every(x => uuid.safeParse(x).success)) return falha('Dados inválidos.');
  return tratar(async () => {
    await definirPresenca(formacaoId, participacaoId, encontroId, Boolean(presente), g.id);
    revalidarFormacao(formacaoId);
    return sucesso(presente ? 'Presença registrada.' : 'Falta registrada.');
  });
}

/* ---------- Conferência ---------- */

export async function decidir(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const p = uuid.safeParse(form.get('participacaoId'));
  const decisao = form.get('decisao');
  if (!p.success || (decisao !== 'validar' && decisao !== 'recusar')) return falha('Dados inválidos.');
  const motivo = String(form.get('motivo') ?? '')
    .trim()
    .slice(0, 500);
  return tratar(async () => {
    const nome = await decidirConferencia(p.data, decisao, motivo || null, g.id);
    revalidatePath('/gestao', 'layout');
    return sucesso(
      decisao === 'validar'
        ? `Certificado de ${nome} validado e liberado no portal.`
        : `Emissão recusada para ${nome}. O servidor verá a situação no portal.`
    );
  });
}

/* ---------- Correções ---------- */

export async function alterarEncontro(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirGestor();
  const ids = z.object({ formacaoId: uuid, encontroId: uuid }).safeParse(Object.fromEntries(form));
  const p = esquemaEncontro.safeParse(Object.fromEntries(form));
  if (!ids.success || !p.success) return falha('Confira a data e o módulo.');
  return tratar(async () => {
    await editarEncontro(ids.data.formacaoId, ids.data.encontroId, p.data.data, p.data.modulo, g);
    revalidarFormacao(ids.data.formacaoId);
    return sucesso('Encontro atualizado.');
  });
}

export async function desfazerLancamento(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirAdmin();
  const f = uuid.safeParse(form.get('formacaoId'));
  if (!f.success) return falha('Formação inválida.');
  return tratar(async () => {
    const ordem = await desfazerUltimoLancamento(f.data, g.id);
    revalidarFormacao(f.data);
    return sucesso(`Lançamento do encontro E${ordem} desfeito. Ele voltou a ficar agendado.`);
  });
}

export async function apagarFormacao(_: Resultado, form: FormData): Promise<Resultado> {
  const g = await exigirAdmin();
  const f = uuid.safeParse(form.get('formacaoId'));
  if (!f.success) return falha('Formação inválida.');
  let titulo = '';
  const r = await tratar(async () => {
    titulo = await excluirFormacao(f.data, g.id);
    return sucesso('Formação excluída.');
  });
  if (!r?.ok) return r;
  revalidatePath('/gestao', 'layout');
  redirect(`/gestao/formacoes?excluida=${encodeURIComponent(titulo.slice(0, 80))}`);
}
