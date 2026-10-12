import { useEffect, useMemo, useRef, useState } from 'react';
import type { PageProps } from '../App';
import { clearQuery, shareUrl } from '../hooks/useHashRoute';
import { copyText, download } from '../lib/files';
import { load, save } from '../lib/storage';
import { ResponseChart, ValueChart } from './Charts';
import { SENSORS, sensorById } from './sensors';
import {
  type MonitorConfig,
  consoleHeader,
  consoleRow,
  consoleSummary,
  defaultConfig,
  measurementsCsv,
  summarize,
  validateConfig,
} from './simulation';
import { useMonitor } from './useMonitor';

const STORAGE_KEY = 'rt.monitor.v1';
const SPEEDS = [
  { value: 1, label: '×1 real' },
  { value: 2, label: '×2' },
  { value: 5, label: '×5' },
  { value: 10, label: '×10' },
  { value: 0, label: 'Darhol' },
];

function fromQuery(q: URLSearchParams): MonitorConfig | null {
  if (!q.has('m')) return null;
  try {
    return { ...defaultConfig(), ...JSON.parse(q.get('m')!) };
  } catch {
    return null;
  }
}

function NumberField({
  label,
  value,
  onChange,
  step = 'any',
  min,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string | number;
  min?: number;
  hint?: string;
  disabled?: boolean;
}) {
  // Matn ko'rinishida saqlaymiz — foydalanuvchi "1." yoki bo'sh qatorni yozayotganda raqam buzilmasin.
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (Number(text) !== value) setText(String(value));
  }, [value]);
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          setText(e.target.value);
          if (e.target.value !== '' && Number.isFinite(Number(e.target.value))) onChange(Number(e.target.value));
        }}
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  disabled,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" aria-pressed={o.value === value} disabled={disabled} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function MonitorPage({ query, path, notify }: PageProps) {
  const [shared] = useState(() => fromQuery(query));
  const [cfg, setCfg] = useState<MonitorConfig>(() => shared ?? load(STORAGE_KEY, defaultConfig()));
  const mon = useMonitor();
  const consoleRef = useRef<HTMLPreElement>(null);
  const [follow, setFollow] = useState(true);

  useEffect(() => {
    if (shared) {
      clearQuery(path);
      notify('Havoladagi sozlamalar yuklandi');
    }
  }, [shared, path, notify]);

  useEffect(() => save(STORAGE_KEY, cfg), [cfg]);

  const set = <K extends keyof MonitorConfig>(key: K, value: MonitorConfig[K]) => setCfg((c) => ({ ...c, [key]: value }));
  const errors = useMemo(() => validateConfig(cfg), [cfg]);
  const busy = mon.status === 'running' || mon.status === 'paused';
  const active = mon.config ?? cfg; // ishlayotgan paytda boshlangan sozlamalar
  const sensor = sensorById(active.sensorId);
  const list = mon.measurements;
  const summary = useMemo(() => summarize(list), [list]);

  const consoleText = useMemo(() => {
    if (!mon.config) return '';
    const view = { ...mon.config, format: cfg.format }; // formatni ishlash paytida ham almashtirish mumkin
    const lines = [...consoleHeader(view)];
    for (const m of list) lines.push(...consoleRow(m, view));
    if (mon.status === 'done' && list.length) lines.push(...consoleSummary(list, view));
    return lines.join('\n');
  }, [list, mon.config, mon.status, cfg.format]);

  useEffect(() => {
    const el = consoleRef.current;
    if (el && follow) el.scrollTop = el.scrollHeight;
  }, [consoleText, follow]);

  const changeSensor = (id: string) => {
    const d = defaultConfig(id);
    setCfg((c) => ({ ...c, sensorId: id, valueMin: d.valueMin, valueMax: d.valueMax, normalMin: d.normalMin, normalMax: d.normalMax }));
  };

  const share = async () => {
    const url = shareUrl(path, { m: JSON.stringify(cfg) });
    if (await copyText(url)) notify('Sozlamalar havolasi nusxalandi');
    else window.prompt('Havolani nusxalang:', url);
  };

  const progress = active.count ? Math.min(100, (list.length / active.count) * 100) : null;
  const s = sensorById(cfg.sensorId);

  return (
    <main className="wrap">
      <section className="hero">
        <p className="eyebrow">Real vaqt tizimi</p>
        <h1>{s.valueLabel}ni o‘lchash tizimi — davriy vazifa va deadline</h1>
        <p className="lead">
          Har {cfg.period} ms da sensor qiymati o‘lchanadi va qayta ishlanadi. Bajarilish va kechikish yig‘indisi (jami javob
          vaqti) {cfg.deadline} ms deadline’dan oshmasa — vazifa o‘z muddatiga <b>ulgurdi</b>. Barcha parametrlarni o‘zgartirib,
          tizimni haqiqiy vaqtda kuzating.
        </p>
      </section>

      <div className="monitor-layout">
        <section className="card no-print" aria-labelledby="cfg-h">
          <div className="card-head">
            <h2 id="cfg-h">Sozlamalar</h2>
            <button type="button" className="btn ghost small" disabled={busy} onClick={() => setCfg(defaultConfig(cfg.sensorId))}>
              Standart
            </button>
          </div>

          <div className="config-group">
            <h3>Sensor</h3>
            <label className="field">
              <span>Sensor turi</span>
              <select value={cfg.sensorId} disabled={busy} onChange={(e) => changeSensor(e.target.value)}>
                {SENSORS.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.valueLabel} ({x.unit})
                  </option>
                ))}
              </select>
            </label>
            <div className="pair">
              <NumberField label={`Qiymat min, ${s.unit}`} value={cfg.valueMin} disabled={busy} onChange={(v) => set('valueMin', v)} />
              <NumberField label={`Qiymat max, ${s.unit}`} value={cfg.valueMax} disabled={busy} onChange={(v) => set('valueMax', v)} />
              <NumberField label={`Me’yor pastki, ${s.unit}`} value={cfg.normalMin} disabled={busy} onChange={(v) => set('normalMin', v)} />
              <NumberField label={`Me’yor yuqori, ${s.unit}`} value={cfg.normalMax} disabled={busy} onChange={(v) => set('normalMax', v)} />
            </div>
          </div>

          <div className="config-group">
            <h3>Vaqt cheklovlari</h3>
            <div className="pair">
              <NumberField label="O‘lchovlar soni" value={cfg.count} step={1} min={0} hint="0 — to‘xtatilguncha" disabled={busy} onChange={(v) => set('count', Math.max(0, Math.round(v)))} />
              <NumberField label="Davriylik, ms" value={cfg.period} min={1} disabled={busy} onChange={(v) => set('period', v)} />
              <NumberField label="Deadline, ms" value={cfg.deadline} min={1} disabled={busy} onChange={(v) => set('deadline', v)} />
            </div>
          </div>

          <div className="config-group">
            <h3>Bajarilish vaqti</h3>
            <Segmented
              label="Bajarilish vaqti manbai"
              value={cfg.execMode}
              disabled={busy}
              onChange={(v) => set('execMode', v)}
              options={[
                { value: 'sim', label: 'Simulyatsiya' },
                { value: 'real', label: 'Haqiqiy o‘lchov' },
              ]}
            />
            {cfg.execMode === 'sim' ? (
              <div className="pair">
                <NumberField label="Min, ms" value={cfg.execMin} min={0} disabled={busy} onChange={(v) => set('execMin', v)} />
                <NumberField label="Max, ms" value={cfg.execMax} min={0} disabled={busy} onChange={(v) => set('execMax', v)} />
              </div>
            ) : (
              <NumberField
                label="Ishlov hajmi, ming iteratsiya"
                value={cfg.workload}
                min={1}
                hint="Qiymat brauzerda haqiqatan filtrlanadi, vaqt performance.now() bilan o‘lchanadi"
                disabled={busy}
                onChange={(v) => set('workload', v)}
              />
            )}
          </div>

          <div className="config-group">
            <h3>Kechikish</h3>
            <Segmented
              label="Kechikish manbai"
              value={cfg.latencyMode}
              disabled={busy}
              onChange={(v) => set('latencyMode', v)}
              options={[
                { value: 'sim', label: 'Simulyatsiya' },
                { value: 'real', label: 'Haqiqiy (taymer)' },
              ]}
            />
            {cfg.latencyMode === 'sim' ? (
              <div className="pair">
                <NumberField label="Min, ms" value={cfg.latMin} min={0} disabled={busy} onChange={(v) => set('latMin', v)} />
                <NumberField label="Max, ms" value={cfg.latMax} min={0} disabled={busy} onChange={(v) => set('latMax', v)} />
              </div>
            ) : (
              <small className="muted">Brauzer taymeri rejalashtirilgan vaqtdan qancha kechikib ishga tushgani o‘lchanadi.</small>
            )}
          </div>

          <div className="config-group">
            <h3>Ijro</h3>
            <Segmented label="Tezlik" value={cfg.speed} disabled={busy} onChange={(v) => set('speed', v)} options={SPEEDS} />
            <Segmented
              label="Konsol formati"
              value={cfg.format}
              onChange={(v) => set('format', v)}
              options={[
                { value: 'table', label: 'Jadval' },
                { value: 'detailed', label: 'Batafsil' },
              ]}
            />
            <label className="field">
              <span>Seed (ixtiyoriy)</span>
              <input
                type="text"
                value={cfg.seed}
                disabled={busy}
                placeholder="masalan: guruh-1"
                onChange={(e) => set('seed', e.target.value)}
              />
              <small>Bir xil seed — bir xil natijalar (butun guruh uchun qulay)</small>
            </label>
            <button type="button" className="btn ghost small" onClick={share}>
              🔗 Sozlamalar havolasi
            </button>
          </div>
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="run-h" style={{ margin: 0 }}>
            <div className="card-head">
              <h2 id="run-h">
                {mon.status === 'running' && <span className="live-dot" aria-hidden="true" />}
                {mon.status === 'running' ? 'Jonli o‘lchov' : mon.status === 'paused' ? 'Pauza' : mon.status === 'done' ? 'Yakunlandi' : 'Tayyor'}
              </h2>
              <div className="btn-row no-print">
                {!busy && (
                  <button type="button" className="btn" disabled={errors.length > 0} onClick={() => mon.start(cfg)}>
                    ▶ {mon.status === 'done' ? 'Qayta boshlash' : 'Boshlash'}
                  </button>
                )}
                {mon.status === 'running' && (
                  <button type="button" className="btn" onClick={mon.pause}>
                    ⏸ Pauza
                  </button>
                )}
                {mon.status === 'paused' && (
                  <button type="button" className="btn" onClick={mon.resume}>
                    ▶ Davom ettirish
                  </button>
                )}
                {busy && (
                  <button type="button" className="btn ghost" onClick={mon.stop}>
                    ■ To‘xtatish
                  </button>
                )}
                {mon.status !== 'idle' && !busy && (
                  <button type="button" className="btn ghost" onClick={mon.reset}>
                    Tozalash
                  </button>
                )}
              </div>
            </div>

            {errors.length > 0 && (
              <ul className="errors" role="alert" style={{ marginBottom: 12 }}>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}

            {progress !== null && mon.status !== 'idle' && (
              <div className="progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} style={{ marginBottom: 14 }}>
                <div style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="tiles">
              <div className="tile">
                <div className="label">O‘lchovlar</div>
                <div className="value num">
                  {summary.count}
                  {active.count ? <small>/ {active.count}</small> : null}
                </div>
              </div>
              <div className="tile">
                <div className="label">✓ Ulgurdi</div>
                <div className="value num">{summary.met}</div>
                <div className="sub">{summary.count ? `${summary.rate.toFixed(1)} %` : '—'}</div>
              </div>
              <div className="tile">
                <div className="label">✗ Ulgurmadi</div>
                <div className="value num">{summary.missed}</div>
              </div>
              <div className="tile">
                <div className="label">O‘rtacha bajarilish</div>
                <div className="value num">
                  {summary.avgExec.toFixed(2)}
                  <small>ms</small>
                </div>
                <div className="sub">max {summary.maxExec.toFixed(2)} ms</div>
              </div>
              <div className="tile">
                <div className="label">Oxirgi qiymat</div>
                <div className="value num">
                  {list.length ? list[list.length - 1].value.toFixed(sensor.decimals) : '—'}
                  <small>{sensor.unit}</small>
                </div>
                <div className="sub">o‘rtacha {summary.count ? summary.avgValue.toFixed(sensor.decimals) : '—'}</div>
              </div>
            </div>
          </section>

          {list.length > 0 && (
            <section className="card" style={{ margin: 0 }} aria-labelledby="charts-h">
              <div className="card-head">
                <h2 id="charts-h">Grafiklar</h2>
                <div className="legend">
                  <span>
                    <i className="swatch" style={{ background: 'var(--ink)' }} /> ✓ ulgurdi
                  </span>
                  <span>
                    <i className="swatch series-5" /> ✗ ulgurmadi
                  </span>
                  <span>
                    <i className="swatch" style={{ borderTop: '2px dashed var(--ink)', height: 0 }} /> deadline
                  </span>
                </div>
              </div>
              <h3 style={{ marginTop: 0 }}>Jami javob vaqti (bajarilish + kechikish)</h3>
              <ResponseChart list={list} config={active} sensor={sensor} />
              <h3>
                {sensor.valueLabel} <small className="muted">(● to‘ldirilgan nuqta — me’yordan tashqari)</small>
              </h3>
              <ValueChart list={list} config={active} sensor={sensor} />
            </section>
          )}

          <section className="card" style={{ margin: 0 }} aria-labelledby="console-h">
            <div className="card-head">
              <h2 id="console-h">Konsol</h2>
              <div className="btn-row no-print">
                <label className="check" style={{ fontSize: 13 }}>
                  <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
                  Avto-aylantirish
                </label>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={!consoleText}
                  onClick={async () => notify((await copyText(consoleText)) ? 'Konsol matni nusxalandi' : 'Nusxalab bo‘lmadi')}
                >
                  Nusxalash
                </button>
                <button type="button" className="btn ghost small" disabled={!consoleText} onClick={() => download('olchovlar.txt', consoleText)}>
                  ⭳ TXT
                </button>
                <button
                  type="button"
                  className="btn ghost small"
                  disabled={!list.length || !mon.config}
                  onClick={() => download('olchovlar.csv', measurementsCsv(list, mon.config!), 'text/csv')}
                >
                  ⭳ CSV
                </button>
              </div>
            </div>
            <pre className="console" ref={consoleRef} tabIndex={0} aria-label="Konsol chiqishi" aria-live="off">
              {consoleText || '▶ “Boshlash” tugmasini bosing…'}
            </pre>
          </section>
        </div>
      </div>
    </main>
  );
}
