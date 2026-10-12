import { useEffect, useMemo, useRef, useState } from 'react';
import { useTooltip } from '../components/Tooltip';
import type { SimulationResult } from '../core/types';
import { fmt } from '../lib/format';
import { seriesClass } from '../lib/palette';

const PX_PER_SEGMENT = 38; // har bir bo'lakka o'rtacha kenglik (gorizontal aylantirish uchun)
const MIN_TICK_GAP = 26; // px — bundan yaqin belgilar yashiriladi
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function Gantt({ result }: { result: SimulationResult }) {
  const { segments, makespan, tasks } = result;
  const wrapRef = useRef<HTMLDivElement>(null);
  const tooltip = useTooltip();
  const [time, setTime] = useState<number | null>(null); // ijro paytidagi vaqt
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0);

  const minWidth = Math.max(520, segments.length * PX_PER_SEGMENT);
  const pct = (t: number) => (makespan ? (t / makespan) * 100 : 0);

  const ticks = useMemo(() => {
    const bounds = [...new Set([0, ...segments.map((s) => s.end)])];
    const shown: number[] = [];
    for (const b of bounds) {
      const px = (b / (makespan || 1)) * minWidth;
      const prev = shown[shown.length - 1];
      if (prev === undefined || px - (prev / (makespan || 1)) * minWidth >= MIN_TICK_GAP) shown.push(b);
      else if (b === makespan) shown[shown.length - 1] = b; // oxirgi belgi doim ko'rinsin
    }
    return shown;
  }, [segments, makespan, minWidth]);

  // Natija o'zgarsa, ijroni to'xtatamiz.
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    setPlaying(false);
    setTime(null);
  }, [result]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const play = () => {
    if (!makespan) return;
    if (reducedMotion()) {
      setTime(makespan);
      return;
    }
    const startFrom = time !== null && time < makespan ? time : 0;
    const duration = Math.min(15000, Math.max(2500, makespan * 350));
    const t0 = performance.now() - (startFrom / makespan) * duration;
    setPlaying(true);
    const step = (now: number) => {
      const t = Math.min(makespan, ((now - t0) / duration) * makespan);
      setTime(t);
      if (t < makespan) raf.current = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf.current = requestAnimationFrame(step);
  };

  const pause = () => {
    cancelAnimationFrame(raf.current);
    setPlaying(false);
  };

  const reset = () => {
    pause();
    setTime(null);
  };

  const current = time !== null ? segments.find((s) => time >= s.start && time < s.end) : undefined;
  const status =
    time === null
      ? ''
      : time >= makespan
        ? `t = ${fmt(makespan)} ms · barcha vazifalar tugadi`
        : `t = ${fmt(time, 1)} ms · ${
            current?.task === null || !current ? 'protsessor bo‘sh' : `bajarilmoqda: ${tasks[current.task].name}`
          }`;

  return (
    <div className="gantt" ref={wrapRef} onMouseLeave={tooltip.hide}>
      <div className="gantt-toolbar">
        {playing ? (
          <button type="button" className="btn small" onClick={pause}>
            ⏸ Pauza
          </button>
        ) : (
          <button type="button" className="btn small" onClick={play} disabled={!makespan}>
            ▶ {time !== null && time < makespan ? 'Davom ettirish' : 'Jonli ijro'}
          </button>
        )}
        {time !== null && (
          <button type="button" className="btn ghost small" onClick={reset}>
            ↺ Qaytarish
          </button>
        )}
        <span className="gantt-status" aria-live="polite">
          {status}
        </span>
      </div>

      <div className="gantt-scroll" onScroll={tooltip.hide}>
        <div className="gantt-inner" style={{ minWidth: minWidth + 28 }}>
          <div className="gantt-plot">
          <div className="gantt-track" role="img" aria-label={`Gantt diagrammasi: ${result.sequence.join(', ')}`}>
            {segments.map((s, i) => {
              const width = ((s.end - s.start) / (makespan || 1)) * minWidth;
              const name = s.task === null ? 'Bo‘sh' : tasks[s.task].name;
              const tip = (
                <>
                  <b>{name}</b>: {fmt(s.start)}–{fmt(s.end)} ms ({fmt(s.end - s.start)} ms)
                </>
              );
              return (
                <div
                  key={i}
                  className={`seg ${s.task === null ? 'idle' : seriesClass(s.task)}`}
                  style={{ left: `calc(${pct(s.start)}% + 1px)`, width: `calc(${pct(s.end - s.start)}% - 2px)` }}
                  tabIndex={0}
                  aria-label={`${name}: ${fmt(s.start)} dan ${fmt(s.end)} ms gacha`}
                  onMouseEnter={(e) => tooltip.show(wrapRef.current, e.currentTarget, tip)}
                  onFocus={(e) => tooltip.show(wrapRef.current, e.currentTarget, tip)}
                  onBlur={tooltip.hide}
                >
                  {width >= 24 && <span className="seg-label">{s.task === null ? (width >= 44 ? 'bo‘sh' : '') : name}</span>}
                </div>
              );
            })}
          </div>
          <div className="gantt-axis" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className="tick" style={{ left: `${pct(t)}%` }}>
                {fmt(t)}
              </span>
            ))}
          </div>
          {time !== null && (
            <>
              <div className="gantt-veil" style={{ left: `${pct(time)}%` }} />
              <div className="gantt-cursor" style={{ left: `${pct(time)}%` }} />
            </>
          )}
          </div>
        </div>
      </div>
      {tooltip.node}
    </div>
  );
}
