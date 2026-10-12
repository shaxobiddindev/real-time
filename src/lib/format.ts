/** Sonni o'zbekcha formatda chiqaradi: 7.4 → "7,4". */
export function fmt(x: number, maxDecimals = 3): string {
  if (!Number.isFinite(x)) return x > 0 ? '∞' : '—';
  const f = 10 ** maxDecimals;
  return String(Math.round(x * f) / f).replace('.', ',');
}

/** O'rtacha qiymat: kamida bitta kasr xonasi bilan (6 → "6,0"). */
export function fmtAvg(x: number): string {
  return Number.isInteger(Math.round(x * 1000) / 1000) ? x.toFixed(1).replace('.', ',') : fmt(x);
}

/** Qat'iy kasr xonalar soni bilan: fmtFixed(2.0952, 2) → "2,10". */
export function fmtFixed(x: number, decimals: number): string {
  return x.toFixed(decimals).replace('.', ',');
}

/** "T1, T2 va T3" */
export function joinUz(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} va ${items[items.length - 1]}`;
}

export function clockTime(date: Date): string {
  return date.toLocaleTimeString('uz-UZ', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
