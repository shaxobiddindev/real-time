import { type MouseEvent, useRef } from 'react';
import { useTooltip } from '../components/Tooltip';
import type { Utilization } from '../core/engine';
import type { SimulationResult } from '../core/types';
import { fmt, fmtAvg } from '../lib/format';
import { seriesClass } from '../lib/palette';
import Gantt from './Gantt';
import {
  avgFormula,
  conclusion,
  deadlineComment,
  deadlineSummary,
  orderSentence,
  utilizationLines,
  utilizationVerdict,
} from './report';

export const anchor = (id: string) => `algo-${id}`;

function DeadlineCell({ met }: { met: boolean | null }) {
  if (met === null) return <span className="muted">—</span>;
  return met ? <span className="ok">Ulgurdi</span> : <span className="bad">Ulgurmadi</span>;
}

export function AlgorithmReport({ result, num }: { result: SimulationResult; num: number }) {
  const order = orderSentence(result);
  const hasDeadlines = result.results.some((r) => r.met !== null);
  return (
    <section className="card" id={anchor(result.algorithm.id)} aria-labelledby={`${anchor(result.algorithm.id)}-h`}>
      <div className="card-head">
        <h2 id={`${anchor(result.algorithm.id)}-h`}>
          <span className="section-num">{num}.</span>
          {result.algorithm.title} algoritmi
        </h2>
        {result.preemptive && <span className="badge dashed">preemptiv</span>}
      </div>
      <p>{result.algorithm.describe({ params: result.params, preemptive: result.preemptive })}</p>
      {order && <p>{order}</p>}

      <h3>Gantt diagrammasi</h3>
      <Gantt result={result} />

      <h3>Natijalar</h3>
      <div className="table-scroll">
        <table className="data">
          <thead>
            <tr>
              <th scope="col">Vazifa</th>
              <th scope="col" className="num">Tugash vaqti</th>
              <th scope="col" className="num">TAT</th>
              <th scope="col" className="num">WT</th>
              <th scope="col" className="num">Response</th>
              {hasDeadlines && <th scope="col" className="num">Deadline</th>}
              {hasDeadlines && <th scope="col">Natija</th>}
            </tr>
          </thead>
          <tbody>
            {result.results.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td className="num">{fmt(r.completion)}</td>
                <td className="num">{fmt(r.tat)}</td>
                <td className="num">{fmt(r.wt)}</td>
                <td className="num">{fmt(r.response)}</td>
                {hasDeadlines && <td className="num">{r.deadline === null ? '—' : fmt(r.deadline)}</td>}
                {hasDeadlines && (
                  <td>
                    <DeadlineCell met={r.met} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>O‘rtacha</td>
              <td className="num" />
              <td className="num">{fmtAvg(result.avgTAT)}</td>
              <td className="num">{fmtAvg(result.avgWT)}</td>
              <td className="num">{fmtAvg(result.results.reduce((s, r) => s + r.response, 0) / (result.results.length || 1))}</td>
              {hasDeadlines && <td />}
              {hasDeadlines && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="calc">
        <div>{avgFormula(result, 'wt')}</div>
        <div>{avgFormula(result, 'tat')}</div>
        {result.idleTime > 0 && <div>Protsessor bo‘sh turgan vaqt: {fmt(result.idleTime)} ms</div>}
      </div>
      <p style={{ marginTop: 12 }}>{deadlineComment(result)}</p>
    </section>
  );
}

export function SummaryTable({ results }: { results: SimulationResult[] }) {
  const minWT = Math.min(...results.map((r) => r.avgWT));
  const minTAT = Math.min(...results.map((r) => r.avgTAT));
  return (
    <div className="table-scroll">
      <table className="data">
        <thead>
          <tr>
            <th scope="col">Algoritm</th>
            <th scope="col">Gantt ketma-ketligi</th>
            <th scope="col" className="num">O‘rtacha WT</th>
            <th scope="col" className="num">O‘rtacha TAT</th>
            <th scope="col">Deadline natijasi</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const d = deadlineSummary(r);
            return (
              <tr key={r.algorithm.id}>
                <td>
                  <a href={`#${anchor(r.algorithm.id)}`} onClick={(e) => jump(e, anchor(r.algorithm.id))}>
                    {r.label}
                  </a>
                </td>
                <td className="seq">{r.sequence.join('→')}</td>
                <td className={`num${r.avgWT === minWT && results.length > 1 ? ' best' : ''}`}>
                  {fmtAvg(r.avgWT)} ms{r.avgWT === minWT && results.length > 1 ? ' ★' : ''}
                </td>
                <td className={`num${r.avgTAT === minTAT && results.length > 1 ? ' best' : ''}`}>
                  {fmtAvg(r.avgTAT)} ms{r.avgTAT === minTAT && results.length > 1 ? ' ★' : ''}
                </td>
                <td>
                  <span className={d.ok === null ? 'muted' : d.ok ? 'ok' : 'bad'}>{d.text}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {results.length > 1 && <p className="note" style={{ margin: '8px 12px' }}>★ — eng kichik qiymat</p>}
    </div>
  );
}

/** Ichki havolalar hash-marshrutni buzmasligi uchun. */
export function jump(e: MouseEvent, id: string) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function ComparisonChart({ results }: { results: SimulationResult[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const tooltip = useTooltip();
  const max = Math.max(...results.map((r) => Math.max(r.avgTAT, r.avgWT)), 1);
  return (
    <div ref={ref} style={{ position: 'relative' }} onMouseLeave={tooltip.hide}>
      <div className="legend" style={{ marginBottom: 12 }}>
        <span>
          <i className="swatch wt" /> O‘rtacha WT (kutish)
        </span>
        <span>
          <i className="swatch tat" /> O‘rtacha TAT (aylanish)
        </span>
      </div>
      <div className="bars" role="img" aria-label="Algoritmlar bo‘yicha o‘rtacha WT va TAT taqqoslamasi">
        {results.map((r) => {
          const tip = (
            <>
              <b>{r.label}</b>
              <br />
              WT: {fmtAvg(r.avgWT)} ms · TAT: {fmtAvg(r.avgTAT)} ms
              <br />
              Buzilgan deadline: {r.missed.length}
            </>
          );
          return (
            <div
              className="bar-row"
              key={r.algorithm.id}
              onMouseEnter={(e) => tooltip.show(ref.current, e.currentTarget.querySelector('.bar-pair')!, tip)}
            >
              <div className="bar-name">{r.label}</div>
              <div className="bar-pair">
                {(['wt', 'tat'] as const).map((m) => {
                  const v = m === 'wt' ? r.avgWT : r.avgTAT;
                  return (
                    <div className="bar-line" key={m}>
                      <div className={`bar ${m}`} style={{ width: `calc(${(v / max) * 100}% - 70px)` }} />
                      <span className="bar-value">{fmtAvg(v)} ms</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {tooltip.node}
    </div>
  );
}

export function UtilizationReport({ util }: { util: Utilization | null }) {
  if (!util) {
    return <p className="muted">Yuklanishni hisoblash uchun barcha vazifalarning davri (Period) kiritilishi kerak.</p>;
  }
  return (
    <>
      <p>Vazifalar davriy bo‘lgani uchun protsessorning umumiy yuklanish koeffitsientini ham hisoblaymiz:</p>
      <div className="calc">
        {utilizationLines(util).map((l) => (
          <div key={l}>{l}</div>
        ))}
      </div>
      <div className="btn-row" style={{ margin: '12px 0' }}>
        <span className={`badge ${util.rmsGuaranteed ? 'solid' : 'dashed'}`}>
          {util.rmsGuaranteed ? '✓' : '✗'} RMS: U {util.rmsGuaranteed ? '≤' : '>'} {fmt(util.rmsBound)}
        </span>
        <span className={`badge ${util.edfSchedulable ? 'solid' : 'dashed'}`}>
          {util.edfSchedulable ? '✓' : '✗'} EDF: U {util.edfSchedulable ? '≤' : '>'} 1
        </span>
      </div>
      <p>{utilizationVerdict(util)}</p>
    </>
  );
}

export function Conclusion({ results, util }: { results: SimulationResult[]; util: Utilization | null }) {
  return (
    <>
      {conclusion(results, util).map((p) => (
        <p key={p}>{p}</p>
      ))}
    </>
  );
}

export function TaskLegend({ results }: { results: SimulationResult[] }) {
  const tasks = results[0]?.tasks ?? [];
  return (
    <div className="legend">
      {tasks.map((t) => (
        <span key={t.index}>
          <i className={`swatch ${seriesClass(t.index)}`} /> {t.name}
        </span>
      ))}
      <span>
        <i className="swatch" style={{ border: '1.5px dashed var(--line)' }} /> protsessor bo‘sh
      </span>
    </div>
  );
}
