import { exigirAdmin } from '@/lib/auth/sessao';
import { planilhaModelo } from '@/lib/dominio/importacao';

export async function GET() {
  await exigirAdmin();
  const buf = await planilhaModelo();
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-base-servidores.xlsx"',
      'Cache-Control': 'private, no-store'
    }
  });
}
