/**
 * Dados FICTÍCIOS para desenvolvimento (vindos do mockup). Nunca usar em produção.
 * Rode com: npm run db:seed   (o servidor de desenvolvimento precisa estar parado — o PGlite usa um único processo)
 *
 * Contas de teste:
 *   Administração → usuário admin.teste     senha Admin-Formar-2026  (e-mail admin@formar.test)
 *   Gestão        → usuário ana.formadora   senha Gestao-Formar-2026 (e-mail gestor@formar.test)
 *   Portal        → usuário maria.silva, senha formar2026 (conta de demonstração: entra sem o autenticador)
 *   Gestão (primeiro acesso) → CNPJ 12.ABC.345/01DE-35 (Bruno Costa, convite pendente); o código aparece em /dev/emails
 *   Primeiro acesso de verdade: use o CPF de outro servidor da BASE (ex.: 231.874.560-12) e veja o código em /dev/emails
 * A gestão exige verificação em duas etapas: no primeiro acesso, leia o QR code com um app autenticador.
 */
import { sql } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { gerarHashSenha } from '@/lib/auth/senha';
import { cifrar, hashDocumento, tokenAleatorio } from '@/lib/cripto';
import { carregarFicticios } from './dados-ficticios';

const documento = (tipo: 'cpf' | 'cnpj', valor: string) => ({
  documentoTipo: tipo,
  documentoHash: hashDocumento(tipo, valor),
  documentoCifrado: cifrar(valor)
});

async function main() {
  const d = await db();
  const [{ n }] = await d.select({ n: sql<number>`count(*)::int` }).from(s.formacao);
  if (n > 0 && !process.argv.includes('--forcar')) {
    console.log('O banco já tem dados. Use npm run db:reset para recomeçar do zero.');
    return;
  }

  const [gestorRow] = await d
    .insert(s.gestor)
    .values({
      nome: 'Ana Formadora',
      email: 'gestor@formar.test',
      usuario: 'ana.formadora',
      senhaHash: await gerarHashSenha('Gestao-Formar-2026'),
      perfil: 'gestor_nucleo',
      senhaAlteradaEm: new Date(),
      primeiroAcessoEm: new Date(),
      ...documento('cpf', '52998224725')
    })
    .returning({ id: s.gestor.id });
  await d.insert(s.gestor).values({
    nome: 'Admin Teste',
    email: 'admin@formar.test',
    usuario: 'admin.teste',
    senhaHash: await gerarHashSenha('Admin-Formar-2026'),
    perfil: 'admin',
    senhaAlteradaEm: new Date(),
    primeiroAcessoEm: new Date()
  });
  // Conta com convite pendente, para testar o primeiro acesso da gestão com CNPJ (alfanumérico).
  await d.insert(s.gestor).values({
    nome: 'Bruno Costa',
    email: 'bruno.costa@edu.serraclara.example',
    usuario: 'bruno.costa',
    senhaHash: await gerarHashSenha(tokenAleatorio(48)),
    perfil: 'gestor_nucleo',
    ...documento('cnpj', '12ABC34501DE35')
  });

  const [modelo] = await d
    .insert(s.modeloCertificado)
    .values({
      nome: 'Prefeitura de Serra Clara · SEMED',
      assinaturas: [
        { nome: 'Secretário(a) Municipal de Educação', cargo: 'Secretaria Municipal de Educação' },
        { nome: 'Prefeito(a) de Serra Clara', cargo: 'Prefeitura de Serra Clara' }
      ]
    })
    .returning({ id: s.modeloCertificado.id });

  const servidores = await carregarFicticios(d, gestorRow.id, modelo.id, { email: u => `${u}@edu.serraclara.example` });

  // Conta de teste do portal já com senha (os demais fazem o "primeiro acesso").
  await d
    .update(s.usuarioPortal)
    .set({ usuario: 'maria.silva', senhaHash: await gerarHashSenha('formar2026'), primeiroAcessoEm: new Date() })
    .where(sql`${s.usuarioPortal.servidorId} = ${servidores[0].id}`);

  // Maria é conta de demonstração no desenvolvimento: entra direto, sem o aplicativo autenticador.
  await d
    .update(s.servidor)
    .set({ testeAte: new Date('2099-12-31T00:00:00Z') })
    .where(sql`${s.servidor.id} = ${servidores[0].id}`);

  // E-mails gerados pela carga inicial não interessam.
  await d.delete(s.emailSaida);
  console.log('Dados fictícios carregados.');
}

main().then(
  () => process.exit(0),
  e => {
    console.error(e);
    process.exit(1);
  }
);
