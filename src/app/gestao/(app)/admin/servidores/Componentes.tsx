'use client';

import { startTransition, useActionState, useRef, useState } from 'react';
import { FileSpreadsheet, Loader2, Settings2, Upload, X } from 'lucide-react';
import { alternarServidor, editarServidor, zerarAcessoPortal } from '@/lib/acoes/admin';
import { processarPlanilha, type ResultadoImportacao } from '@/lib/acoes/importacao';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';
import { useAvisar } from '@/components/Avisos';

export function AlternarServidor({ id, nome, ativo }: { id: string; nome: string; ativo: boolean }) {
  return (
    <FormAcao
      acao={alternarServidor}
      confirmar={
        ativo ? `Desativar ${nome}? A pessoa perde o acesso ao portal e some da busca de vínculo.` : `Reativar ${nome}?`
      }
      rotuloConfirmar={ativo ? 'Desativar' : 'Reativar'}
      perigo={ativo}
    >
      <input type="hidden" name="servidorId" value={id} />
      <input type="hidden" name="ativo" value={ativo ? '0' : '1'} />
      <BotaoEnviar
        className="botao botao-fantasma botao-pequeno"
        aria-label={`${ativo ? 'Desativar' : 'Reativar'} ${nome}`}
      >
        {ativo ? 'Desativar' : 'Reativar'}
      </BotaoEnviar>
    </FormAcao>
  );
}

/** Para quem perdeu o celular e os códigos de recuperação: refaz o primeiro acesso. */
export function ZerarAcesso({ id, nome }: { id: string; nome: string }) {
  return (
    <FormAcao
      acao={zerarAcessoPortal}
      confirmar={`Zerar o acesso de ${nome} ao portal? A senha e o aplicativo autenticador deixam de valer e a pessoa recebe um e-mail para refazer o primeiro acesso (com CPF e código). Use só depois de confirmar que é mesmo a pessoa pedindo.`}
      rotuloConfirmar="Zerar acesso"
      perigo
    >
      <input type="hidden" name="servidorId" value={id} />
      <BotaoEnviar className="botao botao-fantasma botao-pequeno" aria-label={`Zerar o acesso de ${nome} ao portal`}>
        Zerar acesso
      </BotaoEnviar>
    </FormAcao>
  );
}

export type DadosServidor = {
  id: string;
  nome: string;
  cpf: string;
  matricula: string;
  email: string;
  funcao: string | null;
  lotacao: string | null;
  ativo: boolean;
  temAcesso: boolean;
  atualizado: string;
};

