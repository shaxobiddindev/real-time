import { useId } from 'react';
import { useTooltip } from '../components/Tooltip';
import { useElementWidth } from '../hooks/useElementWidth';
import type { Sensor } from './sensors';
import { type Measurement, type MonitorConfig, STATUS_LABEL } from './simulation';

const H = 220;
const M = { top: 18, right: 16, bottom: 26, left: 48 };
const WINDOW = 60; // grafikda oxirgi 60 ta o'lchov

/** "Chiroyli" o'q belgilari. */
function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => span / s <= count) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

function xLabels(list: Measurement[]): Measurement[] {
  const every = Math.ceil(list.length / 10);
  return list.filter((_, i) => i % every === 0 || i === list.length - 1);
}

const ms = (v: number) => `${v.toFixed(2)} ms`;

function Tip({ m, sensor }: { m: Measurement; sensor: Sensor }) {
  return (
    <>
      <b>#{m.n}</b> · {sensor.valueLabel}: {m.value.toFixed(sensor.decimals)} {sensor.unit} ({STATUS_LABEL[m.status]})
      <br />
      Bajarilish: {ms(m.exec)} · Kechikish: {ms(m.latency)}
      <br />
      Jami: {ms(m.total)} · {m.met ? '✓ ulgurdi' : '✗ ulgurmadi'}
    </>
  );
}

const LABEL_GUTTER = 70; // o'ng tomonda "Deadline" yozuvi uchun joy

export function ResponseChart({ list, config, sensor }: { list: Measurement[]; config: MonitorConfig; sensor: Sensor }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const right = M.right + LABEL_GUTTER;
  const tooltip = useTooltip();
  const hatchId = useId().replace(/:/g, '');
  const data = list.slice(-WINDOW);
  const yMax = Math.max(config.deadline * 1.25, ...data.map((m) => m.total * 1.08), 1);
  const ticks = niceTicks(0, yMax);
  const iw = width - M.left - right;
  const ih = H - M.top - M.bottom;
  const slot = iw / Math.max(data.length, 10);
  const barW = Math.max(3, Math.min(28, slot - 2));
  const y = (v: number) => M.top + ih - (v / yMax) * ih;
  const x = (i: number) => M.left + i * slot + (slot - barW) / 2;

  return (
    <div className="chart" ref={ref} onMouseLeave={tooltip.hide}>
      <svg viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`Javob vaqti va ${config.deadline} ms deadline`}>
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--panel)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--ink)" strokeWidth="2.5" />
          </pattern>
        </defs>
        <g className="grid">
          {ticks.map((t) => (
            <line key={t} x1={M.left} x2={width - right} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t) => (
            <text key={t} x={M.left - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          ))}
          {xLabels(data).map((m) => (
            <text key={m.n} x={x(data.indexOf(m)) + barW / 2} y={H - 6} textAnchor="middle">
              #{m.n}
            </text>
          ))}
        </g>
        {data.map((m, i) => {
          const top = y(m.total);
          const h = Math.max(1, M.top + ih - top);
          return (
            <g key={m.n}>
              <path
                d={`M${x(i)},${M.top + ih} v${-(h - Math.min(3, h))} q0,-3 3,-3 h${barW - 6} q3,0 3,3 v${h - Math.min(3, h)} z`}
                fill={m.met ? 'var(--ink)' : `url(#${hatchId})`}
                stroke={m.met ? 'none' : 'var(--ink)'}
                strokeWidth={m.met ? 0 : 1.5}
              />
              {!m.met && barW >= 8 && (
                <text className="miss-mark" x={x(i) + barW / 2} y={top - 4} textAnchor="middle">
                  ✗
                </text>
              )}
              <rect
                className="hit"
                x={M.left + i * slot}
                y={M.top}
                width={slot}
                height={ih}
                onMouseEnter={(e) => tooltip.show(ref.current, e.currentTarget, <Tip m={m} sensor={sensor} />)}
              />
            </g>
          );
        })}
        <line className="baseline" x1={M.left} x2={width - right} y1={M.top + ih} y2={M.top + ih} />
        <line className="refline" x1={M.left} x2={width - right} y1={y(config.deadline)} y2={y(config.deadline)} />
        <text className="reflabel" x={width - right + 6} y={y(config.deadline) - 2}>
          Deadline
        </text>
        <text className="reflabel" x={width - right + 6} y={y(config.deadline) + 11}>
          {config.deadline} ms
        </text>
        <text className="axis" x={4} y={M.top - 6}>
          ms
        </text>
      </svg>
      {tooltip.node}
    </div>
  );
}

