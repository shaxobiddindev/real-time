import { describe, expect, it } from 'vitest';
import { classify, consoleHeader, consoleRow, consoleSummary, createGenerator, defaultConfig, summarize, validateConfig } from './simulation';

describe('o‘lchash tizimi', () => {
  const cfg = { ...defaultConfig(), seed: 'test' };

  it('seed bilan natijalar takrorlanadi', () => {
    const a = createGenerator(cfg);
    const b = createGenerator(cfg);
    for (let i = 1; i <= 5; i++) expect(a(i, 0)).toEqual(b(i, 0));
  });

  it('qiymatlar berilgan oraliqda, deadline to‘g‘ri baholanadi', () => {
    const gen = createGenerator(cfg);
    for (let i = 1; i <= 200; i++) {
      const m = gen(i, 0);
      expect(m.value).toBeGreaterThanOrEqual(cfg.valueMin);
      expect(m.value).toBeLessThanOrEqual(cfg.valueMax);
      expect(m.exec).toBeGreaterThanOrEqual(cfg.execMin);
      expect(m.exec).toBeLessThanOrEqual(cfg.execMax);
      expect(m.total).toBeCloseTo(m.exec + m.latency, 9);
      expect(m.met).toBe(m.total <= cfg.deadline);
    }
  });

  it('holat me’yor chegaralari bo‘yicha', () => {
    expect(classify(17.9, cfg)).toBe('past');
    expect(classify(18, cfg)).toBe('meyorida');
    expect(classify(30, cfg)).toBe('meyorida');
    expect(classify(30.1, cfg)).toBe('yuqori');
  });

  it('konsol rasmdagi formatda', () => {
    expect(consoleHeader(cfg).slice(0, 4)).toEqual([
      "HARORATNI O'LCHASH TIZIMI",
      "O'lchovlar soni: 10",
      'Davriylik: 1000 ms',
      'Deadline: 200 ms',
    ]);
    const m = { n: 1, time: 0, value: 27.8, status: 'meyorida' as const, exec: 218.96, latency: 1.75, total: 220.71, met: false, overrun: false };
    expect(consoleRow(m, cfg)[0]).toBe(
      '#01 | Harorat: 27.8 °C | Bajarilish: 218.96 ms | Kechikish:  1.75 ms | Jami: 220.71 ms | Deadline: ULGURMADI',
    );
    const detailed = consoleRow({ ...m, exec: 0, latency: 0, total: 0, met: true }, { ...cfg, format: 'detailed' });
    expect(detailed[1]).toBe("  Holat: Me'yorida");
    expect(detailed[2]).toBe('  Ishlov berish vaqti: 0.000 ms');
    expect(detailed[4]).toBe('  Deadline: bajarildi');
  });

  it('yakuniy hisobot', () => {
    const gen = createGenerator(cfg);
    const list = Array.from({ length: 10 }, (_, i) => gen(i + 1, 0));
    const s = summarize(list);
    expect(s.met + s.missed).toBe(10);
    const lines = consoleSummary(list, cfg);
    expect(lines).toContain('YAKUNIY HISOBOT');
    expect(lines).toContain(`Deadlinega ulgurgan: ${s.met}`);
    expect(lines).toContain(`O'rtacha bajarilish vaqti: ${s.avgExec.toFixed(2)} ms`);
  });

  it('sozlamalarni tekshirish', () => {
    expect(validateConfig(cfg)).toEqual([]);
    expect(validateConfig({ ...cfg, period: 0, deadline: -1 })).toHaveLength(2);
    expect(validateConfig({ ...cfg, count: 0, speed: 0 })).toHaveLength(1);
  });
});
