import Link from 'next/link';

export function Rodape() {
  return (
    <footer className="rodape">
      <div className="container">
        <div className="linha">
          <img src="/marca/logo-orgao.png" alt="Prefeitura de Serra Clara" width={57} height={24} />
          <span>Secretaria Municipal de Educação · Programa Formar</span>
        </div>
        <nav aria-label="Links do rodapé">
          <Link href="/validar">Validar certificado</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
          <Link href="/acessibilidade">Acessibilidade</Link>
        </nav>
      </div>
    </footer>
  );
}
