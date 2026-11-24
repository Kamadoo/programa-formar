import { NavAbas } from '@/components/NavAbas';
import { exigirAdmin } from '@/lib/auth/sessao';

export default async function LayoutAdmin({ children }: LayoutProps<'/gestao/admin'>) {
  await exigirAdmin();
  return (
    <>
      <div className="cabecalho-pagina">
        <div>
          <p className="sobretitulo">Administração</p>
          <h1 className="titulo-pagina">Administração do sistema</h1>
          <p className="texto-3">Área exclusiva do perfil administrador. Tudo o que é feito aqui fica na auditoria.</p>
        </div>
      </div>
      <div className="subabas-borda">
        <NavAbas
          rotulo="Seções da administração"
          abas={[
            { href: '/gestao/admin/gestores', rotulo: 'Contas da gestão' },
            { href: '/gestao/admin/servidores', rotulo: 'Base de servidores' },
            { href: '/gestao/admin/convites', rotulo: 'Convites' },
            { href: '/gestao/admin/emails', rotulo: 'E-mails' },
            { href: '/gestao/admin/auditoria', rotulo: 'Auditoria' }
          ]}
        />
      </div>
      {children}
    </>
  );
}
