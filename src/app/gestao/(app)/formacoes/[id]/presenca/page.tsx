import type { Metadata } from 'next';
import { CircleCheck, Info, Printer, Send, Undo2 } from 'lucide-react';
import { desfazerLancamento, lancarEncontro } from '@/lib/acoes/gestao';
import { exigirGestor } from '@/lib/auth/sessao';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';
import { dataCurta } from '@/lib/dominio/regras';
import { hojeISO } from '@/lib/dominio/datas';
import { carregarFormacao } from '../dados';
import { GradePresenca } from './GradePresenca';

export const metadata: Metadata = { title: 'Presença' };

export default async function Presenca({ params }: PageProps<'/gestao/formacoes/[id]/presenca'>) {
  const { id } = await params;
  const d = await carregarFormacao(id);
  const g = await exigirGestor();
  const proximo = d.encontros.find(e => !e.realizado);
  const futuro = proximo && proximo.data > hojeISO();

  return (
    <section className="cartao" aria-labelledby="t-pres">
      <div className="cartao-cabeca">
        <div className="pilha g6">
          <h2 id="t-pres" className="titulo-secao">
            Presença
          </h2>
          <p className="pequeno texto-3">
            {d.realizados} de {d.totalEncontros} encontros realizados. Clique em P ou F para corrigir.
          </p>
        </div>
        <div className="linha">
          {g.perfil === 'admin' && d.realizados > 0 ? (
            <FormAcao
              acao={desfazerLancamento}
              confirmar={`Desfazer o lançamento do encontro E${d.realizados}? As presenças e faltas dele serão apagadas e os certificados recalculados.`}
              rotuloConfirmar="Desfazer"
              perigo
            >
              <input type="hidden" name="formacaoId" value={id} />
              <BotaoEnviar className="botao botao-fantasma botao-pequeno" rotuloCarregando="Desfazendo…">
                <Undo2 size={15} aria-hidden="true" /> Desfazer E{d.realizados}
              </BotaoEnviar>
            </FormAcao>
          ) : null}
          {d.participantes.length ? (
            <a
              href={`/gestao/formacoes/${id}/lista-presenca`}
              className="botao botao-pequeno"
              target="_blank"
              rel="noopener"
            >
              <Printer size={15} aria-hidden="true" /> Imprimir lista
            </a>
          ) : null}
          {proximo ? (
            <FormAcao
              acao={lancarEncontro}
              confirmar={`Lançar o encontro E${proximo.ordem} (${dataCurta(proximo.data)}) com todos presentes? Depois você marca as faltas.`}
            >
              <input type="hidden" name="formacaoId" value={id} />
              <BotaoEnviar
                className="botao botao-primario botao-pequeno"
                disabled={Boolean(futuro) || !d.participantes.length}
                title={futuro ? 'Encontro agendado para uma data futura' : undefined}
                rotuloCarregando="Lançando…"
              >
                <Send size={15} aria-hidden="true" /> Lançar encontro E{proximo.ordem} · {dataCurta(proximo.data)}
              </BotaoEnviar>
            </FormAcao>
          ) : d.totalEncontros ? (
            <span className="chip chip-ok">
              <CircleCheck size={14} aria-hidden="true" /> Formação encerrada
            </span>
          ) : null}
        </div>
      </div>
      {futuro ? (
        <p className="aviso cartao-aviso">
          <Info size={18} aria-hidden="true" /> O próximo encontro (E{proximo.ordem}) está agendado para{' '}
          {dataCurta(proximo.data)} e só pode ser lançado a partir dessa data.
        </p>
      ) : null}
      {!d.totalEncontros ? (
        <p className="cartao-corpo texto-3">Cadastre os encontros na aba “Dados da formação”.</p>
      ) : !d.participantes.length ? (
        <p className="cartao-corpo texto-3">Vincule servidores na aba “Participantes” para lançar a presença.</p>
      ) : (
        <GradePresenca
          formacaoId={id}
          freqMinima={d.freqMinima}
          encontros={d.encontros.map(e => ({
            id: e.id,
            ordem: e.ordem,
            data: e.data,
            modulo: e.modulo,
            realizado: e.realizado
          }))}
          linhas={d.participantes.map(p => ({
            participacaoId: p.participacaoId,
            nome: p.nome,
            matricula: p.matricula,
            status: p.status,
            presencas: p.presencas
          }))}
        />
      )}
    </section>
  );
}