export function ValueChart({ list, config, sensor }: { list: Measurement[]; config: MonitorConfig; sensor: Sensor }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const tooltip = useTooltip();
  const right = M.right + LABEL_GUTTER;
  const data = list.slice(-WINDOW);
  const lo = Math.min(config.valueMin, config.normalMin, ...data.map((m) => m.value));
  const hi = Math.max(config.valueMax, config.normalMax, ...data.map((m) => m.value));
  const padding = (hi - lo || 1) * 0.08;
  const yMin = lo - padding;
  const yMax = hi + padding;
  const ticks = niceTicks(yMin, yMax);
  const iw = width - M.left - right;
  const ih = H - M.top - M.bottom;
  const slot = iw / Math.max(data.length, 10);
  const x = (i: number) => M.left + i * slot + slot / 2;
  const y = (v: number) => M.top + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const path = data.map((m, i) => `${i ? 'L' : 'M'}${x(i)},${y(m.value)}`).join(' ');

  return (
    <div className="chart" ref={ref} onMouseLeave={tooltip.hide}>
      <svg viewBox={`0 0 ${width} ${H}`} role="img" aria-label={`${sensor.valueLabel} qiymatlari va me’yor oralig‘i`}>
        <rect
          className="band"
          x={M.left}
          width={iw}
          y={y(Math.min(config.normalMax, yMax))}
          height={Math.max(0, y(Math.max(config.normalMin, yMin)) - y(Math.min(config.normalMax, yMax)))}
        />
        <text className="reflabel" x={width - right + 6} y={y(Math.min(config.normalMax, yMax)) + 11}>
          me’yor
        </text>
        <text className="axis" x={width - right + 6} y={y(Math.min(config.normalMax, yMax)) + 24}>
          {config.normalMin}–{config.normalMax} {sensor.unit}
        </text>
        <g className="grid">
          {ticks.map((t) => (
            <line key={t} x1={M.left} x2={width - right} y1={y(t)} y2={y(t)} />
          ))}
        </g>
        <g className="axis">
          {ticks.map((t) => (
            <text key={t} x={M.left - 8} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          ))}
          {xLabels(data).map((m) => (
            <text key={m.n} x={x(data.indexOf(m))} y={H - 6} textAnchor="middle">
              #{m.n}
            </text>
          ))}
        </g>
        <path className="line" d={path} />
        {data.length <= 40 &&
          data.map((m, i) => (
            <circle
              key={m.n}
              className="dot"
              cx={x(i)}
              cy={y(m.value)}
              r={m.status === 'meyorida' ? 4 : 5}
              style={m.status === 'meyorida' ? undefined : { fill: 'var(--ink)' }}
            />
          ))}
        {data.map((m, i) => (
          <rect
            key={`h${m.n}`}
            className="hit"
            x={x(i) - slot / 2}
            y={M.top}
            width={slot}
            height={ih}
            onMouseEnter={(e) => tooltip.show(ref.current, e.currentTarget, <Tip m={m} sensor={sensor} />)}
          />
        ))}
        <text className="axis" x={4} y={M.top - 6}>
          {sensor.unit}
        </text>
      </svg>
      {tooltip.node}
    </div>
  );
}
