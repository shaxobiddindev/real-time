import { defineAlgorithm } from './define';

// Qo'shimcha algoritm: kengaytirish namunasi sifatida.
export default defineAlgorithm({
  id: 'hrrn',
  name: 'HRRN',
  title: 'HRRN (Highest Response Ratio Next)',
  order: 80,
  enabledByDefault: false,
  preemption: 'never',
  describe: () =>
    'HRRN algoritmida javob koeffitsienti R = (kutish vaqti + burst) / burst eng katta bo‘lgan vazifa tanlanadi. ' +
    'Qisqa vazifalar oldinga o‘tadi, uzoq kutgan vazifalar esa "och qolmaydi". Algoritm preemptiv emas.',
  key: (t, s) => [-((s.time - t.arrival + t.burst) / t.burst), t.arrival],
});
