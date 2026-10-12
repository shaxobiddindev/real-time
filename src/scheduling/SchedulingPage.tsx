import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { PageProps } from '../App';
import { algorithms } from '../algorithms';
import { simulate, utilization, validate } from '../core/engine';
import { clearQuery, shareUrl } from '../hooks/useHashRoute';
import { copyText } from '../lib/files';
import { load, save } from '../lib/storage';
import { AlgorithmReport, ComparisonChart, Conclusion, SummaryTable, TaskLegend, UtilizationReport, anchor, jump } from './Results';
import { type SchedulingState, decodeShare, defaultState, encodeShare, restore, serialize, toInput } from './state';
import TaskEditor from './TaskEditor';

const STORAGE_KEY = 'rt.scheduling.v1';

function initialState(query: URLSearchParams): { state: SchedulingState; fromLink: boolean } {
  const shared = query.get('d');
  if (shared) {
    const s = decodeShare(shared);
    if (s) return { state: s, fromLink: true };
  }
  return { state: restore(load(STORAGE_KEY, serialize(defaultState()))), fromLink: false };
}

/** Qaysi maydonlar noto'g'ri — inputlarni belgilash uchun. */
function invalidFields(state: SchedulingState): Set<string> {
  const bad = new Set<string>();
  const names = new Map<string, number>();
  state.tasks.forEach((t) => names.set(t.name.trim(), (names.get(t.name.trim()) ?? 0) + 1));
  for (const t of state.tasks) {
    if (!t.name.trim() || (names.get(t.name.trim()) ?? 0) > 1) bad.add(`${t.id}:name`);
    if (t.arrival === '' || !(Number(t.arrival) >= 0)) bad.add(`${t.id}:arrival`);
    if (!(Number(t.burst) > 0)) bad.add(`${t.id}:burst`);
    if (t.priority !== '' && !Number.isFinite(Number(t.priority))) bad.add(`${t.id}:priority`);
    if (t.deadline !== '' && !(Number(t.deadline) > 0)) bad.add(`${t.id}:deadline`);
    if (t.period !== '' && !(Number(t.period) > 0)) bad.add(`${t.id}:period`);
  }
  return bad;
}

