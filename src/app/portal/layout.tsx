import { Topo } from '@/components/Topo';
import { Rodape } from '@/components/Rodape';
import { Avisos } from '@/components/Avisos';
import { exigirServidor } from '@/lib/auth/sessao';
import { sairPortal } from '@/lib/acoes/portal-acesso';
import { certificadoLiberado } from '@/lib/dominio/regras';
import { formacoesDoServidor } from '@/lib/dominio/servico';

export default async function LayoutPortal({ children }: LayoutProps<'/portal'>) {
  const s = await exigirServidor();
  const lista = await formacoesDoServidor(s.id);
  const certs = lista.filter(x => certificadoLiberado(x.eu.status) && x.eu.certificado).length;
  return (
    <>
      <Topo
        inicio="/portal"
        area="Portal do servidor"
        nome={s.nome}
        detalhe={s.usuario ? `Usuário ${s.usuario}` : `Matrícula ${s.matricula}`}
        conta="/portal/conta"
        sair={sairPortal}
        abas={[
          { href: '/portal', rotulo: 'Meus cursos', contador: lista.length, exato: true },
          { href: '/portal/certificados', rotulo: 'Certificados', contador: certs }
        ]}
      />
      <main id="conteudo" className="container container-estreito pagina entra">
        <Avisos>{children}</Avisos>
      </main>
      <Rodape />
    </>
  );
}
