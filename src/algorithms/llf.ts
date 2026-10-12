import { defineAlgorithm } from './define';

// Qo'shimcha algoritm: kengaytirish namunasi sifatida.
export default defineAlgorithm({
  id: 'llf',
  name: 'LLF',
  title: 'LLF (Least Laxity First)',
  order: 70,
  enabledByDefault: false,
  preemption: 'optional',
  describe: () =>
    'LLF algoritmida bo‘sh vaqti (laxity = deadline − joriy vaqt − qolgan bajarilish vaqti) eng kichik bo‘lgan vazifa birinchi bajariladi. ' +
    'Deadline’i berilmagan vazifa eng oxirida bajariladi.',
  key: (t, s) => [t.deadline === null ? Infinity : t.deadline - s.time - s.remaining, t.arrival],
});
