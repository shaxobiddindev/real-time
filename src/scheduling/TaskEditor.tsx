import { useRef, useState } from 'react';
import { download } from '../lib/files';
import { seriesClass } from '../lib/palette';
import { SAMPLE_TASKS } from './sample';
import {
  type SchedulingState,
  type TaskRow,
  randomTasks,
  serialize,
  stateFromJson,
  tasksFromCsv,
  tasksToCsv,
  toRow,
} from './state';

interface Props {
  state: SchedulingState;
  setState: (updater: (s: SchedulingState) => SchedulingState) => void;
  invalid: Set<string>;
  onShare: () => void;
  notify: (msg: string) => void;
}

const COLUMNS: { field: keyof Omit<TaskRow, 'id' | 'name'>; label: string; hint?: string; step?: string }[] = [
  { field: 'arrival', label: 'Arrival time, ms', step: 'any' },
  { field: 'burst', label: 'Burst, ms', step: 'any' },
  { field: 'priority', label: 'Priority', hint: 'ixtiyoriy', step: '1' },
  { field: 'deadline', label: 'Deadline, ms', hint: 'ixtiyoriy', step: 'any' },
  { field: 'period', label: 'Period, ms', hint: 'ixtiyoriy', step: 'any' },
];

export default function TaskEditor({ state, setState, invalid, onShare, notify }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [randomCount, setRandomCount] = useState(5);

  const update = (id: string, field: keyof TaskRow, value: string) =>
    setState((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, [field]: value } : t)) }));

  const remove = (id: string) => setState((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));

  const move = (index: number, delta: number) =>
    setState((s) => {
      const tasks = [...s.tasks];
      const j = index + delta;
      if (j < 0 || j >= tasks.length) return s;
      [tasks[index], tasks[j]] = [tasks[j], tasks[index]];
      return { ...s, tasks };
    });

  const add = () =>
    setState((s) => {
      const used = new Set(s.tasks.map((t) => t.name));
      let n = s.tasks.length + 1;
      while (used.has(`T${n}`)) n++;
      return { ...s, tasks: [...s.tasks, toRow({ name: `T${n}`, arrival: 0, burst: 1 })] };
    });

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      if (/\.json$/i.test(file.name) || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const next = stateFromJson(text);
        setState(() => next);
      } else {
        const tasks = tasksFromCsv(text);
        if (!tasks.length) throw new Error('bo‘sh');
        setState((s) => ({ ...s, tasks }));
      }
      notify(`“${file.name}” yuklandi`);
    } catch {
      notify('Faylni o‘qib bo‘lmadi. CSV yoki JSON formatini tekshiring.');
    }
  };

  return (
    <>
      <div className="btn-row no-print" style={{ marginBottom: 12 }}>
        <button type="button" className="btn" onClick={add}>
          + Vazifa qo‘shish
        </button>
        <button type="button" className="btn ghost" onClick={() => setState((s) => ({ ...s, tasks: SAMPLE_TASKS.map(toRow) }))}>
          Namuna (amaliy ish)
        </button>
        <span className="btn-row" style={{ gap: 4 }}>
          <button
            type="button"
            className="btn ghost"
            onClick={() => setState((s) => ({ ...s, tasks: randomTasks(randomCount) }))}
          >
            🎲 Tasodifiy
          </button>
          <input
            type="number"
            min={1}
            max={50}
            value={randomCount}
            onChange={(e) => setRandomCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
            aria-label="Tasodifiy vazifalar soni"
            style={{ width: 64 }}
          />
        </span>
        <button type="button" className="btn ghost" onClick={() => setState((s) => ({ ...s, tasks: [] }))}>
          Tozalash
        </button>
        <span className="spacer" />
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
          ⭱ Import
        </button>
        <button type="button" className="btn ghost" onClick={() => download('vazifalar.csv', tasksToCsv(state.tasks), 'text/csv')}>
          ⭳ CSV
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => download('rejalashtirish.json', JSON.stringify(serialize(state), null, 2), 'application/json')}
        >
          ⭳ JSON
        </button>
        <button type="button" className="btn ghost" onClick={onShare}>
          🔗 Havola
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.json,.txt,text/csv,application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
            e.target.value = '';
          }}
        />
      </div>

      <div className="table-scroll">
        <table className="data input-table">
          <thead>
            <tr>
              <th scope="col">Vazifa</th>
              {COLUMNS.map((c) => (
                <th scope="col" key={c.field}>
                  {c.label}
                  {c.hint && <small style={{ textTransform: 'none', letterSpacing: 0 }}> · {c.hint}</small>}
                </th>
              ))}
              <th scope="col" className="no-print">
                <span className="sr-only">Amallar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {state.tasks.map((t, i) => (
              <tr key={t.id}>
                <td>
                  <div className="name-cell">
                    <span className={`swatch ${seriesClass(i)}`} aria-hidden="true" />
                    <input
                      type="text"
                      value={t.name}
                      maxLength={20}
                      aria-label={`${i + 1}-vazifa nomi`}
                      aria-invalid={invalid.has(`${t.id}:name`) || undefined}
                      onChange={(e) => update(t.id, 'name', e.target.value)}
                    />
                  </div>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.field}>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={c.step}
                      min={c.field === 'priority' ? undefined : 0}
                      value={t[c.field]}
                      placeholder={c.hint ? '—' : ''}
                      aria-label={`${t.name || i + 1}: ${c.label}`}
                      aria-invalid={invalid.has(`${t.id}:${c.field}`) || undefined}
                      onChange={(e) => update(t.id, c.field, e.target.value)}
                    />
                  </td>
                ))}
                <td className="no-print">
                  <div className="btn-row" style={{ gap: 4, flexWrap: 'nowrap' }}>
                    <button type="button" className="btn ghost icon" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${t.name}: yuqoriga`}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn ghost icon"
                      onClick={() => move(i, 1)}
                      disabled={i === state.tasks.length - 1}
                      aria-label={`${t.name}: pastga`}
                    >
                      ↓
                    </button>
                    <button type="button" className="btn ghost icon" onClick={() => remove(t.id)} aria-label={`${t.name}ni o‘chirish`}>
                      ✕
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!state.tasks.length && (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 20 }}>
                  Vazifalar yo‘q. “+ Vazifa qo‘shish”, “Namuna” yoki “Import” tugmasidan foydalaning.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
