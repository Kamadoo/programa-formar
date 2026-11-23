import 'server-only';
import ExcelJS from 'exceljs';
import { inArray, or } from 'drizzle-orm';
import { db, schema as s } from '@/db';
import { cifrar, hashCpf } from '@/lib/cripto';
import { mascararCpf, normalizarBusca } from './regras';
import {
  lerCsv,
  mapearColunas,
  MAX_LINHAS,
  validarLinhas,
  type LinhaBruta,
  type LinhaValidada
} from './planilha-servidores';

export const TAMANHO_MAX = 3 * 1024 * 1024;

export type Situacao = 'novo' | 'atualizar' | 'igual' | 'erro';
export type LinhaPrevia = Omit<LinhaValidada, 'cpf'> & { situacao: Situacao; mudancas?: string[] };
export type Analise = {
  arquivo: string;
  linhas: LinhaPrevia[];
  validas: (LinhaValidada & { situacao: Situacao; id?: string })[];
};

async function lerArquivo(arquivo: File): Promise<{ cabecalhos: string[]; linhas: LinhaBruta[] }> {
  const nome = arquivo.name.toLowerCase();
  const buf = Buffer.from(await arquivo.arrayBuffer());
  if (nome.endsWith('.csv')) {
    // Excel brasileiro costuma salvar CSV em Windows-1252; UTF-8 inválido cai para latin1.
    let txt = buf.toString('utf8');
    if (txt.includes('�')) txt = buf.toString('latin1');
    return lerCsv(txt);
  }
  if (!nome.endsWith('.xlsx')) throw new Error('Envie um arquivo .xlsx ou .csv.');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('A planilha está vazia.');
  const valor = (c: ExcelJS.CellValue): unknown => {
    if (c && typeof c === 'object') {
      if ('text' in c) return c.text;
      if ('result' in c) return c.result;
      if ('richText' in c) return c.richText.map(t => t.text).join('');
    }
    return c;
  };
  const cabecalhos: string[] = [];
  ws.getRow(1).eachCell(
    { includeEmpty: true },
    (cell, col) => (cabecalhos[col - 1] = String(valor(cell.value) ?? '').trim())
  );
  const linhas: LinhaBruta[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const obj: LinhaBruta = {};
    let algum = false;
    cabecalhos.forEach((h, i) => {
      const v = valor(row.getCell(i + 1).value);
      if (v !== null && v !== undefined && String(v).trim() !== '') algum = true;
      obj[h] = v;
    });
    if (algum) linhas.push(obj);
  }
  return { cabecalhos, linhas };
}

/** Lê, valida e compara com a base atual. Não grava nada. */
export async function analisarArquivo(arquivo: File): Promise<Analise> {
  if (arquivo.size === 0) throw new Error('O arquivo está vazio.');
  if (arquivo.size > TAMANHO_MAX) throw new Error('O arquivo passa de 3 MB.');
  const { cabecalhos, linhas } = await lerArquivo(arquivo);
  const { mapa, faltando } = mapearColunas(cabecalhos);
  if (faltando.length) throw new Error(`Faltam as colunas: ${faltando.join(', ')}. Use o modelo.`);
  if (!linhas.length) throw new Error('A planilha não tem servidores.');
  if (linhas.length > MAX_LINHAS) throw new Error(`Envie no máximo ${MAX_LINHAS} servidores por vez.`);

  const validadas = validarLinhas(linhas, mapa);
  const ok = validadas.filter(l => !l.erro);
  const d = await db();
  const hashes = ok.map(l => hashCpf(l.cpf));
  const mats = ok.map(l => l.matricula);
  const existentes = ok.length
    ? await d
        .select()
        .from(s.servidor)
        .where(or(inArray(s.servidor.cpfHash, hashes), inArray(s.servidor.matricula, mats)))
    : [];
  const porHash = new Map(existentes.map(e => [e.cpfHash, e]));
  const porMat = new Map(existentes.map(e => [e.matricula, e]));
  const emailsUsados = new Map(
    (ok.length
      ? await d
          .select({ id: s.servidor.id, email: s.servidor.emailInstitucional })
          .from(s.servidor)
          .where(
            inArray(
              s.servidor.emailInstitucional,
              ok.map(l => l.email)
            )
          )
      : []
    ).map(e => [e.email, e.id])
  );

  const validas: Analise['validas'] = [];
  const previa: LinhaPrevia[] = validadas.map(l => {
    const { cpf, ...semCpf } = l;
    if (l.erro) return { ...semCpf, situacao: 'erro' };
    const atual = porHash.get(hashCpf(cpf));
    const outroComMat = porMat.get(l.matricula);
    if (outroComMat && outroComMat.id !== atual?.id) {
      return { ...semCpf, erro: 'Matrícula já pertence a outro servidor na base', situacao: 'erro' };
    }
    const donoEmail = emailsUsados.get(l.email);
    if (donoEmail && donoEmail !== atual?.id) {
      return { ...semCpf, erro: 'E-mail já pertence a outro servidor na base', situacao: 'erro' };
    }
    if (!atual) {
      validas.push({ ...l, situacao: 'novo' });
      return { ...semCpf, situacao: 'novo' };
    }
    const mudancas: string[] = [];
    if (atual.nomeCompleto !== l.nome) mudancas.push('nome');
    if (atual.matricula !== l.matricula) mudancas.push('matrícula');
    if (atual.emailInstitucional !== l.email) mudancas.push('e-mail');
    if ((atual.funcao ?? null) !== l.funcao) mudancas.push('função');
    if ((atual.lotacao ?? null) !== l.lotacao) mudancas.push('lotação');
    if (!atual.ativo) mudancas.push('reativar');
    const situacao: Situacao = mudancas.length ? 'atualizar' : 'igual';
    validas.push({ ...l, situacao, id: atual.id });
    return { ...semCpf, situacao, mudancas };
  });
  return { arquivo: arquivo.name, linhas: previa, validas };
}

