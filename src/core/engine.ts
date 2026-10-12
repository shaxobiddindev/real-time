import type {
  Algorithm,
  EngineHelpers,
  KeyedAlgorithm,
  ParamValues,
  Segment,
  SimulationResult,
  Task,
  TaskInput,
} from './types';

export const EPS = 1e-9;
export const round = (x: number) => Math.round(x * 1e6) / 1e6;

export function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x === y) continue; // Infinity === Infinity ham shu yerda
    if (Math.abs(x - y) > EPS) return x < y ? -1 : 1;
  }
  return 0;
}

export function pushSegment(segments: Segment[], task: number | null, start: number, end: number) {
  if (end - start <= EPS) return;
  const last = segments[segments.length - 1];
  if (last && last.task === task && Math.abs(last.end - start) <= EPS) {
    last.end = round(end);
  } else {
    segments.push({ task, start: round(start), end: round(end) });
  }
}

export const helpers: EngineHelpers = { EPS, round, compareKeys, pushSegment };

const isBlank = (v: unknown) => v === '' || v === null || v === undefined;
const toNumber = (v: unknown) => (isBlank(v) ? NaN : Number(v));
const optional = (v: unknown) => (isBlank(v) ? null : Number(v));

export function normalize(tasks: TaskInput[]): Task[] {
  return tasks.map((t, index) => ({
    index,
    name: String(t.name).trim(),
    arrival: toNumber(t.arrival),
    burst: toNumber(t.burst),
    priority: optional(t.priority),
    deadline: optional(t.deadline),
    period: optional(t.period),
  }));
}

/** Kiritilgan ma'lumotlarni tekshiradi. Xatolar ro'yxatini qaytaradi (bo'sh — hammasi to'g'ri). */
export function validate(tasks: TaskInput[]): string[] {
  const errors: string[] = [];
  if (!tasks.length) errors.push('Kamida bitta vazifa kiriting.');
  const names = new Set<string>();
  tasks.forEach((t, i) => {
    const name = String(t.name ?? '').trim();
    const label = name || `${i + 1}-qator`;
    if (!name) errors.push(`${i + 1}-qator: vazifa nomi bo‘sh.`);
    else if (names.has(name)) errors.push(`${label}: nom takrorlangan.`);
    names.add(name);

    const arrival = toNumber(t.arrival);
    const burst = toNumber(t.burst);
    if (!Number.isFinite(arrival) || arrival < 0) errors.push(`${label}: Arrival time ≥ 0 bo‘lishi kerak.`);
    if (!Number.isFinite(burst) || burst <= 0) errors.push(`${label}: Burst > 0 bo‘lishi kerak.`);
    if (!isBlank(t.priority) && !Number.isFinite(Number(t.priority))) errors.push(`${label}: Priority son bo‘lishi kerak.`);
    for (const [field, value] of [['Deadline', t.deadline], ['Period', t.period]] as const) {
      if (!isBlank(value) && !(Number(value) > 0)) errors.push(`${label}: ${field} > 0 bo‘lishi kerak (yoki bo‘sh qoldiring).`);
    }
  });
  return errors;
}

/** Kalit funksiyali algoritmlar uchun umumiy simulyator. */
function runKeyed(tasks: Task[], algo: KeyedAlgorithm, preemptive: boolean): Segment[] {
  const remaining = tasks.map((t) => t.burst);
  const segments: Segment[] = [];
  let done = 0;
  let time = 0;

  while (done < tasks.length) {
    const pending = tasks.filter((t) => remaining[t.index] > EPS);
    const ready = pending.filter((t) => t.arrival <= time + EPS);

    if (!ready.length) {
      const next = Math.min(...pending.map((t) => t.arrival));
      pushSegment(segments, null, time, next);
      time = next;
      continue;
    }

    const keyOf = (t: Task) => algo.key(t, { time, remaining: remaining[t.index] });
    ready.sort((a, b) => compareKeys(keyOf(a), keyOf(b)) || a.index - b.index);
    const current = ready[0];
    let until = time + remaining[current.index];

    if (preemptive) {
      // Yangi vazifa kelgan paytda tanlov qaytadan qilinadi.
      const upcoming = pending.filter((t) => t.arrival > time + EPS).map((t) => t.arrival);
      if (upcoming.length) until = Math.min(until, ...upcoming);
    }

    pushSegment(segments, current.index, time, until);
    remaining[current.index] = round(remaining[current.index] - (until - time));
    time = round(until);
    if (remaining[current.index] <= EPS) done++;
  }
  return segments;
}

