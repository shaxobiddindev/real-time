import type { TaskInput } from '../core/types';

/** Amaliy ish hujjatidagi boshlang'ich ma'lumotlar. */
export const SAMPLE_TASKS: TaskInput[] = [
  { name: 'T1', arrival: 0, burst: 5, priority: 3, deadline: 12, period: 10 },
  { name: 'T2', arrival: 0, burst: 3, priority: 1, deadline: 7, period: 6 },
  { name: 'T3', arrival: 0, burst: 2, priority: 5, deadline: 10, period: 12 },
  { name: 'T4', arrival: 0, burst: 4, priority: 2, deadline: 15, period: 8 },
  { name: 'T5', arrival: 0, burst: 6, priority: 4, deadline: 20, period: 14 },
];
