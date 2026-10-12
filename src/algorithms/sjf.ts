import { defineAlgorithm } from './define';

export default defineAlgorithm({
  id: 'sjf',
  name: 'SJF',
  title: 'SJF (Shortest Job First)',
  order: 20,
  enabledByDefault: true,
  preemption: 'optional',
  describe: ({ preemptive }) =>
    preemptive
      ? 'Preemptiv rejimda (SRTF — Shortest Remaining Time First) har safar yangi vazifa kelganda qolgan bajarilish vaqti eng qisqa vazifa tanlanadi.'
      : 'SJF algoritmida birinchi bo‘lib bajarilish vaqti eng qisqa bo‘lgan vazifa tanlanadi. Algoritm preemptiv emas.',
  criterion: { label: 'Burst vaqtlari bo‘yicha tartib', value: (t) => t.burst, unit: 'ms' },
  // Preemptiv bo'lmagan rejimda boshlanmagan vazifa uchun remaining === burst.
  key: (t, s) => [s.remaining, t.arrival],
});
