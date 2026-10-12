import { algorithms } from '../algorithms';
import type { ParamValues, TaskInput } from '../core/types';
import { parseCsv, toCsv } from '../lib/files';
import { createRng, randInt } from '../lib/random';
import { SAMPLE_TASKS } from './sample';

export interface TaskRow {
  id: string;
  name: string;
  arrival: string;
  burst: string;
  priority: string;
  deadline: string;
  period: string;
}

export interface SchedulingState {
  tasks: TaskRow[];
  enabled: Record<string, boolean>;
  params: Record<string, ParamValues>;
  preemptive: boolean;
}

export const FIELDS = ['name', 'arrival', 'burst', 'priority', 'deadline', 'period'] as const;
type Field = (typeof FIELDS)[number];

let counter = 0;
export const newId = () => `r${Date.now().toString(36)}${(counter++).toString(36)}`;

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

export function toRow(t: Partial<TaskInput>): TaskRow {
  return {
    id: newId(),
    name: str(t.name),
    arrival: str(t.arrival),
    burst: str(t.burst),
    priority: str(t.priority),
    deadline: str(t.deadline),
    period: str(t.period),
  };
}

export const toInput = (rows: TaskRow[]): TaskInput[] =>
  rows.map(({ name, arrival, burst, priority, deadline, period }) => ({ name, arrival, burst, priority, deadline, period }));

export function defaultState(): SchedulingState {
  return {
    tasks: SAMPLE_TASKS.map(toRow),
    enabled: Object.fromEntries(algorithms.map((a) => [a.id, !!a.enabledByDefault])),
    params: Object.fromEntries(
      algorithms.filter((a) => a.params?.length).map((a) => [a.id, Object.fromEntries(a.params!.map((p) => [p.id, p.default]))]),
    ),
    preemptive: false,
  };
}

/** Saqlangan / ulashilgan holatni xavfsiz tiklaydi (yangi qo'shilgan algoritmlar uchun ham). */
export function restore(raw: unknown): SchedulingState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<SchedulingState> & { tasks?: Partial<TaskInput>[] };
  return {
    tasks: Array.isArray(r.tasks) ? r.tasks.map(toRow) : base.tasks,
    enabled: { ...base.enabled, ...(r.enabled ?? {}) },
    params: Object.fromEntries(Object.entries(base.params).map(([id, p]) => [id, { ...p, ...(r.params?.[id] ?? {}) }])),
    preemptive: !!r.preemptive,
  };
}

/** Saqlash uchun ixcham ko'rinish (qator id'larisiz). */
export function serialize(state: SchedulingState) {
  return {
    tasks: toInput(state.tasks),
    enabled: state.enabled,
    params: state.params,
    preemptive: state.preemptive,
  };
}

// ---- Havola orqali ulashish (base64url JSON) ----
export function encodeShare(state: SchedulingState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(serialize(state)));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(code: string): SchedulingState | null {
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return restore(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

// ---- CSV ----
const HEADER: Field[] = [...FIELDS];

export function tasksToCsv(rows: TaskRow[]): string {
  return toCsv(HEADER, rows.map((r) => HEADER.map((f) => r[f])));
}

/** CSV'dan vazifalar. Sarlavha qatori ixtiyoriy; ustunlar tartibi: name, arrival, burst, priority, deadline, period. */
export function tasksFromCsv(text: string): TaskRow[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const aliases: Record<string, Field> = {
    name: 'name', vazifa: 'name', task: 'name', nomi: 'name',
    arrival: 'arrival', 'arrival time': 'arrival', kelish: 'arrival',
    burst: 'burst', 'burst time': 'burst', bajarilish: 'burst',
    priority: 'priority', ustuvorlik: 'priority',
    deadline: 'deadline', muddat: 'deadline',
    period: 'period', davr: 'period',
  };
  const head = rows[0].map((h) => aliases[h.toLowerCase().replace(/[,(].*$/, '').replace(/\s*ms$/, '').trim()]);
  const hasHeader = head.filter(Boolean).length >= 2;
  const columns: (Field | undefined)[] = hasHeader ? head : HEADER;
  return (hasHeader ? rows.slice(1) : rows).map((cells) => {
    const t: Partial<Record<Field, string>> = {};
    columns.forEach((f, i) => {
      if (f) t[f] = (cells[i] ?? '').replace(/\s*ms$/i, '').replace(',', '.');
    });
    if (t.name !== undefined) t.name = cells[columns.indexOf('name')] ?? '';
    return toRow(t);
  });
}

/** JSON fayldan: to'liq holat yoki faqat vazifalar massivi. */
export function stateFromJson(text: string): SchedulingState {
  const data = JSON.parse(text);
  return restore(Array.isArray(data) ? { tasks: data } : data);
}

// ---- Tasodifiy vazifalar ----
export function randomTasks(count: number, seed?: string): TaskRow[] {
  const rng = createRng(seed || null);
  return Array.from({ length: count }, (_, i) => {
    const arrival = i === 0 ? 0 : randInt(rng, 0, Math.max(2, count));
    const burst = randInt(rng, 1, 8);
    const period = randInt(rng, Math.max(burst + 1, 4), 20);
    return toRow({
      name: `T${i + 1}`,
      arrival,
      burst,
      priority: randInt(rng, 1, count),
      deadline: arrival + burst + randInt(rng, 2, count * 4),
      period,
    });
  });
}
