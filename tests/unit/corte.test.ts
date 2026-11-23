import { describe, expect, it } from 'vitest';
import { proximoCorte } from '@/lib/auth/corte';

// Horários em Brasília (UTC−3); o corte é às 4 h, com pelo menos 1 h de folga.
const br = (iso: string) => Date.parse(iso + '-03:00');

describe('proximoCorte (manter conectado)', () => {
  it('à tarde, vale até as 4 h do dia seguinte', () => {
    expect(proximoCorte(br('2026-11-18T13:20:00')).getTime()).toBe(br('2026-11-19T04:00:00'));
  });
  it('de madrugada, antes das 3 h, vale até as 4 h do mesmo dia', () => {
    expect(proximoCorte(br('2026-11-19T01:00:00')).getTime()).toBe(br('2026-11-19T04:00:00'));
  });
  it('a menos de 1 h do corte, pula para o dia seguinte', () => {
    expect(proximoCorte(br('2026-11-19T03:30:00')).getTime()).toBe(br('2026-11-20T04:00:00'));
  });
});