/** Grava novos e atualizados numa única transação. */
export async function aplicarImportacao(a: Analise) {
  const d = await db();
  const agora = new Date();
  let novos = 0;
  let atualizados = 0;
  await d.transaction(async tx => {
    const inserir = a.validas.filter(l => l.situacao === 'novo');
    for (let i = 0; i < inserir.length; i += 500) {
      const lote = inserir.slice(i, i + 500);
      await tx.insert(s.servidor).values(
        lote.map(l => ({
          nomeCompleto: l.nome,
          nomeBusca: normalizarBusca(l.nome),
          cpfHash: hashCpf(l.cpf),
          cpfCifrado: cifrar(l.cpf),
          cpfMascara: mascararCpf(l.cpf),
          matricula: l.matricula,
          emailInstitucional: l.email,
          funcao: l.funcao,
          lotacao: l.lotacao,
          importadoEm: agora,
          atualizadoEm: agora
        }))
      );
      novos += lote.length;
    }
    for (const l of a.validas.filter(x => x.situacao === 'atualizar')) {
      await tx
        .update(s.servidor)
        .set({
          nomeCompleto: l.nome,
          nomeBusca: normalizarBusca(l.nome),
          matricula: l.matricula,
          emailInstitucional: l.email,
          funcao: l.funcao,
          lotacao: l.lotacao,
          ativo: true,
          importadoEm: agora,
          atualizadoEm: agora
        })
        .where(inArray(s.servidor.id, [l.id!]));
      atualizados++;
    }
  });
  return { novos, atualizados };
}

/** Planilha modelo, com as colunas em formato texto (preserva zeros à esquerda). */
export async function planilhaModelo(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Programa Formar';
  const ws = wb.addWorksheet('Servidores');
  ws.columns = [
    { header: 'Nome completo', key: 'nome', width: 36 },
    { header: 'CPF', key: 'cpf', width: 18 },
    { header: 'Matrícula', key: 'matricula', width: 14 },
    { header: 'E-mail institucional', key: 'email', width: 38 },
    { header: 'Função', key: 'funcao', width: 32 },
    { header: 'Lotação', key: 'lotacao', width: 30 }
  ];
  ws.getRow(1).font = { bold: true };
  for (const c of ['B', 'C']) ws.getColumn(c).numFmt = '@';
  ws.addRow({
    nome: 'Exemplo da Silva (apague esta linha)',
    cpf: '529.982.247-25',
    matricula: '00001',
    email: 'exemplo.silva@edu.serraclara.example',
    funcao: 'Professora — Ensino Fundamental I',
    lotacao: 'EM Exemplo'
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return Buffer.from(await wb.xlsx.writeBuffer());
}