export default function SchedulingPage({ query, path, notify }: PageProps) {
  const [{ state: initial, fromLink }] = useState(() => initialState(query));
  const [state, setState] = useState(initial);

  useEffect(() => {
    if (fromLink) {
      clearQuery(path);
      notify('Havoladagi ma’lumotlar yuklandi');
    }
  }, [fromLink, path, notify]);

  useEffect(() => save(STORAGE_KEY, serialize(state)), [state]);

  // Yozish paytida interfeys qotib qolmasligi uchun hisob-kitob "kechiktirilgan" holatdan olinadi.
  const deferred = useDeferredValue(state);
  const inputs = useMemo(() => toInput(deferred.tasks), [deferred.tasks]);
  const errors = useMemo(() => validate(inputs), [inputs]);
  const invalid = useMemo(() => invalidFields(state), [state]);

  const results = useMemo(() => {
    if (errors.length) return [];
    return algorithms
      .filter((a) => deferred.enabled[a.id])
      .map((a) => simulate(inputs, a, { params: deferred.params[a.id], preemptive: deferred.preemptive }));
  }, [errors, inputs, deferred.enabled, deferred.params, deferred.preemptive]);

  const util = useMemo(() => (errors.length ? null : utilization(inputs)), [errors, inputs]);
  const hasOptionalPreemption = algorithms.some((a) => !a.run && a.preemption === 'optional');

  const share = async () => {
    const url = shareUrl(path, { d: encodeShare(state) });
    if (await copyText(url)) notify('Havola nusxalandi — uni istalgan kishiga yuborishingiz mumkin');
    else window.prompt('Havolani nusxalang:', url);
  };

  let n = 0;

  return (
    <main className="wrap">
      <section className="hero">
        <p className="eyebrow">Amaliy ish</p>
        <h1>Real vaqt tizimlarida rejalashtirish algoritmlarini taqqoslash</h1>
        <p className="lead">
          Vazifalarni kiriting yoki o‘zgartiring — Gantt diagrammasi, o‘rtacha kutish vaqti (WT), aylanish vaqti (TAT) va
          deadline natijalari darhol qayta hisoblanadi. Natijani havola orqali ulashing yoki PDF qilib chop eting.
        </p>
      </section>

      <section className="card" aria-labelledby="input-h">
        <div className="card-head">
          <h2 id="input-h">Boshlang‘ich ma’lumotlar</h2>
          <button type="button" className="btn ghost no-print" onClick={() => window.print()}>
            🖶 Chop etish / PDF
          </button>
        </div>

        <TaskEditor state={state} setState={setState} invalid={invalid} onShare={share} notify={notify} />

        <div className="settings no-print">
          <fieldset>
            <legend>Algoritmlar</legend>
            <div className="chips">
              {algorithms.map((a) => (
                <label key={a.id} className="chip">
                  <input
                    type="checkbox"
                    checked={!!state.enabled[a.id]}
                    onChange={(e) => setState((s) => ({ ...s, enabled: { ...s.enabled, [a.id]: e.target.checked } }))}
                  />
                  {a.name}
                  {!a.enabledByDefault && <span className="tag">qo‘shimcha</span>}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="param-row">
            {algorithms.flatMap((a) =>
              (a.params ?? []).map((p) => (
                <label className="field" key={`${a.id}.${p.id}`}>
                  <span>
                    {a.name}: {p.label}
                    {p.unit ? `, ${p.unit}` : ''}
                  </span>
                  <input
                    type="number"
                    min={p.min}
                    step={p.step ?? 'any'}
                    value={state.params[a.id]?.[p.id] ?? p.default}
                    disabled={!state.enabled[a.id]}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        params: { ...s.params, [a.id]: { ...s.params[a.id], [p.id]: e.target.value === '' ? p.default : Number(e.target.value) } },
                      }))
                    }
                  />
                </label>
              )),
            )}
            {hasOptionalPreemption && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={state.preemptive}
                  onChange={(e) => setState((s) => ({ ...s, preemptive: e.target.checked }))}
                />
                <span>
                  Preemptiv rejim
                  <br />
                  <small>SJF → SRTF, Priority, EDF, RMS, LLF: yangi vazifa kelganda qayta tanlanadi</small>
                </span>
              </label>
            )}
          </div>
        </div>

        <p className="note">
          TAT = Tugash vaqti − Arrival time; WT = TAT − Burst time; Response = birinchi ishga tushish − Arrival time. Ustuvorlik
          raqami qancha kichik bo‘lsa, ustuvorlik shuncha yuqori. Deadline — absolyut vaqt. Hisob-kitoblar har bir vazifaning
          birinchi nusxasi uchun bajariladi; teng holatda jadvaldagi tartib hal qiladi.
        </p>

        {errors.length > 0 && (
          <ul className="errors" role="alert">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        )}
      </section>

      {results.length > 0 && (
        <>
          <nav className="toc no-print" aria-label="Natijalar bo‘limlari">
            {results.map((r) => (
              <a key={r.algorithm.id} href={`#${anchor(r.algorithm.id)}`} onClick={(e) => jump(e, anchor(r.algorithm.id))}>
                {r.label}
              </a>
            ))}
            <a href="#natijalar" onClick={(e) => jump(e, 'natijalar')}>
              Natijalar jadvali
            </a>
            <a href="#xulosa" onClick={(e) => jump(e, 'xulosa')}>
              Xulosa
            </a>
          </nav>

          <div className="card" style={{ padding: '12px 20px' }}>
            <TaskLegend results={results} />
          </div>

          {results.map((r) => (
            <AlgorithmReport key={r.algorithm.id} result={r} num={++n} />
          ))}

          <section className="card" id="natijalar" aria-labelledby="natijalar-h">
            <div className="card-head">
              <h2 id="natijalar-h">Natijalar jadvali</h2>
            </div>
            <SummaryTable results={results} />
            {results.length > 1 && (
              <>
                <h3>Taqqoslash</h3>
                <ComparisonChart results={results} />
              </>
            )}
          </section>

          <section className="card" aria-labelledby="util-h">
            <div className="card-head">
              <h2 id="util-h">Protsessor yuklanishini tekshirish</h2>
            </div>
            <UtilizationReport util={util} />
          </section>

          <section className="card" id="xulosa" aria-labelledby="xulosa-h">
            <div className="card-head">
              <h2 id="xulosa-h">Xulosa</h2>
            </div>
            <Conclusion results={results} util={util} />
          </section>
        </>
      )}

      {!errors.length && !results.length && (
        <div className="empty">Kamida bitta algoritmni tanlang.</div>
      )}
    </main>
  );
}
