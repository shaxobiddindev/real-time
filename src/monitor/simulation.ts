import { createRng, uniform } from '../lib/random';
import { type Sensor, sensorById } from './sensors';

export interface MonitorConfig {
  sensorId: string;
  /** O'lchovlar soni (0 — to'xtatilguncha). */
  count: number;
  /** Davriylik, ms. */
  period: number;
  /** Nisbiy deadline, ms: bajarilish + kechikish shu vaqtdan oshmasligi kerak. */
  deadline: number;
  valueMin: number;
  valueMax: number;
  normalMin: number;
  normalMax: number;
  /** 'sim' — tasodifiy bajarilish vaqti; 'real' — brauzerda haqiqiy ishlov berish o'lchanadi. */
  execMode: 'sim' | 'real';
  execMin: number;
  execMax: number;
  /** 'real' rejimdagi ishlov hajmi (ming iteratsiya). */
  workload: number;
  /** 'sim' — tasodifiy kechikish; 'real' — brauzer taymerining haqiqiy kechikishi. */
  latencyMode: 'sim' | 'real';
  latMin: number;
  latMax: number;
  /** Bo'sh bo'lmasa — natijalar takrorlanadi (hamma bir xil natija oladi). */
  seed: string;
  /** Tezlik: 1, 2, 5, 10; 0 — darhol (kutmasdan). */
  speed: number;
  format: 'table' | 'detailed';
}

export function defaultConfig(sensorId = 'harorat'): MonitorConfig {
  const s = sensorById(sensorId);
  return {
    sensorId: s.id,
    count: 10,
    period: 1000,
    deadline: 200,
    valueMin: s.range[0],
    valueMax: s.range[1],
    normalMin: s.normal[0],
    normalMax: s.normal[1],
    execMode: 'sim',
    execMin: 50,
    execMax: 250,
    workload: 200,
    latencyMode: 'sim',
    latMin: 1,
    latMax: 2.5,
    seed: '',
    speed: 1,
    format: 'table',
  };
}

export type Status = 'past' | 'meyorida' | 'yuqori';
export const STATUS_LABEL: Record<Status, string> = { past: 'Past', meyorida: "Me'yorida", yuqori: 'Yuqori' };

export interface Measurement {
  n: number;
  /** O'lchov vaqti (epoch ms, simulyatsiya soati). */
  time: number;
  value: number;
  status: Status;
  /** Bajarilish (ishlov berish) vaqti, ms. */
  exec: number;
  /** Kechikish (ishga tushishdagi kechikish), ms. */
  latency: number;
  /** Jami javob vaqti = bajarilish + kechikish. */
  total: number;
  met: boolean;
  /** Jami vaqt davrdan oshib ketdimi (keyingi o'lchovga xalaqit beradi). */
  overrun: boolean;
}

export function validateConfig(c: MonitorConfig): string[] {
  const e: string[] = [];
  if (!(c.count >= 0) || !Number.isInteger(c.count)) e.push('O‘lchovlar soni butun son (0 — cheksiz) bo‘lishi kerak.');
  if (!(c.period > 0)) e.push('Davriylik 0 dan katta bo‘lishi kerak.');
  if (!(c.deadline > 0)) e.push('Deadline 0 dan katta bo‘lishi kerak.');
  if (!(c.valueMax >= c.valueMin)) e.push('Qiymat oralig‘i: maksimum minimumdan kichik bo‘lmasin.');
  if (!(c.normalMax >= c.normalMin)) e.push('Me’yor oralig‘i: yuqori chegara pastkisidan kichik bo‘lmasin.');
  if (c.execMode === 'sim' && !(c.execMax >= c.execMin && c.execMin >= 0)) e.push('Bajarilish vaqti oralig‘i noto‘g‘ri.');
  if (c.execMode === 'real' && !(c.workload > 0)) e.push('Ishlov hajmi 0 dan katta bo‘lishi kerak.');
  if (c.latencyMode === 'sim' && !(c.latMax >= c.latMin && c.latMin >= 0)) e.push('Kechikish oralig‘i noto‘g‘ri.');
  if (c.speed === 0 && c.count === 0) e.push('“Darhol” rejimida o‘lchovlar soni cheksiz bo‘lishi mumkin emas.');
  return e;
}

