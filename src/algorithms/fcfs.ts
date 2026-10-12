import { defineAlgorithm } from './define';

export default defineAlgorithm({
  id: 'fcfs',
  name: 'FCFS',
  title: 'FCFS (First Come First Served)',
  order: 10,
  enabledByDefault: true,
  preemption: 'never',
  describe: () =>
    'FCFS algoritmida vazifalar navbatga kelish tartibida bajariladi. Bir vaqtda kelgan vazifalar jadvaldagi tartibda olinadi. ' +
    'Algoritm preemptiv emas, ya’ni boshlangan vazifa oxirigacha bajariladi.',
  criterion: { label: 'Kelish tartibi', value: (t) => t.arrival, unit: 'ms' },
  key: (t) => [t.arrival],
});
