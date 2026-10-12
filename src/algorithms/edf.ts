import { defineAlgorithm } from './define';

export default defineAlgorithm({
  id: 'edf',
  name: 'EDF',
  title: 'EDF (Earliest Deadline First)',
  order: 50,
  enabledByDefault: true,
  preemption: 'optional',
  describe: () =>
    'EDF algoritmida deadline’i eng yaqin bo‘lgan vazifa birinchi bajariladi. Deadline’i berilmagan vazifa eng oxirida bajariladi.',
  criterion: { label: 'Deadline’lar bo‘yicha tartib', value: (t) => t.deadline, unit: 'ms' },
  key: (t) => [t.deadline ?? Infinity, t.arrival],
});
