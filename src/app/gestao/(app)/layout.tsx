import { Topo } from '@/components/Topo';
import { Rodape } from '@/components/Rodape';
import { Avisos } from '@/components/Avisos';
import { exigirGestor } from '@/lib/auth/sessao';
import { sairGestao } from '@/lib/acoes/auth';
import { contarConferencia } from '@/lib/dominio/servico';

export default async function LayoutGestao({ children }: LayoutProps<'/gestao'>) {
  const g = await exigirGestor();
  const pendentes = await contarConferencia();
  return (
    <>
      <Topo
        inicio="/gestao"
        area="Gestão de formações · SEMED"
        nome={g.nome}
        detalhe={g.perfil === 'admin' ? 'Administração' : 'Núcleo de formação'}
        conta="/gestao/conta"
        sair={sairGestao}
        abas={[
          { href: '/gestao', rotulo: 'Painel', exato: true },
          { href: '/gestao/formacoes', rotulo: 'Formações' },
          { href: '/gestao/conferencia', rotulo: 'Conferência', contador: pendentes, alerta: true },
          { href: '/gestao/modelos', rotulo: 'Modelos' },
          { href: '/gestao/relatorios', rotulo: 'Relatórios' },
          ...(g.perfil === 'admin' ? [{ href: '/gestao/admin', rotulo: 'Administração' }] : [])
        ]}
      />
      <main id="conteudo" className="container pagina entra">
        <Avisos>{children}</Avisos>
      </main>
      <Rodape />
    </>
  );
}
