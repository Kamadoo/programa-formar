import type { Metadata } from 'next';
import Link from 'next/link';
import { INSTITUCIONAL as I } from '@/lib/institucional';

export const metadata: Metadata = { title: 'Termos de uso' };

export default function Termos() {
  const email = <a href={`mailto:${I.emailAtendimento}`}>{I.emailAtendimento}</a>;
  return (
    <article className="texto-longo">
      <p className="sobretitulo">Termos de uso</p>
      <h1 className="titulo-pagina">Termos de uso do Programa Formar</h1>
      <p>Última atualização: {I.atualizadoEm}.</p>

      <h2>O que é o serviço</h2>
      <p>
        O Programa Formar é o sistema oficial da {I.orgao} para registrar a participação dos servidores da rede
        municipal de ensino nas formações oferecidas, emitir os certificados e permitir a conferência pública da
        autenticidade deles. O serviço é gratuito e mantido pela {I.orgao} (CNPJ {I.cnpj}), órgão do {I.municipio}.
      </p>

      <h2>Quem pode usar</h2>
      <ul>
        <li>
          <strong>Portal do servidor:</strong> servidores que constam na base oficial da Secretaria e foram vinculados a
          pelo menos uma formação.
        </li>
        <li>
          <strong>Gestão:</strong> apenas a equipe do núcleo de formação da SEMED, com conta criada pela administração
          do sistema.
        </li>
        <li>
          <strong>Validação de certificados:</strong> qualquer pessoa que tenha o código impresso no certificado.
        </li>
      </ul>

      <h2>Sua conta</h2>
      <ul>
        <li>
          A conta e a senha são pessoais e intransferíveis. Não compartilhe sua senha nem os códigos da verificação em
          duas etapas.
        </li>
        <li>
          Não marque &ldquo;Manter conectado&rdquo; em computadores compartilhados e use <strong>Sair</strong> ao
          terminar.
        </li>
        <li>Se suspeitar que alguém usou sua conta, troque a senha imediatamente e avise o atendimento.</li>
        <li>Mantenha seus dados corretos: se algo estiver errado (nome, função, lotação), peça a correção.</li>
      </ul>

      <h2>Uso permitido</h2>
      <p>É proibido:</p>
      <ul>
        <li>tentar acessar contas, dados ou certificados de outras pessoas;</li>
        <li>tentar burlar as proteções do sistema, testar senhas em massa ou sobrecarregar o site;</li>
        <li>alterar, falsificar ou apresentar como válido um certificado que não confere na validação pública;</li>
        <li>usar o sistema para fins diferentes dos previstos nestes termos.</li>
      </ul>
      <p>
        O descumprimento pode levar ao bloqueio do acesso, sem prejuízo das medidas administrativas e legais cabíveis
        (inclusive as previstas no Código Penal para falsificação de documento).
      </p>

      <h2>Certificados</h2>
      <ul>
        <li>
          Os certificados são emitidos eletronicamente pela Secretaria Municipal de Educação, de acordo com a frequência
          registrada pela gestão em cada formação.
        </li>
        <li>
          Cada certificado tem um código único. A autenticidade é comprovada pela consulta em{' '}
          <Link href="/validar">Validar certificado</Link>: se os dados exibidos não conferirem com o documento
          apresentado, ele não deve ser aceito.
        </li>
        <li>
          Discordou da frequência ou encontrou erro no certificado? Fale com o atendimento para análise pela gestão.
        </li>
      </ul>

      <h2 id="seguranca">Segurança e comunicação de falhas</h2>
      <p>
        Se você encontrar uma falha de segurança, comunique por {email}, descrevendo o que observou. Não acesse, altere
        nem divulgue dados de outras pessoas e não interrompa o funcionamento do site. Faça apenas o necessário para
        demonstrar o problema e aguarde a correção antes de divulgá-lo.
      </p>

      <h2>Disponibilidade</h2>
      <p>
        Buscamos manter o site disponível o tempo todo, mas pode haver interrupções para manutenção, por falhas de
        terceiros ou por motivo de segurança. Certificados já emitidos continuam válidos durante essas interrupções.
      </p>

      <h2>Privacidade</h2>
      <p>
        O tratamento dos seus dados pessoais está descrito no <Link href="/privacidade">Aviso de privacidade</Link>.
      </p>

      <h2>Mudanças e legislação</h2>
      <p>
        Estes termos podem ser atualizados; a data da última atualização fica no início da página. Aplica-se a
        legislação brasileira, em especial a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018), o Marco Civil
        da Internet (Lei nº 12.965/2014) e a Lei de Acesso à Informação (Lei nº 12.527/2011). Fica eleito o foro da
        Comarca de Serra Clara.
      </p>

      <h2>Contato</h2>
      <p>Dúvidas sobre estes termos: {email}.</p>
    </article>
  );
}
