'use client';

import { useRef } from 'react';
import { Settings2, UserPlus, X } from 'lucide-react';
import { acaoGestor, criarGestor, editarGestor } from '@/lib/acoes/admin';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';

export function NovoGestor() {
  return (
    <section className="cartao cartao-corpo" aria-labelledby="t-novo">
      <FormAcao acao={criarGestor} limparAoSalvar className="pilha g14">
        {r => (
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
                aria-invalid={Boolean(r?.erros?.email)}
                aria-describedby={r?.erros?.email ? 'e-email' : undefined}
              />
              {r?.erros?.email ? (
                <span id="e-email" className="erro-campo">
                  {r.erros.email}
                </span>
              ) : null}
            </div>
            <BotaoEnviar rotuloCarregando="Criando…">
              <UserPlus size={16} aria-hidden="true" /> Criar e enviar convite
            </BotaoEnviar>
          </>
        )}
      </FormAcao>
    </section>
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
  temTotp
}: {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  temTotp: boolean;
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
                    Se mudar, o endereço antigo recebe um aviso e os links de senha já enviados deixam de valer.
                  </span>
                  {r?.erros?.email ? (
                    <span id={`g-${id}-email-e`} className="erro-campo">
                      {r.erros.email}
                    </span>
                  ) : null}
                </div>
                <div className="linha">
                  <BotaoEnviar rotuloCarregando="Salvando…">Salvar alterações</BotaoEnviar>
                </div>
              </>
            )}
          </FormAcao>
          <div className="menu-lista estatico separador-topo">
            <Opcao
              id={id}
              acao="reenviar"
              rotulo="Enviar link de senha"
              confirmar={`Enviar para ${nome} um link para definir uma nova senha?`}
            />
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
