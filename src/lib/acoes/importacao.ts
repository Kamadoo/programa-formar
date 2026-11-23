'use server';

import { revalidatePath } from 'next/cache';
import { auditar } from '@/lib/auditoria';
import { exigirAdmin } from '@/lib/auth/sessao';
import { aplicarImportacao, analisarArquivo, type LinhaPrevia } from '@/lib/dominio/importacao';

export type ResultadoImportacao = {
  ok: boolean;
  mensagem: string;
  t: number;
  etapa: 'previa' | 'concluida' | 'erro';
  arquivo?: string;
  resumo?: { novos: number; atualizar: number; iguais: number; erros: number; avisos: number };
  linhas?: LinhaPrevia[];
} | null;

const erro = (mensagem: string): ResultadoImportacao => ({ ok: false, mensagem, t: Date.now(), etapa: 'erro' });

/** Analisa a planilha (modo "previa") ou grava (modo "importar"). O arquivo é reenviado no segundo passo. */
export async function processarPlanilha(_: ResultadoImportacao, form: FormData): Promise<ResultadoImportacao> {
  const adm = await exigirAdmin();
  const arquivo = form.get('arquivo');
  if (!(arquivo instanceof File) || !arquivo.size) return erro('Escolha a planilha.');
  let analise;
  try {
    analise = await analisarArquivo(arquivo);
  } catch (e) {
    return erro('Não foi possível ler a planilha: ' + (e instanceof Error ? e.message : 'arquivo inválido.'));
  }
  const conta = (sit: LinhaPrevia['situacao']) => analise.linhas.filter(l => l.situacao === sit).length;
  const resumo = {
    novos: conta('novo'),
    atualizar: conta('atualizar'),
    iguais: conta('igual'),
    erros: conta('erro'),
    avisos: analise.linhas.filter(l => l.aviso).length
  };

  if (form.get('modo') !== 'importar') {
    return {
      ok: true,
      mensagem: 'Planilha conferida. Revise e confirme a importação.',
      t: Date.now(),
      etapa: 'previa',
      arquivo: analise.arquivo,
      resumo,
      linhas: analise.linhas
    };
  }

  if (!resumo.novos && !resumo.atualizar)
    return erro('Nada para importar: todas as linhas já estão iguais na base ou têm erro.');
  const r = await aplicarImportacao(analise);
  await auditar({
    atorTipo: 'gestor',
    atorId: adm.id,
    acao: 'importar_servidores',
    entidade: 'servidor',
    detalhes: { arquivo: analise.arquivo, novos: r.novos, atualizados: r.atualizados, ignoradosComErro: resumo.erros }
  });
  revalidatePath('/gestao/admin/servidores');
  return {
    ok: true,
    mensagem: `Importação concluída: ${r.novos} novo(s) e ${r.atualizados} atualizado(s).${resumo.erros ? ` ${resumo.erros} linha(s) com erro ficaram de fora.` : ''}`,
    t: Date.now(),
    etapa: 'concluida',
    resumo
  };
}
