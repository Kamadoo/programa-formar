'use client';

import { useEffect, useRef, useState } from 'react';
import type { Resultado } from '@/lib/acao';
import { Settings2, UserPlus, X } from 'lucide-react';
import { acaoGestor, criarGestor, editarGestor } from '@/lib/acoes/admin';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';

export function NovoGestor() {
  return (
    <section className="cartao cartao-corpo" aria-labelledby="t-novo">
      <FormAcao acao={criarGestor} className="pilha g14">
        {r => <CamposNovo r={r} />}
      </FormAcao>
    </section>
  );
}

/** Campos controlados: o que foi digitado continua na tela quando a criação dá erro. */
function CamposNovo({ r }: { r: Resultado }) {
  const [v, setV] = useState({ nome: '', email: '', documento: '' });
  // Conta criada: limpa os campos (ajuste durante a renderização, sem efeito).
  const [limpoEm, setLimpoEm] = useState<number | undefined>(undefined);
  if (r?.ok && r.t !== limpoEm) {
    setLimpoEm(r.t);
    setV({ nome: '', email: '', documento: '' });
  }
  const muda = (campo: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [campo]: e.target.value });
  return (
    <>
      <h2 id="t-novo" className="titulo-secao">
        Nova conta da gestão
      </h2>
      <div className="campo">
        <label htmlFor="novo-nome">Nome completo</label>
        <input
          id="novo-nome"
          name="nome"
          className="entrada"
          required
          maxLength={120}
          autoComplete="off"
          value={v.nome}
          onChange={muda('nome')}
          aria-invalid={Boolean(r?.erros?.nome)}
          aria-describedby={r?.erros?.nome ? 'e-nome' : undefined}
        />
        {r?.erros?.nome ? (
          <span id="e-nome" className="erro-campo">
            {r.erros.nome}
          </span>
        ) : null}
      </div>
      <div className="campo">
        <label htmlFor="novo-email">E-mail institucional</label>
        <input
          id="novo-email"
          name="email"
          type="email"
          className="entrada"
          required
          maxLength={160}
          autoComplete="off"
          value={v.email}
          onChange={muda('email')}
          aria-invalid={Boolean(r?.erros?.email)}
          aria-describedby={r?.erros?.email ? 'e-email' : undefined}
        />
        {r?.erros?.email ? (
          <span id="e-email" className="erro-campo">
            {r.erros.email}
          </span>
        ) : null}
      </div>
      <CamposDocumento prefixo="novo" erro={r?.erros?.documento} valor={v.documento} aoMudar={muda('documento')} />
      <BotaoEnviar rotuloCarregando="Criando…">
        <UserPlus size={16} aria-hidden="true" /> Criar e enviar convite
      </BotaoEnviar>
    </>
  );
}

/** Tipo (CPF ou CNPJ) + número. No primeiro acesso a pessoa digita o mesmo documento. */
function CamposDocumento({
  prefixo,
  erro,
  atual,
  tipoAtual,
  valor,
  aoMudar
}: {
  prefixo: string;
  erro?: string;
  atual?: string | null;
  tipoAtual?: 'cpf' | 'cnpj' | null;
  valor?: string;
  aoMudar?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [tipo, setTipo] = useState<'cpf' | 'cnpj'>(tipoAtual ?? 'cpf');
  // O React limpa o formulário depois de cada envio; o tipo escolhido volta para a caixa logo em seguida.
  const sel = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    const form = sel.current?.form;
    if (!form) return;
    const repor = () =>
      requestAnimationFrame(() => {
        if (sel.current) sel.current.value = tipo;
      });
    form.addEventListener('reset', repor);
    return () => form.removeEventListener('reset', repor);
  }, [tipo]);
  const dica = atual
    ? `Atual: ${atual}. Deixe em branco para manter.`
    : 'A pessoa digita este documento no primeiro acesso.';
  return (
    <fieldset className="campo">
      <legend className="rotulo-campo">CPF ou CNPJ</legend>
      <div className="campo-documento">
        <label className="sr-only" htmlFor={`${prefixo}-doc-tipo`}>
          Tipo de documento
        </label>
        <select
          id={`${prefixo}-doc-tipo`}
          name="documentoTipo"
          className="entrada"
          ref={sel}
          value={tipo}
          onChange={e => setTipo(e.target.value === 'cnpj' ? 'cnpj' : 'cpf')}
        >
          <option value="cpf">CPF</option>
          <option value="cnpj">CNPJ</option>
        </select>
        <label className="sr-only" htmlFor={`${prefixo}-doc`}>
          Número do {tipo === 'cpf' ? 'CPF' : 'CNPJ'}
        </label>
        <input
          id={`${prefixo}-doc`}
          name="documento"
          className="entrada num"
          required={!atual}
          {...(aoMudar ? { value: valor ?? '', onChange: aoMudar } : {})}
          maxLength={18}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={tipo === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
          aria-invalid={Boolean(erro)}
          aria-describedby={`${prefixo}-doc-d${erro ? ` ${prefixo}-doc-e` : ''}`}
        />
      </div>
      <span id={`${prefixo}-doc-d`} className="dica">
        {dica}
      </span>
      {erro ? (
        <span id={`${prefixo}-doc-e`} className="erro-campo">
          {erro}
        </span>
      ) : null}
    </fieldset>
  );
}

