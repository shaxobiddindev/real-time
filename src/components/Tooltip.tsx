import { useCallback, useState, type ReactNode } from 'react';

interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

/**
 * Konteynerga nisbatan joylashadigan tooltip.
 * Konteyner `position: relative` bo'lishi va `ref`i `show`ga uzatilishi kerak.
 */
export function useTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);

  const show = useCallback((container: HTMLElement | null, target: Element, content: ReactNode) => {
    if (!container) return;
    const c = container.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    const x = Math.min(Math.max(t.left + t.width / 2 - c.left, 60), c.width - 60);
    setTip({ x, y: t.top - c.top, content });
  }, []);

  const showAt = useCallback((x: number, y: number, content: ReactNode) => setTip({ x, y, content }), []);
  const hide = useCallback(() => setTip(null), []);

  const node = tip ? (
    <div className="tooltip" role="tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  ) : null;

  return { show, showAt, hide, node };
}