export function classify(value: number, c: MonitorConfig): Status {
  if (value < c.normalMin) return 'past';
  if (value > c.normalMax) return 'yuqori';
  return 'meyorida';
}

/**
 * Haqiqiy ishlov berish: o'qishlarni filtrlash (sirpanuvchi o'rtacha) va kalibrlash.
 * Brauzerda `performance.now()` bilan o'lchanadi.
 */
export function processReading(value: number, workload: number): { result: number; elapsed: number } {
  const t0 = performance.now();
  let acc = value;
  const iterations = Math.round(workload * 1000);
  for (let i = 1; i <= iterations; i++) acc = acc * 0.999 + Math.sin(value + i) * 0.001;
  return { result: acc, elapsed: performance.now() - t0 };
}

/** O'lchov generatori: har bir chaqiruv keyingi o'lchovni qaytaradi. */
export function createGenerator(c: MonitorConfig) {
  const rng = createRng(c.seed || null);
  const sensor = sensorById(c.sensorId);
  const f = 10 ** sensor.decimals;
  return (n: number, time: number, realLatency = 0): Measurement => {
    const value = Math.round(uniform(rng, c.valueMin, c.valueMax) * f) / f;
    const execSim = uniform(rng, c.execMin, c.execMax);
    const latSim = uniform(rng, c.latMin, c.latMax);
    const exec = c.execMode === 'real' ? processReading(value, c.workload).elapsed : execSim;
    const latency = c.latencyMode === 'real' ? Math.max(0, realLatency) : latSim;
    const total = exec + latency;
    return {
      n,
      time,
      value,
      status: classify(value, c),
      exec,
      latency,
      total,
      met: total <= c.deadline,
      overrun: total > c.period,
    };
  };
}

export interface MonitorSummary {
  count: number;
  met: number;
  missed: number;
  rate: number;
  avgExec: number;
  maxExec: number;
  avgLatency: number;
  maxLatency: number;
  avgTotal: number;
  maxTotal: number;
  avgValue: number;
  minValue: number;
  maxValue: number;
  statuses: Record<Status, number>;
  overruns: number;
}

export function summarize(list: Measurement[]): MonitorSummary {
  const n = list.length;
  const sum = (f: (m: Measurement) => number) => list.reduce((s, m) => s + f(m), 0);
  const max = (f: (m: Measurement) => number) => (n ? Math.max(...list.map(f)) : 0);
  const met = list.filter((m) => m.met).length;
  const statuses: Record<Status, number> = { past: 0, meyorida: 0, yuqori: 0 };
  list.forEach((m) => statuses[m.status]++);
  return {
    count: n,
    met,
    missed: n - met,
    rate: n ? (met / n) * 100 : 0,
    avgExec: n ? sum((m) => m.exec) / n : 0,
    maxExec: max((m) => m.exec),
    avgLatency: n ? sum((m) => m.latency) / n : 0,
    maxLatency: max((m) => m.latency),
    avgTotal: n ? sum((m) => m.total) / n : 0,
    maxTotal: max((m) => m.total),
    avgValue: n ? sum((m) => m.value) / n : 0,
    minValue: n ? Math.min(...list.map((m) => m.value)) : 0,
    maxValue: max((m) => m.value),
    statuses,
    overruns: list.filter((m) => m.overrun).length,
  };
}

// ---------- Konsol formati ----------
const RULE = '-'.repeat(100);
const pad = (s: string, w: number) => s.padStart(w);
const clock = (t: number) => {
  const d = new Date(t);
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((x) => String(x).padStart(2, '0')).join(':');
};

