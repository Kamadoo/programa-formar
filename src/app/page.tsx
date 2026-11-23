import { redirect } from 'next/navigation';
import { gestorAtual, gestorParcial, servidorAtual } from '@/lib/auth/sessao';

/** Quem já está conectado vai direto para a própria área; os demais, para o login do servidor. */
export default async function Inicio() {
  if (await gestorAtual()) redirect('/gestao');
  if (await gestorParcial()) redirect('/gestao/verificacao');
  if (await servidorAtual()) redirect('/portal');
  redirect('/entrar');
}
