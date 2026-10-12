import { defineAlgorithm } from './define';

export default defineAlgorithm({
  id: 'rms',
  name: 'RMS',
  title: 'RMS (Rate Monotonic Scheduling)',
  order: 60,
  enabledByDefault: true,
  preemption: 'optional',
  describe: () =>
    'RMS algoritmida ustuvorlik vazifaning davriga qarab beriladi: davri qancha qisqa bo‘lsa, ustuvorligi shuncha yuqori.',
  criterion: { label: 'Davrlar bo‘yicha tartib', value: (t) => t.period, unit: 'ms' },
  key: (t) => [t.period ?? Infinity, t.arrival],
});