function Campo({
  id,
  nome,
  rotulo,
  erro,
  dica,
  className,
  ...resto
}: {
  id: string;
  nome: string;
  rotulo: string;
  erro?: string;
  dica?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const desc = [erro ? `${id}-e` : null, dica ? `${id}-d` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`campo ${className ?? ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      <input id={id} name={nome} className="entrada" aria-invalid={Boolean(erro)} aria-describedby={desc} {...resto} />
      {dica ? (
        <span id={`${id}-d`} className="dica">
          {dica}
        </span>
      ) : null}
      {erro ? (
        <span id={`${id}-e`} className="erro-campo">
          {erro}
        </span>
      ) : null}
    </div>
  );
}

/** Editar dados, zerar o acesso e desativar — numa caixa de diálogo, para a tabela caber na tela. */
export function GerenciarServidor({ sv }: { sv: DadosServidor }) {
  const ref = useRef<HTMLDialogElement>(null);
  const p = `sv-${sv.id}`;
  return (
    <>
      <button
        type="button"
        className="botao botao-pequeno"
        onClick={() => ref.current?.showModal()}
        aria-label={`Gerenciar ${sv.nome}`}
      >
        <Settings2 size={15} aria-hidden="true" /> Gerenciar
      </button>
      <dialog ref={ref} className="dialogo dialogo-largo" aria-labelledby={`${p}-t`}>
        <div className="pilha g18">
          <div className="linha entre">
            <div className="pilha g6">
              <h2 id={`${p}-t`} className="titulo-secao">
                {sv.nome}
              </h2>
              <span className="pequeno texto-3">Atualizado em {sv.atualizado}</span>
            </div>
            <button
              type="button"
              className="botao botao-fantasma botao-icone"
              onClick={() => ref.current?.close()}
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <FormAcao acao={editarServidor} rotulo={`Editar dados de ${sv.nome}`} className="pilha g14">
            {r => (
              <>
                <input type="hidden" name="servidorId" value={sv.id} />
                <div className="grade-form">
                  <Campo
                    id={`${p}-nome`}
                    nome="nome"
                    rotulo="Nome completo"
                    className="c6"
                    defaultValue={sv.nome}
                    required
                    maxLength={160}
                    autoComplete="off"
                    erro={r?.erros?.nome}
                  />
                  <Campo
                    id={`${p}-email`}
                    nome="email"
                    rotulo="E-mail institucional"
                    type="email"
                    className="c6"
                    defaultValue={sv.email}
                    required
                    maxLength={160}
                    autoComplete="off"
                    erro={r?.erros?.email}
                    dica="Se mudar, o endereço antigo recebe um aviso e os códigos já enviados deixam de valer."
                  />
                  <Campo
                    id={`${p}-mat`}
                    nome="matricula"
                    rotulo="Matrícula"
                    className="c3"
                    defaultValue={sv.matricula}
                    required
                    inputMode="numeric"
                    maxLength={12}
                    autoComplete="off"
                    erro={r?.erros?.matricula}
                  />
                  <Campo
                    id={`${p}-cpf`}
                    nome="cpf"
                    rotulo="Corrigir CPF"
                    className="c3"
                    inputMode="numeric"
                    maxLength={14}
                    autoComplete="off"
                    placeholder={sv.cpf}
                    erro={r?.erros?.cpf}
                    dica="Deixe em branco para manter."
                  />
                  <Campo
                    id={`${p}-fun`}
                    nome="funcao"
                    rotulo="Função (opcional)"
                    className="c3"
                    defaultValue={sv.funcao ?? ''}
                    maxLength={160}
                    autoComplete="off"
                    erro={r?.erros?.funcao}
                  />
                  <Campo
                    id={`${p}-lot`}
                    nome="lotacao"
                    rotulo="Lotação (opcional)"
                    className="c3"
                    defaultValue={sv.lotacao ?? ''}
                    maxLength={160}
                    autoComplete="off"
                    erro={r?.erros?.lotacao}
                  />
                </div>
                <div className="linha">
                  <BotaoEnviar className="botao botao-primario" rotuloCarregando="Salvando…">
                    Salvar alterações
                  </BotaoEnviar>
                </div>
              </>
            )}
          </FormAcao>
          <div className="linha g10 separador-topo">
            {sv.temAcesso ? <ZerarAcesso id={sv.id} nome={sv.nome} /> : null}
            <AlternarServidor id={sv.id} nome={sv.nome} ativo={sv.ativo} />
          </div>
        </div>
      </dialog>
    </>
  );
}

const SITUACAO: Record<string, [string, string]> = {
  novo: ['Novo', 'chip-info'],
  atualizar: ['Atualizar', 'chip-alerta'],
  igual: ['Sem mudança', ''],
  erro: ['Erro', 'chip-erro']
};

export function ImportarPlanilha() {
  const avisar = useAvisar();
  const [r, enviar, processando] = useActionState(async (a: ResultadoImportacao, f: FormData) => {
    const res = await processarPlanilha(a, f);
    if (res && res.etapa !== 'previa') avisar?.(res);
    return res;
  }, null);
  const [filtro, setFiltro] = useState<'todas' | 'erro' | 'mudancas'>('todas');
  // O React limpa os campos do formulário depois de cada ação; por isso o arquivo fica guardado aqui
  // e é reenviado no passo "importar".
  const arquivo = useRef<File | null>(null);
  const [ultimoModo, setUltimoModo] = useState<'previa' | 'importar'>('previa');

  function mandar(modo: 'previa' | 'importar') {
    if (!arquivo.current) return;
    const fd = new FormData();
    fd.set('arquivo', arquivo.current);
    fd.set('modo', modo);
    setUltimoModo(modo);
    startTransition(() => enviar(fd));
  }

  const linhas = r?.linhas ?? [];
  const visiveis =
    filtro === 'erro'
      ? linhas.filter(l => l.situacao === 'erro')
      : filtro === 'mudancas'
        ? linhas.filter(l => l.situacao === 'novo' || l.situacao === 'atualizar')
        : linhas;

  return (
    <section className="cartao" aria-labelledby="t-import">
      <div className="cartao-corpo pilha g14">
        <div className="pilha g6">
          <h2 id="t-import" className="titulo-secao">
            Importar servidores em lote
          </h2>
          <p className="pequeno texto-3">
            Planilha .xlsx ou .csv com as colunas Nome completo, CPF, Matrícula e E-mail institucional (Função e Lotação
            são opcionais). Quem já está na base (mesmo CPF) é atualizado; ninguém é apagado.
          </p>
        </div>
        <div className="linha">
          <label className="botao" htmlFor="arquivo">
            <FileSpreadsheet size={16} aria-hidden="true" /> Escolher planilha
          </label>
          <input
            id="arquivo"
            name="arquivo"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="sr-only"
            onChange={e => {
              arquivo.current = e.target.files?.[0] ?? null;
              e.target.value = '';
              setFiltro('todas');
              mandar('previa');
            }}
          />
          <span className="pequeno texto-3" aria-live="polite">
            {processando && ultimoModo === 'previa'
              ? 'Conferindo a planilha…'
              : r?.arquivo
                ? `Arquivo: ${r.arquivo}`
                : 'Nenhum arquivo escolhido'}
          </span>
        </div>
        {r && !r.ok ? (
          <p className="aviso aviso-erro" role="alert">
            {r.mensagem}
          </p>
        ) : null}

        {r?.etapa === 'previa' && r.resumo ? (
          <div className="pilha g14">
            <dl className="resumo-import">
              <div>
                <dt>Novos</dt>
                <dd>{r.resumo.novos}</dd>
              </div>
              <div>
                <dt>Atualizar</dt>
                <dd>{r.resumo.atualizar}</dd>
              </div>
              <div>
                <dt>Sem mudança</dt>
                <dd>{r.resumo.iguais}</dd>
              </div>
              <div className={r.resumo.erros ? 'com-erro' : ''}>
                <dt>Com erro</dt>
                <dd>{r.resumo.erros}</dd>
              </div>
            </dl>
            {r.resumo.avisos ? (
              <p className="aviso aviso-alerta pequeno">
                {r.resumo.avisos} linha(s) com e-mail fora do domínio institucional. Confira antes de importar.
              </p>
            ) : null}
            <div className="linha entre">
              <div className="segmentado" role="group" aria-label="Mostrar linhas">
                <button type="button" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>
                  Todas
                </button>
                <button type="button" aria-pressed={filtro === 'mudancas'} onClick={() => setFiltro('mudancas')}>
                  Novos e atualizações
                </button>
                <button type="button" aria-pressed={filtro === 'erro'} onClick={() => setFiltro('erro')}>
                  Erros
                </button>
              </div>
              <button
                type="button"
                className="botao botao-primario"
                disabled={processando || (!r.resumo.novos && !r.resumo.atualizar)}
                aria-busy={processando}
                onClick={() => mandar('importar')}
              >
                {processando && ultimoModo === 'importar' ? (
                  <>
                    <Loader2 size={16} className="girando" aria-hidden="true" /> Importando…
                  </>
                ) : (
                  <>
                    <Upload size={16} aria-hidden="true" /> Importar {r.resumo.novos + r.resumo.atualizar} servidor(es)
                  </>
                )}
              </button>
            </div>
            <div
              className="tabela-rolagem previa-import"
              tabIndex={0}
              role="region"
              aria-label="Prévia das linhas da planilha"
            >
              <table className="tabela">
                <thead>
                  <tr>
                    <th scope="col">Linha</th>
                    <th scope="col">Nome</th>
                    <th scope="col">CPF</th>
                    <th scope="col">Matrícula</th>
                    <th scope="col">E-mail</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.slice(0, 300).map(l => (
                    <tr key={l.n}>
                      <td className="num texto-3">{l.n}</td>
                      <td>{l.nome || '—'}</td>
                      <td className="num sem-quebra">{l.cpfMascara}</td>
                      <td className="num">{l.matricula}</td>
                      <td className="pequeno">{l.email}</td>
                      <td>
                        <div className="pilha g6">
                          <span className={`chip ${SITUACAO[l.situacao][1]}`}>{SITUACAO[l.situacao][0]}</span>
                          {l.erro ? <span className="erro-campo">{l.erro}</span> : null}
                          {l.mudancas?.length ? <span className="dica">Muda: {l.mudancas.join(', ')}</span> : null}
                          {l.aviso ? <span className="dica">{l.aviso}</span> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visiveis.length > 300 ? (
              <p className="dica">Mostrando as primeiras 300 de {visiveis.length} linhas.</p>
            ) : null}
          </div>
        ) : null}
        {r?.etapa === 'concluida' ? (
          <p className="aviso aviso-ok" role="status">
            {r.mensagem}
          </p>
        ) : null}
      </div>
    </section>
  );
}
