import type { Metadata } from 'next';
import { desc } from 'drizzle-orm';
import { CircleAlert, Info, RotateCcw } from 'lucide-react';
import { db, schema as s } from '@/db';
import { reenviarEmailsComFalha } from '@/lib/acoes/admin';
import { resumoFila } from '@/lib/email-envio';
import { dataHoraBR } from '@/lib/dominio/datas';
import { BotaoEnviar, FormAcao } from '@/components/FormAcao';

export const metadata: Metadata = { title: 'E-mails' };

const MODO: Record<string, string> = {
  ses: 'Enviando pelo Amazon SES',
  simulado: 'Modo simulado (nada sai; só registra no log)',
  fila: 'Envio desligado (as mensagens só ficam na fila)'
};

/** Situação da fila de e-mails. O texto das mensagens não aparece aqui: pode conter links de senha. */
export default async function Emails() {
  const r = await resumoFila();
  const d = await db();
  const ultimos = await d
    .select({
      id: s.emailSaida.id,
      para: s.emailSaida.para,
      assunto: s.emailSaida.assunto,
      criadoEm: s.emailSaida.criadoEm,
      enviadoEm: s.emailSaida.enviadoEm,
      tentativas: s.emailSaida.tentativas,
      ultimoErro: s.emailSaida.ultimoErro,
      desistiuEm: s.emailSaida.desistiuEm
    })
    .from(s.emailSaida)
    .orderBy(desc(s.emailSaida.criadoEm))
    .limit(40);

  return (
    <div className="pilha g18">
      <p className={`aviso ${r.modo === 'ses' ? 'aviso-ok' : 'aviso-alerta'}`}>
        <Info size={18} aria-hidden="true" /> {MODO[r.modo]}.
      </p>
      {r.atrasados ? (
        <p className="aviso aviso-erro" role="alert">
          <CircleAlert size={18} aria-hidden="true" /> {r.atrasados} e-mail(s) esperando há mais de 15 minutos. Confira
          a configuração do SES.
        </p>
      ) : null}
      <dl className="resumo-import">
        <div>
          <dt>Na fila</dt>
          <dd>{r.pendentes}</dd>
        </div>
        <div>
          <dt>Tentando de novo</dt>
          <dd>{r.comFalha}</dd>
        </div>
        <div className={r.desistidos ? 'com-erro' : ''}>
          <dt>Falharam de vez</dt>
          <dd>{r.desistidos}</dd>
        </div>
        <div>
          <dt>Enviados em 24 h</dt>
          <dd>{r.enviados24h}</dd>
        </div>
      </dl>
      {r.desistidos ? (
        <FormAcao acao={reenviarEmailsComFalha}>
          <BotaoEnviar className="botao" rotuloCarregando="Devolvendo…">
            <RotateCcw size={16} aria-hidden="true" /> Tentar de novo os que falharam
          </BotaoEnviar>
        </FormAcao>
      ) : null}
      <section className="cartao" aria-labelledby="t-ult">
        <div className="cartao-cabeca">
          <h2 id="t-ult" className="titulo-secao">
            Últimas mensagens
          </h2>
          <span className="pequeno texto-3">Enviadas saem da lista após 30 dias</span>
        </div>
        {ultimos.length ? (
          <div className="tabela-rolagem" tabIndex={0} role="region" aria-label="Últimas mensagens">
            <table className="tabela">
              <thead>
                <tr>
                  <th scope="col">Criado</th>
                  <th scope="col">Para</th>
                  <th scope="col">Assunto</th>
                  <th scope="col">Situação</th>
                </tr>
              </thead>
              <tbody>
                {ultimos.map(m => (
                  <tr key={m.id}>
                    <td className="pequeno sem-quebra num">{dataHoraBR(m.criadoEm)}</td>
                    <td className="pequeno">{m.para}</td>
                    <td>{m.assunto}</td>
                    <td>
                      <div className="pilha g6">
                        {m.enviadoEm ? (
                          <span className="chip chip-ok">Enviado {dataHoraBR(m.enviadoEm)}</span>
                        ) : m.desistiuEm ? (
                          <span className="chip chip-erro">Falhou</span>
                        ) : m.tentativas ? (
                          <span className="chip chip-alerta">Tentativa {m.tentativas + 1}</span>
                        ) : (
                          <span className="chip">Na fila</span>
                        )}
                        {m.ultimoErro && !m.enviadoEm ? (
                          <span className="erro-campo pequeno">{m.ultimoErro}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="cartao-corpo texto-3">Nenhuma mensagem.</p>
        )}
      </section>
    </div>
  );
}