function Opcao({
  id,
  acao,
  rotulo,
  confirmar,
  perigo
}: {
  id: string;
  acao: string;
  rotulo: string;
  confirmar: string;
  perigo?: boolean;
}) {
  return (
    <FormAcao acao={acaoGestor} confirmar={confirmar} rotuloConfirmar={rotulo} perigo={perigo}>
      <input type="hidden" name="gestorId" value={id} />
      <input type="hidden" name="acao" value={acao} />
      <BotaoEnviar className={`menu-item${perigo ? ' perigo' : ''}`}>{rotulo}</BotaoEnviar>
    </FormAcao>
  );
}

/** Ações de uma conta numa caixa de diálogo (não é cortada pela rolagem da tabela). */
export function AcoesGestor({
  id,
  nome,
  email,
  ativo,
  temTotp,
  concluido,
  documento,
  documentoTipo
}: {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  temTotp: boolean;
  concluido: boolean;
  documento: string | null;
  documentoTipo: 'cpf' | 'cnpj' | null;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        className="botao botao-pequeno"
        onClick={() => ref.current?.showModal()}
        aria-label={`Gerenciar a conta de ${nome}`}
      >
        <Settings2 size={15} aria-hidden="true" /> Gerenciar
      </button>
      <dialog ref={ref} className="dialogo dialogo-largo" aria-labelledby={`g-${id}`}>
        <div className="pilha g14">
          <div className="linha entre">
            <h2 id={`g-${id}`} className="titulo-secao">
              {nome}
            </h2>
            <button
              type="button"
              className="botao botao-fantasma botao-icone"
              onClick={() => ref.current?.close()}
              aria-label="Fechar"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <FormAcao acao={editarGestor} rotulo={`Editar dados de ${nome}`} className="pilha g14">
            {r => (
              <>
                <input type="hidden" name="gestorId" value={id} />
                <div className="campo">
                  <label htmlFor={`g-${id}-nome`}>Nome completo</label>
                  <input
                    id={`g-${id}-nome`}
                    name="nome"
                    className="entrada"
                    defaultValue={nome}
                    required
                    maxLength={120}
                    autoComplete="off"
                    aria-invalid={Boolean(r?.erros?.nome)}
                    aria-describedby={r?.erros?.nome ? `g-${id}-nome-e` : undefined}
                  />
                  {r?.erros?.nome ? (
                    <span id={`g-${id}-nome-e`} className="erro-campo">
                      {r.erros.nome}
                    </span>
                  ) : null}
                </div>
                <div className="campo">
                  <label htmlFor={`g-${id}-email`}>E-mail institucional</label>
                  <input
                    id={`g-${id}-email`}
                    name="email"
                    type="email"
                    className="entrada"
                    defaultValue={email}
                    required
                    maxLength={160}
                    autoComplete="off"
                    aria-invalid={Boolean(r?.erros?.email)}
                    aria-describedby={`g-${id}-email-d${r?.erros?.email ? ` g-${id}-email-e` : ''}`}
                  />
                  <span id={`g-${id}-email-d`} className="dica">
                    Se mudar, o endereço antigo recebe um aviso e os códigos já enviados deixam de valer.
                  </span>
                  {r?.erros?.email ? (
                    <span id={`g-${id}-email-e`} className="erro-campo">
                      {r.erros.email}
                    </span>
                  ) : null}
                </div>
                <CamposDocumento
                  prefixo={`g-${id}`}
                  erro={r?.erros?.documento}
                  atual={documento}
                  tipoAtual={documentoTipo}
                />
                <div className="linha">
                  <BotaoEnviar rotuloCarregando="Salvando…">Salvar alterações</BotaoEnviar>
                </div>
              </>
            )}
          </FormAcao>
          <div className="menu-lista estatico separador-topo">
            {concluido ? (
              <Opcao
                id={id}
                acao="zerar_acesso"
                rotulo="Zerar acesso"
                confirmar={`Zerar o acesso de ${nome}? A senha e o aplicativo autenticador deixam de valer, as sessões são encerradas e a pessoa recebe um e-mail para refazer o primeiro acesso com o CPF ou CNPJ.`}
              />
            ) : (
              <Opcao
                id={id}
                acao="reenviar"
                rotulo="Reenviar convite"
                confirmar={`Reenviar para ${nome} o e-mail de primeiro acesso?`}
              />
            )}
            {temTotp ? (
              <Opcao
                id={id}
                acao="redefinir_2fa"
                rotulo="Redefinir duas etapas"
                confirmar={`Redefinir a verificação em duas etapas de ${nome}? Use quando a pessoa perdeu o celular e os códigos de recuperação.`}
              />
            ) : null}
            <Opcao
              id={id}
              acao="encerrar_sessoes"
              rotulo="Encerrar sessões"
              confirmar={`Encerrar todas as sessões abertas de ${nome}?`}
            />
            {ativo ? (
              <Opcao
                id={id}
                acao="desativar"
                rotulo="Desativar acesso"
                perigo
                confirmar={`Desativar o acesso de ${nome}? As sessões abertas serão encerradas.`}
              />
            ) : (
              <Opcao id={id} acao="reativar" rotulo="Reativar acesso" confirmar={`Reativar o acesso de ${nome}?`} />
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