export function consoleHeader(c: MonitorConfig, sensor: Sensor = sensorById(c.sensorId)): string[] {
  return [
    sensor.systemTitle,
    `O'lchovlar soni: ${c.count || 'cheksiz'}`,
    `Davriylik: ${c.period} ms`,
    `Deadline: ${c.deadline} ms`,
    `Me'yor: ${c.normalMin} – ${c.normalMax} ${sensor.unit}`,
    RULE,
  ];
}

export function consoleRow(m: Measurement, c: MonitorConfig, sensor: Sensor = sensorById(c.sensorId)): string[] {
  const value = m.value.toFixed(sensor.decimals);
  if (c.format === 'detailed') {
    return [
      `[${clock(m.time)}] ${sensor.valueLabel}: ${value} ${sensor.unit}`,
      `  Holat: ${STATUS_LABEL[m.status]}`,
      `  Ishlov berish vaqti: ${m.exec.toFixed(3)} ms`,
      `  Kechikish: ${m.latency.toFixed(3)} ms`,
      `  Deadline: ${m.met ? 'bajarildi' : 'BAJARILMADI'}`,
      '',
    ];
  }
  const width = Math.max(2, String(c.count || m.n).length);
  return [
    [
      `#${String(m.n).padStart(width, '0')}`,
      `${sensor.valueLabel}: ${value} ${sensor.unit}`,
      `Bajarilish: ${pad(m.exec.toFixed(2), 6)} ms`,
      `Kechikish: ${pad(m.latency.toFixed(2), 5)} ms`,
      `Jami: ${pad(m.total.toFixed(2), 6)} ms`,
      `Deadline: ${m.met ? 'ULGURDI' : 'ULGURMADI'}`,
    ].join(' | '),
  ];
}

export function consoleSummary(list: Measurement[], c: MonitorConfig, sensor: Sensor = sensorById(c.sensorId)): string[] {
  const s = summarize(list);
  return [
    RULE,
    'YAKUNIY HISOBOT',
    `Jami o'lchovlar: ${s.count}`,
    `Deadlinega ulgurgan: ${s.met}`,
    `Deadlinega ulgurmagan: ${s.missed}`,
    `Ulgurish darajasi: ${s.rate.toFixed(1)} %`,
    `O'rtacha bajarilish vaqti: ${s.avgExec.toFixed(2)} ms`,
    `Maksimal bajarilish vaqti: ${s.maxExec.toFixed(2)} ms`,
    `O'rtacha kechikish: ${s.avgLatency.toFixed(2)} ms`,
    `O'rtacha jami vaqt: ${s.avgTotal.toFixed(2)} ms`,
    `O'rtacha ${sensor.valueLabel.toLowerCase()}: ${s.avgValue.toFixed(sensor.decimals)} ${sensor.unit} (min ${s.minValue.toFixed(sensor.decimals)}, max ${s.maxValue.toFixed(sensor.decimals)})`,
    `Holatlar: Me'yorida ${s.statuses.meyorida}, Yuqori ${s.statuses.yuqori}, Past ${s.statuses.past}`,
    ...(s.overruns ? [`Davrdan oshib ketgan o'lchovlar: ${s.overruns}`] : []),
  ];
}

export function measurementsCsv(list: Measurement[], c: MonitorConfig): string {
  const sensor = sensorById(c.sensorId);
  const header = ['n', 'vaqt', `${sensor.valueLabel} (${sensor.unit})`, 'holat', 'bajarilish_ms', 'kechikish_ms', 'jami_ms', 'deadline_ms', 'natija'];
  const rows = list.map((m) => [
    m.n,
    new Date(m.time).toISOString(),
    m.value.toFixed(sensor.decimals),
    STATUS_LABEL[m.status],
    m.exec.toFixed(3),
    m.latency.toFixed(3),
    m.total.toFixed(3),
    c.deadline,
    m.met ? 'ULGURDI' : 'ULGURMADI',
  ]);
  return [header, ...rows].map((r) => r.join(',')).join('\n') + '\n';
}
