import { describe, expect, it } from 'vitest';
import { algorithmById, algorithms } from '../algorithms';
import { SAMPLE_TASKS } from '../scheduling/sample';
import { simulate, utilization, validate } from './engine';
import type { TaskInput } from './types';

const run = (tasks: TaskInput[], id: string, options = {}) => {
  const algo = algorithmById(id);
  if (!algo) throw new Error(id);
  return simulate(tasks, algo, options);
};

// Amaliy ish hujjatidagi kutilgan natijalar.
const EXPECTED = {
  fcfs: { seq: 'T1 T2 T3 T4 T5', done: [5, 8, 10, 14, 20], wt: 7.4, tat: 11.4, missed: ['T2'] },
  sjf: { seq: 'T3 T2 T4 T1 T5', done: [14, 5, 2, 9, 20], wt: 6.0, tat: 10.0, missed: ['T1'] },
  priority: { seq: 'T2 T4 T1 T5 T3', done: [12, 3, 20, 7, 18], wt: 8.0, tat: 12.0, missed: ['T3'] },
  rr: { seq: 'T1 T2 T3 T4 T5 T1 T2 T4 T5 T1 T5', done: [18, 13, 6, 15, 20], wt: 10.4, tat: 14.4, missed: ['T1', 'T2'] },
  edf: { seq: 'T2 T3 T1 T4 T5', done: [10, 3, 5, 14, 20], wt: 6.4, tat: 10.4, missed: [] },
  rms: { seq: 'T2 T4 T1 T3 T5', done: [12, 3, 14, 7, 20], wt: 7.2, tat: 11.2, missed: ['T3'] },
};

describe('amaliy ish hujjati bilan mos', () => {
  for (const [id, exp] of Object.entries(EXPECTED)) {
    it(id, () => {
      const r = run(SAMPLE_TASKS, id, { params: { quantum: 2 } });
      expect(r.sequence.join(' ')).toBe(exp.seq);
      expect(r.results.map((x) => x.completion)).toEqual(exp.done);
      expect(r.avgWT).toBe(exp.wt);
      expect(r.avgTAT).toBe(exp.tat);
      expect(r.missed).toEqual(exp.missed);
    });
  }

  it('Round Robin Gantt chegaralari', () => {
    const r = run(SAMPLE_TASKS, 'rr', { params: { quantum: 2 } });
    expect([0, ...r.segments.map((s) => s.end)]).toEqual([0, 2, 4, 6, 8, 10, 12, 13, 15, 17, 18, 20]);
    expect(r.label).toBe('Round Robin (q=2)');
  });

  it('yuklanish koeffitsienti va Liu–Layland chegarasi', () => {
    const u = utilization(SAMPLE_TASKS)!;
    expect(u.U).toBeCloseTo(2.0952, 4);
    expect(u.rmsBound).toBeCloseTo(0.7435, 4);
    expect(u.rmsGuaranteed).toBe(false);
    expect(u.edfSchedulable).toBe(false);
  });
});

describe('engine', () => {
  it('protsessor bo‘sh turishi Gantt’da ko‘rsatiladi', () => {
    const tasks = [
      { name: 'A', arrival: 0, burst: 2 },
      { name: 'B', arrival: 5, burst: 1 },
    ];
    for (const id of ['fcfs', 'rr']) {
      const r = run(tasks, id);
      expect(r.segments).toEqual([
        { task: 0, start: 0, end: 2 },
        { task: null, start: 2, end: 5 },
        { task: 1, start: 5, end: 6 },
      ]);
      expect(r.idleTime).toBe(3);
    }
  });

  it('preemptiv SJF (SRTF)', () => {
    const tasks = [
      { name: 'A', arrival: 0, burst: 6 },
      { name: 'B', arrival: 1, burst: 2 },
    ];
    expect(run(tasks, 'sjf', { preemptive: true }).sequence).toEqual(['A', 'B', 'A']);
    expect(run(tasks, 'sjf', { preemptive: true }).results.map((r) => r.completion)).toEqual([8, 3]);
    expect(run(tasks, 'sjf').sequence).toEqual(['A', 'B']);
  });

  it('kasr qiymatlar bilan ishlaydi', () => {
    const r = run([{ name: 'A', arrival: 0, burst: 0.3 }, { name: 'B', arrival: 0.1, burst: 0.2 }], 'rr', {
      params: { quantum: 0.1 },
    });
    expect(r.makespan).toBe(0.5);
  });

  it('ixtiyoriy maydonlar bo‘sh bo‘lsa ham ishlaydi', () => {
    const tasks = [{ name: 'A', arrival: 0, burst: 2, priority: '', deadline: '', period: '' }];
    for (const a of algorithms) expect(simulate(tasks, a).results[0].completion).toBe(2);
    expect(run(tasks, 'edf').results[0].met).toBeNull();
    expect(utilization(tasks)).toBeNull();
  });

  it('HRRN va LLF', () => {
    const tasks = [
      { name: 'A', arrival: 0, burst: 3, deadline: 20 },
      { name: 'B', arrival: 1, burst: 6, deadline: 9 },
      { name: 'C', arrival: 2, burst: 1, deadline: 30 },
    ];
    expect(run(tasks, 'hrrn').sequence).toEqual(['A', 'C', 'B']);
    expect(run(tasks, 'llf', { preemptive: true }).sequence).toEqual(['A', 'B', 'A', 'C']);
  });

  it('validate', () => {
    expect(validate(SAMPLE_TASKS)).toEqual([]);
    expect(validate([{ name: '', arrival: -1, burst: 0, priority: 'x', deadline: 0, period: '' }])).toHaveLength(5);
    expect(validate([{ name: 'A', arrival: 0, burst: 1 }, { name: 'A', arrival: 0, burst: 1 }])).toHaveLength(1);
  });

  it('har bir algoritm id’si noyob va tavsifi bor', () => {
    expect(algorithms.length).toBeGreaterThanOrEqual(6);
    for (const a of algorithms) expect(a.describe({ params: {}, preemptive: false }).length).toBeGreaterThan(10);
  });
});