export function resolveParams(algo: Algorithm, values: Partial<ParamValues> = {}): ParamValues {
  const params: ParamValues = {};
  for (const p of algo.params ?? []) {
    const v = Number(values[p.id]);
    params[p.id] = Number.isFinite(v) && v >= (p.min ?? -Infinity) ? v : p.default;
  }
  return params;
}

export function isPreemptive(algo: Algorithm, preemptiveMode: boolean): boolean {
  if (algo.run) return true; // o'z simulyatsiyasi — engine aralashmaydi
  return algo.preemption === 'always' || (algo.preemption === 'optional' && preemptiveMode);
}

export interface SimulateOptions {
  params?: Partial<ParamValues>;
  preemptive?: boolean;
}

/** Bitta algoritmni ishga tushiradi va barcha ko'rsatkichlarni hisoblaydi. */
export function simulate(input: TaskInput[], algo: Algorithm, options: SimulateOptions = {}): SimulationResult {
  const tasks = normalize(input);
  const params = resolveParams(algo, options.params);
  const preemptive = algo.run ? false : isPreemptive(algo, !!options.preemptive);
  const segments = algo.run ? algo.run(tasks, params, helpers) : runKeyed(tasks, algo, preemptive);

  const completion = tasks.map(() => 0);
  const firstStart = tasks.map(() => Infinity);
  let idleTime = 0;
  for (const s of segments) {
    if (s.task === null) {
      idleTime += s.end - s.start;
      continue;
    }
    completion[s.task] = Math.max(completion[s.task], s.end);
    firstStart[s.task] = Math.min(firstStart[s.task], s.start);
  }

  const results = tasks.map((t) => {
    const tat = round(completion[t.index] - t.arrival);
    return {
      name: t.name,
      arrival: t.arrival,
      burst: t.burst,
      completion: completion[t.index],
      tat,
      wt: round(tat - t.burst),
      response: round(firstStart[t.index] - t.arrival),
      deadline: t.deadline,
      met: t.deadline === null ? null : completion[t.index] <= t.deadline + EPS,
    };
  });

  const n = tasks.length || 1;
  const sumWT = round(results.reduce((s, r) => s + r.wt, 0));
  const sumTAT = round(results.reduce((s, r) => s + r.tat, 0));

  return {
    algorithm: algo,
    label: algo.label ? algo.label(params) : algo.name,
    params,
    preemptive,
    tasks,
    segments,
    sequence: segments.filter((s) => s.task !== null).map((s) => tasks[s.task as number].name),
    results,
    sumWT,
    sumTAT,
    avgWT: round(sumWT / n),
    avgTAT: round(sumTAT / n),
    missed: results.filter((r) => r.met === false).map((r) => r.name),
    makespan: segments.length ? segments[segments.length - 1].end : 0,
    idleTime: round(idleTime),
  };
}

export interface Utilization {
  parts: { name: string; burst: number; period: number; value: number }[];
  U: number;
  n: number;
  /** Liu–Layland chegarasi: n·(2^(1/n) − 1). */
  rmsBound: number;
  rmsGuaranteed: boolean;
  edfSchedulable: boolean;
}

/** Protsessor yuklanishi. Davri berilmagan vazifa bo'lsa `null`. */
export function utilization(input: TaskInput[]): Utilization | null {
  const tasks = normalize(input);
  if (!tasks.length || tasks.some((t) => t.period === null)) return null;
  const parts = tasks.map((t) => ({
    name: t.name,
    burst: t.burst,
    period: t.period as number,
    value: t.burst / (t.period as number),
  }));
  const n = tasks.length;
  const U = parts.reduce((s, p) => s + p.value, 0);
  const rmsBound = n * (Math.pow(2, 1 / n) - 1);
  return { parts, U, n, rmsBound, rmsGuaranteed: U <= rmsBound + EPS, edfSchedulable: U <= 1 + EPS };
}
