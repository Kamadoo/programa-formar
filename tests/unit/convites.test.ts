import { describe, expect, it } from 'vitest';
import { emailConvidavel, lerFiltrosConvite, situacaoDoEmail } from '@/lib/dominio/convites-filtros';
import { emailConvite } from '@/lib/email-modelos';

describe('convites de primeiro acesso', () => {
  it('lê os filtros da URL e descarta valores fora da lista', () => {
    expect(lerFiltrosConvite({})).toEqual({
      q: '',
      lotacao: '',
      funcao: '',
      convite: 'todos',
      criacao: 'qualquer',
      pagina: 1
    });
    const f = lerFiltrosConvite({ q: '  maria ', convite: 'enviado7', criacao: '30', p: '3', lotacao: 'EM Centro' });
    expect(f).toMatchObject({ q: 'maria', convite: 'enviado7', criacao: '30', pagina: 3, lotacao: 'EM Centro' });
    expect(lerFiltrosConvite({ convite: "x'; drop", criacao: '999', p: '-4' })).toMatchObject({
      convite: 'todos',
      criacao: 'qualquer',
      pagina: 1
    });
  });
  it('calcula a situação pelo e-mail na fila', () => {
    expect(situacaoDoEmail(null)).toBe('nunca');
    expect(situacaoDoEmail({ existe: true, enviadoEm: null, desistiuEm: null })).toBe('na_fila');
    expect(situacaoDoEmail({ existe: true, enviadoEm: new Date(), desistiuEm: null })).toBe('enviado');
    expect(situacaoDoEmail({ existe: true, enviadoEm: null, desistiuEm: new Date() })).toBe('falhou');
    // Já saiu da fila pela limpeza: foi enviado.
    expect(situacaoDoEmail({ existe: false, enviadoEm: null, desistiuEm: null })).toBe('enviado');
  });
  it('só convida endereços válidos e reais', () => {
    expect(emailConvidavel('maria.silva@educacao.example')).toBe(true);
    expect(emailConvidavel('sem-arroba')).toBe(false);
    expect(emailConvidavel('gestor@formar.test')).toBe(false);
  });
  it('monta o e-mail com o link do primeiro acesso e escapa o nome', () => {
    const m = emailConvite({ nome: '<Maria>', siteUrl: 'https://formar.example' });
    expect(m.html).toContain('https://formar.example/primeiro-acesso');
    expect(m.html).toContain('&lt;Maria&gt;');
    expect(m.html).not.toContain('<Maria>');
    expect(m.texto).toContain('1. Abra o portal');
    expect(m.texto).not.toContain('<strong>');
  });
});
