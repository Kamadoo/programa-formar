import css from './acesso.module.css';

/** Opção "Manter conectado" dos formulários de login. */
export function CampoLembrar() {
  return (
    <label className={css.lembrar}>
      <input type="checkbox" name="lembrar" value="sim" className={css.lembrarCaixa} aria-describedby="dica-lembrar" />
      <span>Manter conectado até amanhã</span>
      <span id="dica-lembrar" className={css.lembrarDica}>
        Não marque em computador compartilhado.
      </span>
    </label>
  );
}
