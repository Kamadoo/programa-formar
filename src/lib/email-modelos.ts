/**
 * Modelos HTML dos e-mails do Programa Formar.
 *
 * Regras de e-mail (valem para Gmail, Outlook e celulares):
 * - layout em tabelas, estilos inline, largura máxima de 560 px, sem CSS externo, sem JavaScript, sem fontes da web;
 * - todo texto vindo do banco passa por `esc()` (nomes, títulos);
 * - a versão em texto puro é sempre enviada junto (quem não abre HTML lê o texto).
 * Para mudar cores ou textos, edite aqui e confira em /dev/emails (desenvolvimento).
 */

const COR = {
  primaria: '#0a7397',
  primariaForte: '#075e7a',
  fundo: '#f5f8f9',
  cartao: '#ffffff',
  borda: '#e3eaec',
  texto: '#14242b',
  texto2: '#3d4e55',
  texto3: '#5d6e75',
  alertaFundo: '#fff7e6',
  alertaBorda: '#f0c36d'
};
const FONTE = 'Segoe UI, Roboto, Helvetica, Arial, sans-serif';

/** Escapa texto para HTML. */
export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function botao(rotulo: string, url: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px"><tr><td style="border-radius:10px;background:${COR.primaria}"><a href="${esc(url)}" style="display:inline-block;padding:13px 26px;font-family:${FONTE};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${esc(rotulo)}</a></td></tr></table>`;
}

function paragrafo(html: string) {
  return `<p style="margin:0 0 14px;font-family:${FONTE};font-size:15px;line-height:1.6;color:${COR.texto2}">${html}</p>`;
}

/** Moldura comum: faixa colorida, marca, cartão branco e rodapé institucional. */
export function layout(opcoes: { titulo: string; preheader: string; corpo: string; siteUrl: string }) {
  const { titulo, preheader, corpo, siteUrl } = opcoes;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${COR.fundo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COR.fundo}">
<tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">
    <tr><td style="height:5px;border-radius:5px 5px 0 0;background:linear-gradient(90deg,#35e47d,#3ecdf3,#6c60e6,#dd2287,#e6502c);background-color:${COR.primaria}"></td></tr>
    <tr><td style="background:${COR.cartao};border:1px solid ${COR.borda};border-top:0;border-radius:0 0 14px 14px;padding:28px 32px 30px">
      <p style="margin:0 0 22px;font-family:${FONTE};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${COR.primariaForte}">Programa Formar · SEMED Serra Clara</p>
      <h1 style="margin:0 0 18px;font-family:${FONTE};font-size:22px;line-height:1.3;font-weight:800;color:${COR.texto}">${esc(titulo)}</h1>
      ${corpo}
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-family:${FONTE};font-size:12px;line-height:1.6;color:${COR.texto3};text-align:center">
      Secretaria Municipal de Educação de Serra Clara<br>
      <a href="${esc(siteUrl)}" style="color:${COR.primariaForte}">${esc(siteUrl.replace(/^https?:\/\//, ''))}</a> · Este é um aviso automático; não responda este e-mail.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Converte o texto puro de um e-mail em HTML simples (parágrafos e links), dentro da moldura. */
export function htmlDeTexto(assunto: string, texto: string, siteUrl: string) {
  const blocos = texto
    .trim()
    .split(/\n{2,}/)
    .map(b =>
      esc(b)
        .replace(
          /(https?:\/\/[^\s<]+)/g,
          '<a href="$1" style="color:' + COR.primariaForte + ';word-break:break-all">$1</a>'
        )
        .replace(/\n/g, '<br>')
    )
    .map(paragrafo)
    .join('');
  const titulo = assunto.replace(/^Programa Formar:\s*/i, '');
  return layout({
    titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1),
    preheader: texto.slice(0, 120),
    corpo: blocos,
    siteUrl
  });
}

export type Finalidade = 'primeiro_acesso' | 'redefinir_senha';

/** Código de 6 números (primeiro acesso ou nova senha). */
export function emailCodigo(opcoes: {
  nome: string;
  codigo: string;
  finalidade: Finalidade;
  minutos: number;
  siteUrl: string;
  area?: 'portal' | 'gestao';
}) {
  const { nome, codigo, finalidade, minutos, siteUrl } = opcoes;
  const local = opcoes.area === 'gestao' ? 'da gestão de formações' : 'do portal do servidor';
  const fmt = `${codigo.slice(0, 3)} ${codigo.slice(3)}`;
  const primeiro = finalidade === 'primeiro_acesso';
  const titulo = primeiro ? 'Seu código de primeiro acesso' : 'Seu código para criar uma nova senha';
  const intro = primeiro
    ? `Use o código abaixo na tela de <strong>primeiro acesso</strong> ${local}. Depois você vai cadastrar o aplicativo autenticador e criar sua senha.`
    : `Recebemos um pedido para criar uma <strong>nova senha</strong> ${local === 'do portal do servidor' ? 'no portal do servidor' : 'na gestão de formações'}. Use o código abaixo na tela &ldquo;Esqueci a senha&rdquo;.`;
  const corpo =
    paragrafo(`Olá, ${esc(nome)}.`) +
    paragrafo(intro) +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0"><tr><td align="center" style="padding:20px;border:1px solid ${COR.borda};border-radius:12px;background:${COR.fundo}">
      <p style="margin:0 0 6px;font-family:${FONTE};font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COR.texto3}">Seu código</p>
      <p style="margin:0;font-family:Consolas,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:6px;color:${COR.texto}">${fmt}</p>
      <p style="margin:8px 0 0;font-family:${FONTE};font-size:13px;color:${COR.texto3}">Vale por ${minutos} minutos e só pode ser usado uma vez.</p>
    </td></tr></table>` +
    paragrafo(
      '<strong>Ninguém do Programa Formar vai pedir este código</strong> — nem por telefone, nem por mensagem. Não repasse a ninguém.'
    ) +
    paragrafo(
      primeiro
        ? 'Se você não pediu este código, ignore este e-mail: sua conta continua sem acesso até que você mesmo(a) a ative.'
        : 'Se você não pediu uma nova senha, ignore este e-mail: sua senha atual continua valendo.'
    );
  const texto = `Olá, ${nome}.\n\n${primeiro ? `Seu código para ativar seu acesso ${local === 'do portal do servidor' ? 'ao portal do servidor' : 'à gestão de formações'} é:` : 'Seu código para criar uma nova senha no portal do servidor é:'}\n\n    ${fmt}\n\nEle vale por ${minutos} minutos e só pode ser usado uma vez. Ninguém do Programa Formar vai pedir este código.\n\n${primeiro ? 'Se você não pediu, ignore esta mensagem.' : 'Se você não pediu, ignore esta mensagem: sua senha atual continua valendo.'}`;
  return {
    assunto: `Programa Formar: ${fmt} é seu código${primeiro ? ' de primeiro acesso' : ' para nova senha'}`,
    texto,
    html: layout({ titulo, preheader: `Seu código: ${fmt} (vale ${minutos} minutos)`, corpo, siteUrl })
  };
}

