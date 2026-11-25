# Segurança

## Princípios

- O servidor é a fronteira de segurança. Toda página, Server Action e rota de PDF chama `exigirGestor()` ou `exigirServidor()` antes de qualquer leitura; o `proxy.ts` só faz o redirecionamento otimista.
- O escopo vem da sessão, nunca de parâmetros do navegador. O portal só encontra certificados cujo dono é o servidor da sessão (`certificadoDoServidor`); um ID de outra pessoa responde 404.
- Dados pessoais mínimos, e exibidos ainda menos.

## Autenticação

| Item                         | Como funciona                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Senhas                       | Argon2id (19 MiB, 2 iterações). Mínimo de 10 caracteres com letras e números; sequências óbvias recusadas.                                                                                                                                                                                                                     |
| Sessão                       | Token aleatório de 256 bits no cookie `HttpOnly`, `SameSite=Lax`, `Secure` e prefixo `__Host-` em produção; o banco guarda só o SHA-256. Validade de 10 h (gestão) / 12 h (portal) e encerramento após 2 h sem uso.                                                                                                            |
| Duas etapas (gestão)         | Obrigatória para todos da gestão. TOTP (RFC 6238, 6 dígitos/30 s, ±1 passo, código não reutilizável), segredo cifrado com AES-GCM. A senha cria só uma sessão parcial (10 min) que não acessa nada; a sessão completa nasce com token novo depois do código. 10 códigos de recuperação de uso único (só o hash fica no banco). |
| Administrador                | Perfil exclusivo, criado só pelo terminal (`npm run admin`), nunca pela interface. Administra contas da gestão, base de servidores e auditoria; não pode alterar outro administrador. Recuperação de acesso também só pelo terminal (`--recuperar`).                                                                           |
| Força bruta                  | Bloqueio progressivo por identificador após 5 falhas em 15 min (1, 2, 4… até 60 min).                                                                                                                                                                                                                                          |
| Enumeração                   | Tempo mínimo de resposta no login e nos pedidos de código; a mensagem é sempre a mesma, exista ou não a conta.                                                                                                                                                                                                                 |
| Login da gestão              | Usuário gerado ao criar a conta (`nome.sobrenome`) + senha + aplicativo autenticador (TOTP) ou código de recuperação. O e-mail serve só para convite, avisos e links de senha.                                                                                                                                                 |
| Login do servidor            | Usuário gerado no primeiro acesso + senha + aplicativo autenticador (TOTP) ou código de recuperação. CPF e matrícula não servem para entrar.                                                                                                                                                                                   |
| Primeiro acesso / nova senha | CPF (ativação) ou usuário (nova senha) → código de 6 dígitos, uso único, 10 min, guardado só como hash, enviado ao e-mail institucional. Pedir um novo invalida os anteriores; erros entram no bloqueio progressivo. Trocar a senha encerra todas as sessões da conta.                                                         |
| CSRF                         | Server Actions do Next conferem a origem; cookies `SameSite=Lax`; `form-action 'self'`.                                                                                                                                                                                                                                        |

## Dados pessoais (LGPD)

- **CPF** guardado cifrado (AES-256-GCM) e com HMAC-SHA256 para busca e para a ativação da conta (o login não usa CPF). As telas recebem só a máscara `***.456.789-**`; o certificado não imprime CPF.
- A **validação pública** mostra nome, formação, carga, período e data — o necessário para conferir autenticidade.
- O código de validação tem um sufixo aleatório (`PNL-2026-CNCAMAT-0017-7K2QX`) para que ninguém descubra certificados de outras pessoas tentando números em sequência.
- A auditoria não guarda IP, CPF, senha nem token.

## Auditoria

Tabela `auditoria` só de inclusão: um gatilho no banco recusa `UPDATE` e `DELETE`. Registra login, vínculo, desvínculo, lançamento e correção de presença, mudanças de status, emissão e cancelamento de certificado, validação/recusa, impressão de lista, downloads de PDF e consultas públicas.

## Integridade

- Alterações numa formação travam a linha (`SELECT … FOR UPDATE`) e recalculam status e certificados na mesma transação.
- Correção de presença depois do encerramento: o certificado anterior é cancelado e um novo é emitido com novo código. A validação pública informa que o código antigo foi cancelado.
- Um certificado ativo por participação (índice único parcial no banco).

## Navegador

| Cabeçalho                                        | Valor                                                                                                                                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Content-Security-Policy`                        | `default-src 'self'`; scripts só com nonce por requisição + `strict-dynamic` (sem `unsafe-inline`); `object-src 'none'`; `base-uri 'none'`; `form-action 'self'`; `frame-ancestors 'none'` |
| `Strict-Transport-Security`                      | `max-age=31536000; includeSubDomains` (produção)                                                                                                                                           |
| `X-Frame-Options`                                | `DENY`                                                                                                                                                                                     |
| `X-Content-Type-Options`                         | `nosniff`                                                                                                                                                                                  |
| `Referrer-Policy`                                | `no-referrer` (os links de senha não vazam por Referer)                                                                                                                                    |
| `Cross-Origin-Opener-Policy` / `Resource-Policy` | `same-origin`                                                                                                                                                                              |
| `Permissions-Policy`                             | câmera, microfone, geolocalização e pagamento bloqueados                                                                                                                                   |

Páginas da gestão e do portal saem com `Cache-Control: no-store`; PDFs com `private, no-store`. Fonte e ícones são servidos pelo próprio site (nada de CDN de terceiros).

## Infraestrutura

- O site só atende requisições que chegam pela CDN com o cabeçalho secreto de origem (`ORIGEM_SEGREDO`). Sem a variável em produção, o proxy **falha fechado**: tudo responde 403, menos `/api/saude`.
- Banco com TLS obrigatório e validação do certificado; RLS ligado e nenhum acesso para os papéis públicos do provedor (`npm run db:verificar` confere).
- Segredos do autenticador e CPFs são cifrados com `CPF_ENC_KEY`. Se um segredo não puder ser lido (chave trocada ou dado corrompido), a tela informa o problema e orienta o uso de um código de recuperação, sem contar como tentativa errada.
- E-mails enviados por um usuário IAM que só pode usar o remetente configurado.
- `/.well-known/security.txt` (RFC 9116) informa o canal para relatar vulnerabilidades.

## Antes de usar com dados reais

- Revisão jurídica do aviso de privacidade, dos termos de uso e da política de retenção.
- Relatório de impacto à proteção de dados (RIPD) e plano de resposta a incidentes.
- Cofre de segredos e procedimento de troca de chaves.
