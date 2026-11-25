'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, MailCheck, Send } from 'lucide-react';
import { confirmarPrimeiroAcesso, pedirCodigoPrimeiroAcesso } from '@/lib/acoes/portal-acesso';
import { confirmarPrimeiroAcessoGestor, pedirCodigoPrimeiroAcessoGestor } from '@/lib/acoes/gestao-acesso';
import { BotaoEnviar } from '@/components/FormAcao';
import { CampoCodigoEmail, CampoCpf, CampoDocumento } from '../Campos';

/** Passo 1: CPF (portal) ou CPF/CNPJ (gestão) → código no e-mail → confere o código. */
export function FormPrimeiroAcesso({ gestao = false }: { gestao?: boolean }) {
  const nome = gestao ? 'documento' : 'cpf';
  const [cpf, setCpf] = useState('');
  const [pedido, pedir] = useActionState(gestao ? pedirCodigoPrimeiroAcessoGestor : pedirCodigoPrimeiroAcesso, null);
  const [conf, confirmar] = useActionState(gestao ? confirmarPrimeiroAcessoGestor : confirmarPrimeiroAcesso, null);
  const [corrigindo, setCorrigindo] = useState(false);
  const enviado = pedido?.ok && !corrigindo;

  if (!enviado) {
    const erro = pedido && !pedido.ok ? pedido.mensagem : null;
    return (
      <form
        action={f => {
          setCpf(String(f.get(nome) ?? ''));
          setCorrigindo(false);
          return pedir(f);
        }}
        className="pilha g18"
        noValidate
      >
        {gestao ? (
          <CampoDocumento erro={pedido?.erros?.documento ?? null} defaultValue={cpf} />
        ) : (
          <CampoCpf erro={pedido?.erros?.cpf ?? null} defaultValue={cpf} />
        )}
        {erro && !pedido?.erros ? (
          <p className="aviso aviso-erro" role="alert">
            {erro}
          </p>
        ) : null}
        <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Enviando…">
          <Send size={17} aria-hidden="true" /> Enviar código
        </BotaoEnviar>
      </form>
    );
  }

  const erro = conf && !conf.ok ? conf.mensagem : null;
  return (
    <div className="pilha g18">
      <p className="aviso aviso-ok" role="status">
        <MailCheck size={18} aria-hidden="true" /> {pedido.mensagem}
      </p>
      <form action={confirmar} className="pilha g18" noValidate>
        <input type="hidden" name={nome} value={cpf} />
        <CampoCodigoEmail erro={erro} />
        <BotaoEnviar className="botao botao-primario botao-largo botao-alto" rotuloCarregando="Conferindo…">
          Continuar <ArrowRight size={18} aria-hidden="true" />
        </BotaoEnviar>
      </form>
      <div className="linha entre pequeno">
        <form
          action={f => {
            f.set(nome, cpf);
            return pedir(f);
          }}
        >
          <button type="submit" className="botao-link">
            Reenviar código
          </button>
        </form>
        <button type="button" className="botao-link" onClick={() => setCorrigindo(true)}>
          {gestao ? 'Corrigir o documento' : 'Corrigir o CPF'}
        </button>
      </div>
    </div>
  );
}
