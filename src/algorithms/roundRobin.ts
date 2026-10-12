import type { Segment } from '../core/types';
import { defineAlgorithm } from './define';

export default defineAlgorithm({
  id: 'rr',
  name: 'Round Robin',
  title: 'Round Robin',
  order: 40,
  enabledByDefault: true,
  params: [{ id: 'quantum', label: 'Vaqt kvanti (q)', default: 2, min: 0.1, step: 0.5, unit: 'ms' }],
  label: ({ quantum }) => `Round Robin (q=${String(quantum).replace('.', ',')})`,
  describe: ({ params }) =>
    `Har bir vazifa navbat bilan q = ${String(params.quantum).replace('.', ',')} ms dan bajariladi, tugamagan vazifa navbat oxiriga qo‘yiladi. ` +
    'Kvant davomida kelgan yangi vazifalar to‘xtatilgan vazifadan oldin navbatga turadi.',
  run: (tasks, { quantum }, { EPS, round, compareKeys, pushSegment }) => {
    const byArrival = [...tasks].sort((a, b) => compareKeys([a.arrival, a.index], [b.arrival, b.index]));
    const remaining = tasks.map((t) => t.burst);
    const segments: Segment[] = [];
    const queue: typeof tasks = [];
    let next = 0;
    let time = 0;
    let done = 0;

    const admit = () => {
      while (next < byArrival.length && byArrival[next].arrival <= time + EPS) queue.push(byArrival[next++]);
    };

    admit();
    while (done < tasks.length) {
      const current = queue.shift();
      if (!current) {
        const arrival = byArrival[next].arrival;
        pushSegment(segments, null, time, arrival);
        time = arrival;
        admit();
        continue;
      }
      const slice = Math.min(quantum, remaining[current.index]);
      pushSegment(segments, current.index, time, time + slice);
      time = round(time + slice);
      remaining[current.index] = round(remaining[current.index] - slice);
      admit();
      if (remaining[current.index] > EPS) queue.push(current);
      else done++;
    }
    return segments;
  },
});
