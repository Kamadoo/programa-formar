import type { StatusFormacao, StatusParticipacao } from '@/lib/dominio/regras';

const PARTICIPACAO: Record<StatusParticipacao, [string, string]> = {
  em_andamento: ['Em andamento', 'chip-info'],
  liberado_auto: ['Liberado · automático', 'chip-ok'],
  liberado_validado: ['Liberado · validado', 'chip-ok'],
  em_conferencia: ['Em conferência', 'chip-alerta'],
  recusado: ['Recusado', 'chip-erro']
};

/** Rótulos usados no portal (linguagem do servidor). */
const PORTAL: Record<StatusParticipacao, [string, string]> = {
  em_andamento: ['Em andamento', 'chip-info'],
  liberado_auto: ['Concluído · certificado disponível', 'chip-ok'],
  liberado_validado: ['Concluído · certificado disponível', 'chip-ok'],
  em_conferencia: ['Concluído · certificado em conferência', 'chip-alerta'],
  recusado: ['Concluído · certificado não emitido', 'chip-erro']
};

const FORMACAO: Record<StatusFormacao, [string, string]> = {
  planejada: ['Planejada', ''],
  em_andamento: ['Em andamento', 'chip-info'],
  encerrada: ['Encerrada', 'chip-ok']
};

export function ChipParticipacao({ status, portal = false }: { status: StatusParticipacao; portal?: boolean }) {
  const [t, c] = (portal ? PORTAL : PARTICIPACAO)[status];
  return <span className={`chip ${c}`}>{t}</span>;
}

export function ChipFormacao({ status }: { status: StatusFormacao }) {
  const [t, c] = FORMACAO[status];
  return <span className={`chip ${c}`}>{t}</span>;
}