/** Aviso de que a senha foi alterada (troca em Minha conta, "esqueci a senha" ou primeiro acesso). */
export function emailSenhaAlterada(opcoes: { nome: string; quando: Date; siteUrl: string; area: 'portal' | 'gestao' }) {
  const { nome, quando, siteUrl, area } = opcoes;
  const dataHora = quando.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
    timeStyle: 'short'
  });
  const recuperar = new URL(area === 'portal' ? '/esqueci-senha' : '/gestao/entrar', siteUrl).toString();
  const corpo =
    paragrafo(`Olá, ${esc(nome)}.`) +
    paragrafo(
      `A senha da sua conta ${area === 'portal' ? 'no portal do servidor' : 'na gestão de formações'} foi alterada em <strong>${esc(dataHora)}</strong> (horário de Brasília). Por segurança, as sessões abertas em outros aparelhos foram encerradas.`
    ) +
    paragrafo('Se foi você, não precisa fazer nada.') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px"><tr><td style="padding:14px 16px;border:1px solid ${COR.alertaBorda};border-radius:10px;background:${COR.alertaFundo};font-family:${FONTE};font-size:14px;line-height:1.55;color:${COR.texto}">
      <strong>Não foi você?</strong> ${area === 'portal' ? 'Crie uma nova senha agora e avise' : 'Avise imediatamente'} o núcleo de formação da SEMED.
    </td></tr></table>` +
    (area === 'portal' ? botao('Criar nova senha', recuperar) : '');
  const texto = `Olá, ${nome}.\n\nA senha da sua conta ${area === 'portal' ? 'no portal do servidor' : 'na gestão de formações'} foi alterada em ${dataHora} (horário de Brasília). As sessões abertas em outros aparelhos foram encerradas.\n\nSe foi você, não precisa fazer nada.\n\nNão foi você? ${area === 'portal' ? `Crie uma nova senha em ${recuperar} e avise` : 'Avise imediatamente'} o núcleo de formação da SEMED.`;
  return {
    assunto: 'Programa Formar: sua senha foi alterada',
    texto,
    html: layout({ titulo: 'Sua senha foi alterada', preheader: `Alteração feita em ${dataHora}.`, corpo, siteUrl })
  };
}

const PASSOS_CONVITE = [
  'Abra o portal do servidor pelo botão abaixo e clique em <strong>Ative seu acesso</strong>.',
  'Informe o seu CPF. Enviaremos um código de 6 números para este e-mail.',
  'Digite o código e cadastre um aplicativo autenticador no celular (Google Authenticator, Microsoft Authenticator ou outro).',
  'Crie a sua senha. No final, a tela mostra o seu usuário para os próximos acessos.'
];

/** Convite de primeiro acesso ao portal (enviado pela administração, em lote). */
export function emailConvite(opcoes: { nome: string; siteUrl: string }) {
  const { nome, siteUrl } = opcoes;
  const url = new URL('/primeiro-acesso', siteUrl).toString();
  const passos = PASSOS_CONVITE.map(
    (p, i) =>
      `<tr><td width="30" valign="top" style="width:30px;padding:0 0 12px"><div style="width:24px;height:24px;border-radius:12px;background:${COR.fundo};border:1px solid ${COR.borda};font-family:${FONTE};font-size:12px;line-height:24px;font-weight:700;text-align:center;color:${COR.primariaForte}">${i + 1}</div></td><td valign="top" style="padding:2px 0 12px 8px;font-family:${FONTE};font-size:14px;line-height:1.55;color:${COR.texto2}">${p}</td></tr>`
  ).join('');
  const corpo =
    paragrafo(`Olá, ${esc(nome)}.`) +
    paragrafo(
      'O <strong>Programa Formar</strong> é o espaço das formações da Secretaria Municipal de Educação de Serra Clara. No portal do servidor você acompanha as formações em que está inscrito(a), confere a sua frequência e baixa os seus certificados.'
    ) +
    paragrafo('O seu acesso já está liberado. Para começar, faça o primeiro acesso:') +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 0">${passos}</table>` +
    botao('Fazer o primeiro acesso', url) +
    `<p style="margin:0 0 18px;font-family:${FONTE};font-size:12px;line-height:1.6;color:${COR.texto3}">Se o botão não abrir, copie este endereço no navegador: <span style="color:${COR.primariaForte};word-break:break-all">${esc(url)}</span></p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px"><tr><td style="padding:14px 16px;border:1px solid ${COR.alertaBorda};border-radius:10px;background:${COR.alertaFundo};font-family:${FONTE};font-size:14px;line-height:1.55;color:${COR.texto}">
      <strong>Segurança:</strong> ninguém do Programa Formar vai pedir a sua senha ou os seus códigos. Se você não esperava este convite, ignore este e-mail.
    </td></tr></table>`;
  const texto = `Olá, ${nome}.

O Programa Formar é o espaço das formações da Secretaria Municipal de Educação de Serra Clara. No portal do servidor você acompanha as formações em que está inscrito(a), confere a sua frequência e baixa os seus certificados.

O seu acesso já está liberado. Para começar, faça o primeiro acesso:

${PASSOS_CONVITE.map((p, i) => `${i + 1}. ${p.replace(/<\/?strong>/g, '')}`).join('\n')}

${url}

Segurança: ninguém do Programa Formar vai pedir a sua senha ou os seus códigos. Se você não esperava este convite, ignore este e-mail.`;
  return {
    assunto: 'Programa Formar: seu acesso ao portal do servidor está liberado',
    texto,
    html: layout({
      titulo: 'Seu acesso ao portal está liberado',
      preheader: 'Faça o primeiro acesso com o seu CPF e acompanhe suas formações e certificados.',
      corpo,
      siteUrl
    })
  };
}
