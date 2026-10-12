import type { Utilization } from '../core/engine';
import type { SimulationResult } from '../core/types';
import { fmt, fmtAvg, fmtFixed, joinUz } from '../lib/format';

/** "Burst vaqtlari bo‘yicha tartib: T3 (2 ms), T2 (3 ms), ..." */
export function orderSentence(r: SimulationResult): string | null {
  const c = r.algorithm.criterion;
  if (!c) return null;
  const sorted = [...r.tasks].sort((a, b) => {
    const x = c.value(a) ?? Infinity;
    const y = c.value(b) ?? Infinity;
    return x - y || a.arrival - b.arrival || a.index - b.index;
  });
  const items = sorted.map((t) => {
    const v = c.value(t);
    return `${t.name} (${v === null ? '—' : fmt(v)}${v !== null && c.unit ? ` ${c.unit}` : ''})`;
  });
  return `${c.label}: ${items.join(', ')}.`;
}

export function avgFormula(r: SimulationResult, metric: 'wt' | 'tat'): string {
  const values = r.results.map((x) => x[metric]);
  const sum = metric === 'wt' ? r.sumWT : r.sumTAT;
  const avg = metric === 'wt' ? r.avgWT : r.avgTAT;
  const n = values.length;
  return `O‘rtacha ${metric.toUpperCase()} = (${values.map((v) => fmt(v)).join('+')})/${n} = ${fmt(sum)}/${n} = ${fmtAvg(avg)} ms`;
}

export function deadlineComment(r: SimulationResult): string {
  const withDeadline = r.results.filter((x) => x.met !== null);
  if (!withDeadline.length) return 'Vazifalar uchun deadline berilmagan, shuning uchun muddat tahlili qilinmadi.';
  if (!r.missed.length) {
    return withDeadline.length === r.results.length
      ? 'Barcha vazifalar o‘z deadline’idan oldin tugaydi, ya’ni birorta ham muddat buzilmadi.'
      : 'Deadline berilgan barcha vazifalar o‘z muddatida tugaydi.';
  }
  const missed = r.results.filter((x) => x.met === false);
  if (missed.length === 1) {
    const m = missed[0];
    return `${m.name} vazifasi ${fmt(m.completion)} ms da tugaydi, lekin uning deadline’i ${fmt(m.deadline!)} ms, shuning uchun ${m.name} o‘z muddatiga ulgurmaydi.`;
  }
  return `Bu algoritmda ${missed.length} ta vazifa muddatni buzadi: ${joinUz(
    missed.map((m) => `${m.name} (${fmt(m.completion)} > ${fmt(m.deadline!)})`),
  )}.`;
}

export function deadlineSummary(r: SimulationResult): { text: string; ok: boolean | null } {
  if (r.results.every((x) => x.met === null)) return { text: 'Deadline berilmagan', ok: null };
  if (!r.missed.length) return { text: 'Hammasi bajarildi', ok: true };
  return { text: `${r.missed.length} ta buzildi (${r.missed.join(', ')})`, ok: false };
}

export function utilizationLines(u: Utilization): string[] {
  const fractions = u.parts.map((p) => `${fmt(p.burst)}/${fmt(p.period)}`).join(' + ');
  const decimals = u.parts.map((p) => fmt(p.value)).join(' + ');
  return [
    `U = ${fractions} = ${decimals} ≈ ${fmt(u.U)}`,
    `RMS uchun Liu–Layland chegarasi: n = ${u.n} da U ≤ ${u.n}·(2^(1/${u.n}) − 1) ≈ ${fmtFixed(u.rmsBound, 3)}`,
    'EDF uchun: U ≤ 1',
  ];
}

