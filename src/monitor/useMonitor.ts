import { useCallback, useEffect, useRef, useState } from 'react';
import { type Measurement, type MonitorConfig, createGenerator } from './simulation';

export type RunStatus = 'idle' | 'running' | 'paused' | 'done';

/**
 * Real vaqtda davriy o'lchovlarni bajaradi.
 * Har bir o'lchov rejalashtirilgan vaqtga nisbatan hisoblanadi (taymer "suzib" ketmaydi),
 * haqiqiy kechikish esa `performance.now()` bilan o'lchanadi.
 */
export function useMonitor() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [config, setConfig] = useState<MonitorConfig | null>(null);

  const timer = useRef<number | undefined>(undefined);
  const run = useRef({
    cfg: null as MonitorConfig | null,
    gen: null as ReturnType<typeof createGenerator> | null,
    i: 0,
    wallStart: 0, // performance.now() boshlanish nuqtasi
    epochStart: 0, // Date.now() — konsoldagi soat uchun
    pausedAt: 0,
  });

  const clear = () => window.clearTimeout(timer.current);

  const schedule = useCallback(() => {
    const r = run.current;
    const cfg = r.cfg!;
    const target = r.wallStart + (r.i * cfg.period) / cfg.speed;
    timer.current = window.setTimeout(() => {
      const actual = performance.now();
      r.i += 1;
      const m = r.gen!(r.i, r.epochStart + (r.i - 1) * cfg.period, actual - target);
      setMeasurements((list) => [...list, m]);
      if (cfg.count && r.i >= cfg.count) setStatus('done');
      else schedule();
    }, Math.max(0, target - performance.now()));
  }, []);

  const start = useCallback(
    (cfg: MonitorConfig) => {
      clear();
      const r = run.current;
      r.cfg = cfg;
      r.gen = createGenerator(cfg);
      r.i = 0;
      r.epochStart = Date.now();
      setConfig(cfg);

      if (cfg.speed === 0) {
        // Darhol: barcha o'lchovlar kutmasdan hisoblanadi.
        const list = Array.from({ length: cfg.count }, (_, k) => r.gen!(k + 1, r.epochStart + k * cfg.period, 0));
        setMeasurements(list);
        setStatus('done');
        return;
      }
      setMeasurements([]);
      setStatus('running');
      r.wallStart = performance.now();
      schedule();
    },
    [schedule],
  );

  const pause = useCallback(() => {
    clear();
    run.current.pausedAt = performance.now();
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    const r = run.current;
    r.wallStart += performance.now() - r.pausedAt; // pauza vaqtini hisobga olmaymiz
    setStatus('running');
    schedule();
  }, [schedule]);

  const stop = useCallback(() => {
    clear();
    setStatus('done');
  }, []);

  const reset = useCallback(() => {
    clear();
    setMeasurements([]);
    setStatus('idle');
    setConfig(null);
  }, []);

  useEffect(() => clear, []);

  return { measurements, status, config, start, pause, resume, stop, reset };
}
