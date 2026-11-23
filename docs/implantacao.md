# Implantação de referência

Esta é a arquitetura usada como referência para colocar o sistema em produção. Os nomes de domínio e de serviço abaixo são exemplos.

```
Navegador ──HTTPS──> Cloudflare (DNS, proxy, WAF, limite por IP)
                         │  cabeçalho secreto de origem
                         ▼
                AWS Lightsail Containers (imagem Docker do Next.js)
                         │  TLS obrigatório
                         ├──> PostgreSQL gerenciado (pooler em modo sessão)
                         └──> Amazon SES (e-mails transacionais)
```

## Variáveis de ambiente

O modelo completo está em [`.env.example`](../.env.example). As principais:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | conexão PostgreSQL (pooler em modo sessão) |
| `DATABASE_CA_CERT` | certificado da autoridade do banco, para validar o TLS |
| `CPF_ENC_KEY` / `CPF_HMAC_KEY` | chaves de 32 bytes em base64 (`npm run chave`); não podem mudar depois que houver dados sem um processo de recifragem |
| `SITE_URL` | endereço público do site |
| `ORIGEM_SEGREDO` | valor do cabeçalho que a CDN envia; sem ele o site responde 403 a tudo, menos `/api/saude` |
| `EMAIL_MODO` | `fila` (guarda e não envia) ou `ses` |
| `SES_REGIAO`, `SES_REMETENTE`, `SES_ACCESS_KEY_ID`, `SES_SECRET_ACCESS_KEY` | envio pelo Amazon SES, com um usuário IAM que só pode enviar a partir do remetente configurado |

Segredos ficam no ambiente do contêiner e num arquivo local `.env.production.local`, ignorado pelo Git.

## Banco de dados

1. Crie o banco com TLS obrigatório e a API automática do provedor desligada: todo acesso passa pelo servidor do site.
2. Aplique e confira as migrações:

   ```bash
   npm run db:migrate
   npm run db:verificar   # confere RLS, permissões e auditoria imutável
   ```

3. Crie o administrador com `npm run admin:producao -- --nome "…" --email …`.

Nunca rode o `seed` em produção.

## Publicação

O script [`scripts/publicar-aws.ps1`](../scripts/publicar-aws.ps1) gera a imagem Docker, envia ao Lightsail e cria um novo deployment mantendo as variáveis de ambiente atuais. Cada publicação recebe um `NEXT_DEPLOYMENT_ID` próprio, para que telas abertas antes da atualização recarreguem em vez de falhar.

```bash
npm run publicar:primeira   # primeira vez: lê .env.production.local
npm run publicar            # atualizações
```

## CDN

- Proxy ligado nos registros do domínio e SSL no modo *Full (strict)*.
- Regra de transformação que acrescenta o cabeçalho de origem com o valor de `ORIGEM_SEGREDO`.
- Limite de requisições por IP no login, nos pedidos de código e na validação pública.
- Desligar recursos que injetam scripts (ofuscação de e-mail, otimizações automáticas), pois a CSP bloqueia scripts sem nonce.

## E-mail

- Identidade de domínio verificada no SES com DKIM, MAIL FROM próprio e DMARC.
- Usuário IAM exclusivo com permissão apenas para `ses:SendEmail` e `ses:SendRawEmail`, restrita ao remetente.
- Endereços terminados em `.test` nunca entram na fila (contas de demonstração).
