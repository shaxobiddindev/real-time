import { defineAlgorithm } from './define';

export default defineAlgorithm({
  id: 'priority',
  name: 'Priority',
  title: 'Priority (ustuvorlik bo‘yicha)',
  order: 30,
  enabledByDefault: true,
  preemption: 'optional',
  describe: ({ preemptive }) =>
    'Bu algoritmda vazifalar ustuvorligi bo‘yicha bajariladi. Ustuvorlik raqami qancha kichik bo‘lsa, ustuvorlik shuncha yuqori ' +
    '(1 — eng yuqori). Ustuvorligi berilmagan vazifa eng oxirida bajariladi.' +
    (preemptive ? ' Preemptiv rejimda yuqoriroq ustuvorlikdagi vazifa kelsa, joriy vazifa to‘xtatiladi.' : ''),
  criterion: { label: 'Ustuvorlik bo‘yicha tartib', value: (t) => t.priority },
  key: (t) => [t.priority ?? Infinity, t.arrival],
});
