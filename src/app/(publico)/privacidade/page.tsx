import type { Metadata } from 'next';
import Link from 'next/link';
import { INSTITUCIONAL as I } from '@/lib/institucional';

export const metadata: Metadata = { title: 'Privacidade' };

function ContatoEncarregado() {
  const { nome, email } = I.encarregado;
  if (email) {
    return (
      <p>
        Encarregado pelo tratamento de dados pessoais do Município{nome ? `: ${nome}` : ''} —{' '}
        <a href={`mailto:${email}`}>{email}</a>.
      </p>
    );
  }
  return (
    <p>
      O contato do encarregado pelo tratamento de dados pessoais do Município será publicado nesta página. Enquanto
      isso, envie seu pedido para <a href={`mailto:${I.emailAtendimento}`}>{I.emailAtendimento}</a>, que o encaminhará
      ao encarregado.
    </p>
  );
}

export default function Privacidade() {
  return (
    <article className="texto-longo">
      <p className="sobretitulo">Privacidade</p>
      <h1 className="titulo-pagina">Aviso de privacidade</h1>
      <p>
        Este aviso explica como o Programa Formar trata os dados pessoais dos servidores da rede municipal de ensino e
        da equipe da Secretaria, conforme a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Última
        atualização: {I.atualizadoEm}.
      </p>

      <h2>Quem é o responsável (controlador)</h2>
      <p>
        {I.controlador}, CNPJ {I.cnpj}, com sede na {I.enderecoSemed}.
      </p>

      <h2>Encarregado de dados e atendimento</h2>
      <ContatoEncarregado />
      <p>
        Dúvidas sobre o Programa Formar, correção de dados ou problemas com certificados:{' '}
        <a href={`mailto:${I.emailAtendimento}`}>{I.emailAtendimento}</a>.
      </p>

      <h2>Que dados usamos</h2>
      <ul>
        <li>
          <strong>Servidores:</strong> nome completo, CPF, matrícula, e-mail institucional, função e lotação, vindos da
          base oficial de servidores da Secretaria; a presença em cada encontro das formações em que você foi
          vinculado(a); e os certificados emitidos.
        </li>
        <li>
          <strong>Equipe da gestão:</strong> nome, e-mail institucional, perfil de acesso e os dados da verificação em
          duas etapas.
        </li>
        <li>
          <strong>Registros de uso:</strong> as ações feitas no sistema (por exemplo, alteração de presença, emissão e
          download de certificados), com data, hora e quem fez — sem endereço IP, CPF, senha ou código de acesso.
        </li>
        <li>
          <strong>Dados técnicos de conexão:</strong> os provedores de infraestrutura podem registrar automaticamente o
          endereço IP e dados do navegador, por segurança (proteção contra ataques e abuso).
        </li>
      </ul>
      <p>Não usamos dados sensíveis (como saúde, religião ou biometria) nem dados de crianças e adolescentes.</p>

      <h2>Para quê e com qual base legal</h2>
      <p>
        Exclusivamente para registrar sua participação nas formações do Programa Formar, emitir os certificados, enviar
        os avisos do sistema (convites, recuperação de senha, matrícula e certificado disponível) e permitir que
        terceiros confirmem a autenticidade de um certificado pelo código de validação. A base legal é a execução de
        políticas públicas e o cumprimento das atribuições legais do Município (art. 7º, II e III, e art. 23 da LGPD).
        Seus dados não são usados para propaganda nem vendidos ou cedidos a terceiros.
      </p>

      <h2>Validação pública de certificados</h2>
      <p>
        Quem tiver o código impresso no certificado pode conferir sua autenticidade em{' '}
        <Link href="/validar">Validar certificado</Link>. A consulta mostra apenas nome, formação, carga horária,
        período e data de emissão — nunca CPF, matrícula ou e-mail.
      </p>

      <h2>Com quem compartilhamos</h2>
      <p>
        Os dados ficam com o Município. Para funcionar, o sistema usa empresas que tratam os dados apenas sob nossas
        instruções (operadores):
      </p>
      <ul>
        <li>
          <strong>Amazon Web Services (AWS)</strong> — hospedagem do site e envio dos e-mails, com servidores em São
          Paulo (Brasil).
        </li>
        <li>
          <strong>Supabase</strong> — banco de dados, com servidores em São Paulo (Brasil).
        </li>
        <li>
          <strong>Cloudflare</strong> — proteção do site contra ataques e entrega das páginas.
        </li>
      </ul>
      <p>
        A Cloudflare opera uma rede mundial, e as três empresas têm sede no exterior; por isso pode haver transferência
        internacional de dados, feita com as garantias contratuais desses provedores (art. 33 da LGPD). Os dados também
        podem ser fornecidos a órgãos de controle ou ao Judiciário quando houver obrigação legal.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Certificados, presenças e formações:</strong> por prazo indeterminado, pois comprovam a formação do
          servidor e são documentos da administração pública, conforme a tabela de temporalidade do Município.
        </li>
        <li>
          <strong>Conta de quem deixou a rede:</strong> é desativada; os dados continuam guardados para emitir segunda
          via e comprovar a formação.
        </li>
        <li>
          <strong>Registros de uso (auditoria):</strong> no mínimo 5 anos.
        </li>
        <li>
          <strong>E-mails enviados:</strong> apagados 30 dias após o envio.
        </li>
        <li>
          <strong>Sessões de acesso:</strong> apagadas quando você sai, quando vencem ou quando a senha é trocada.
        </li>
      </ul>

      <h2>Como protegemos</h2>
      <ul>
        <li>O CPF fica cifrado no banco de dados; as telas mostram apenas parte dele (***.456.789-**).</li>
        <li>
          Senhas são guardadas com Argon2id, um algoritmo próprio para senhas — ninguém consegue lê-las, nem a equipe do
          sistema.
        </li>
        <li>A equipe da gestão entra com senha e verificação em duas etapas.</li>
        <li>Cada servidor acessa somente os próprios dados; a gestão acessa os dados das formações que administra.</li>
        <li>
          Toda a comunicação é criptografada (HTTPS) e os registros de auditoria não podem ser alterados nem apagados.
        </li>
      </ul>
      <p>
        Se houver um incidente de segurança que possa causar risco ou dano relevante, comunicaremos a Autoridade
        Nacional de Proteção de Dados (ANPD) e as pessoas afetadas, nos prazos da regulamentação.
      </p>

      <h2>Cookies</h2>
      <p>
        Usamos apenas cookies essenciais: o de sessão, que mantém você conectado(a) enquanto usa o site (por mais tempo
        quando você marca &ldquo;Manter conectado&rdquo;), e o que guarda sua escolha de tema claro ou escuro. Não
        usamos cookies de publicidade, de rastreamento ou de análise de terceiros.
      </p>

      <h2>Seus direitos</h2>
      <p>Pela LGPD (art. 18), você pode pedir:</p>
      <ul>
        <li>confirmação de que tratamos seus dados e acesso a eles;</li>
        <li>correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>informação sobre com quem seus dados são compartilhados;</li>
        <li>anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desacordo com a lei;</li>
        <li>revisão de decisões tomadas com base em tratamento automatizado.</li>
      </ul>
      <p>
        Envie o pedido pelos contatos acima. Responderemos em até 15 dias. Alguns dados não podem ser apagados enquanto
        forem necessários para cumprir obrigação legal ou comprovar a formação (art. 16 da LGPD). Se não ficar
        satisfeito(a) com a resposta, você pode reclamar à ANPD em{' '}
        <a href="https://www.gov.br/anpd" rel="noreferrer">
          gov.br/anpd
        </a>
        .
      </p>

      <h2>Mudanças neste aviso</h2>
      <p>
        Este aviso pode ser atualizado; a data da última atualização fica no início da página. Veja também os{' '}
        <Link href="/termos">Termos de uso</Link>.
      </p>
    </article>
  );
}
