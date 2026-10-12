/** Foydalanuvchi kiritadigan vazifa (jadvaldagi bitta qator). */
export interface TaskInput {
  name: string;
  arrival: number | string;
  burst: number | string;
  /** Ixtiyoriy. Kichik raqam — yuqori ustuvorlik. */
  priority?: number | string | null;
  /** Ixtiyoriy. Absolyut vaqt (ms) — vazifa shu vaqtgacha tugashi kerak. */
  deadline?: number | string | null;
  /** Ixtiyoriy. Davriy vazifaning davri (ms). */
  period?: number | string | null;
}

/** Hisoblash uchun tayyorlangan vazifa. */
export interface Task {
  /** Jadvaldagi tartib raqami (0 dan). Teng holatlarda shu bo'yicha tanlanadi. */
  index: number;
  name: string;
  arrival: number;
  burst: number;
  priority: number | null;
  deadline: number | null;
  period: number | null;
}

/** Gantt diagrammasining bitta bo'lagi. `task === null` — protsessor bo'sh. */
export interface Segment {
  task: number | null;
  start: number;
  end: number;
}

/** Tanlash paytidagi holat — kalit funksiyasiga uzatiladi. */
export interface PickState {
  /** Joriy vaqt. */
  time: number;
  /** Vazifaning qolgan bajarilish vaqti. */
  remaining: number;
}

/** Algoritm parametri (masalan, Round Robin uchun vaqt kvanti). UI avtomatik chizadi. */
export interface AlgorithmParam {
  id: string;
  label: string;
  default: number;
  min?: number;
  step?: number;
  unit?: string;
}

export type ParamValues = Record<string, number>;

export interface DescribeContext {
  params: ParamValues;
  preemptive: boolean;
}

/** Engine'ning `run` funksiyali algoritmlarga beradigan yordamchilari. */
export interface EngineHelpers {
  EPS: number;
  round: (x: number) => number;
  compareKeys: (a: number[], b: number[]) => number;
  pushSegment: (segments: Segment[], task: number | null, start: number, end: number) => void;
}

interface AlgorithmBase {
  /** Noyob identifikator: URL va saqlashda ishlatiladi. */
  id: string;
  /** Qisqa nom (jadval va diagrammalar uchun). */
  name: string;
  /** To'liq sarlavha. */
  title: string;
  /** Sahifadagi tartib (kichigi oldin). */
  order: number;
  /** Sahifa ochilganda yoqilgan bo'ladimi. */
  enabledByDefault?: boolean;
  /** Algoritm tavsifi (o'zbek tilida). */
  describe: (ctx: DescribeContext) => string;
  /** "Tartib: T3 (2 ms), T2 (3 ms) ..." jumlasi uchun mezon. */
  criterion?: {
    label: string;
    value: (t: Task) => number | null;
    unit?: string;
  };
  /** Qo'shimcha parametrlar. */
  params?: AlgorithmParam[];
  /** Ko'rsatiladigan nom parametrlarga bog'liq bo'lsa (masalan, "Round Robin (q=2)"). */
  label?: (params: ParamValues) => string;
}

/**
 * 1-usul: kalit funksiyasi. Har safar tayyor vazifalar ichidan kaliti eng kichigi tanlanadi
 * (massivlar leksikografik solishtiriladi). Engine bo'sh turish, preemptiv rejim va
 * metrikalarni o'zi hisoblaydi.
 */
export interface KeyedAlgorithm extends AlgorithmBase {
  /**
   * 'never'    — doim preemptiv emas;
   * 'always'   — doim preemptiv;
   * 'optional' — umumiy "Preemptiv rejim" tugmasiga bog'liq.
   */
  preemption: 'never' | 'always' | 'optional';
  key: (task: Task, state: PickState) => number[];
  run?: never;
}

/** 2-usul: o'z simulyatsiyasi (masalan, Round Robin). Gantt bo'laklarini qaytaradi. */
export interface CustomAlgorithm extends AlgorithmBase {
  preemption?: never;
  key?: never;
  run: (tasks: Task[], params: ParamValues, helpers: EngineHelpers) => Segment[];
}

export type Algorithm = KeyedAlgorithm | CustomAlgorithm;

export interface TaskResult {
  name: string;
  arrival: number;
  burst: number;
  completion: number;
  /** Turnaround time = tugash − kelish. */
  tat: number;
  /** Waiting time = TAT − burst. */
  wt: number;
  /** Response time = birinchi ishga tushish − kelish. */
  response: number;
  deadline: number | null;
  /** `null` — deadline berilmagan. */
  met: boolean | null;
}

export interface SimulationResult {
  algorithm: Algorithm;
  label: string;
  params: ParamValues;
  preemptive: boolean;
  tasks: Task[];
  segments: Segment[];
  /** Ketma-ketlik: ["T1", "T2", ...] (bo'sh turishlarsiz). */
  sequence: string[];
  results: TaskResult[];
  sumWT: number;
  sumTAT: number;
  avgWT: number;
  avgTAT: number;
  missed: string[];
  makespan: number;
  idleTime: number;
}
