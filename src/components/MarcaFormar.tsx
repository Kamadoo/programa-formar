/**
 * Logo do Programa Formar. Duas imagens (fundo claro / fundo escuro): o CSS mostra a certa conforme o tema.
 * "horizontal" para cabeçalhos; "empilhada" para o painel das telas de acesso.
 */
export function MarcaFormar({
  variante = 'horizontal',
  altura,
  className = '',
  rotulo = 'Programa Formar'
}: {
  variante?: 'horizontal' | 'empilhada';
  altura: number;
  className?: string;
  rotulo?: string;
}) {
  const [arquivo, proporcao] =
    variante === 'horizontal'
      ? ['programa-formar-logo-horizontal', 1036.55 / 116.1]
      : ['programa-formar-logo', 1600 / 454];
  const largura = Math.round(altura * proporcao);
  return (
    <>
      <img
        src={`/marca/${arquivo}.svg`}
        alt={rotulo}
        className={`marca-formar claro ${className}`}
        width={largura}
        height={altura}
      />
      <img
        src={`/marca/${arquivo}-branco.svg`}
        alt={rotulo}
        className={`marca-formar escuro ${className}`}
        width={largura}
        height={altura}
      />
    </>
  );
}