export function utilizationVerdict(u: Utilization): string {
  const U = fmt(u.U);
  if (!u.edfSchedulable) {
    return `Bizda U ≈ ${U}, bu ikkala chegaradan ham katta. Demak, vazifalar davriy ravishda takrorlanadigan bo‘lsa, bitta protsessorda hech qaysi algoritm barcha deadline’larni kafolatlay olmaydi.`;
  }
  if (!u.rmsGuaranteed) {
    return `Bizda U ≈ ${U} ≤ 1, shuning uchun EDF davriy rejimda ham barcha deadline’larni bajara oladi (deadline = davr bo‘lganda). RMS uchun esa U Liu–Layland chegarasidan katta — kafolat yo‘q (bu yetarli shart, zarur emas).`;
  }
  return `Bizda U ≈ ${U}, bu Liu–Layland chegarasidan ham kichik. Demak, davriy rejimda RMS ham, EDF ham barcha deadline’larni kafolatlaydi (deadline = davr bo‘lganda).`;
}

/** Natijalar asosida avtomatik xulosa (paragraflar). */
export function conclusion(results: SimulationResult[], u: Utilization | null): string[] {
  if (!results.length) return [];
  const out: string[] = [];
  const hasDeadlines = results[0].results.some((x) => x.met !== null);
  const byWT = [...results].sort((a, b) => a.avgWT - b.avgWT);
  const best = byWT[0];
  const worst = byWT[byWT.length - 1];
  const allMet = hasDeadlines ? results.filter((r) => r.missed.length === 0) : [];

  let first = `Olingan natijalarga ko‘ra, o‘rtacha kutish vaqti eng kichik bo‘lgan algoritm ${best.label} bo‘ldi (${fmtAvg(best.avgWT)} ms)`;
  if (hasDeadlines) {
    first += best.missed.length
      ? `, lekin unda ${joinUz(best.missed)} ${best.missed.length > 1 ? 'vazifalari' : 'vazifasi'} muddatni buzdi.`
      : ', va unda barcha deadline’lar bajarildi.';
  } else first += '.';
  out.push(first);

  if (hasDeadlines) {
    if (allMet.length === 1) {
      const a = allMet[0];
      out.push(
        `Barcha deadline’larni bajargan yagona algoritm ${a.label} bo‘ldi` +
          (a === best ? '.' : `, uning o‘rtacha kutish vaqti ${fmtAvg(a.avgWT)} ms.`),
      );
    } else if (allMet.length > 1) {
      out.push(`Barcha deadline’larni bajargan algoritmlar: ${joinUz(allMet.map((a) => `${a.label} (WT ${fmtAvg(a.avgWT)} ms)`))}.`);
    } else {
      const least = [...results].sort((a, b) => a.missed.length - b.missed.length || a.avgWT - b.avgWT)[0];
      out.push(
        `Hech qaysi algoritm barcha deadline’larni bajara olmadi; eng kam buzilish ${least.label} algoritmida (${least.missed.length} ta).`,
      );
    }
  }

  if (results.length > 1 && worst !== best) {
    let w = `Eng yomon natijani ${worst.label} ko‘rsatdi: o‘rtacha kutish vaqti eng katta (${fmtAvg(worst.avgWT)} ms)`;
    if (hasDeadlines && worst.missed.length) w += ` va ${worst.missed.length} ta vazifa muddatni buzdi`;
    out.push(`${w}.`);
  }

  if (hasDeadlines) {
    const recommended = allMet.length
      ? [...allMet].sort((a, b) => a.avgWT - b.avgWT)[0]
      : [...results].sort((a, b) => a.missed.length - b.missed.length || a.avgWT - b.avgWT)[0];
    let rec = `Shunday qilib, berilgan vazifalar uchun real vaqt tizimiga ${recommended.label} algoritmi eng mos keladi.`;
    if (u && !u.edfSchedulable) {
      rec +=
        ' Ammo yuklanish koeffitsienti 1 dan katta bo‘lgani sababli, davriy rejimda ishlash uchun vazifalar sonini kamaytirish yoki bir nechta protsessordan foydalanish zarur.';
    }
    out.push(rec);
  }
  return out;
}
