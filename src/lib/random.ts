/** Seed bilan takrorlanadigan tasodifiy sonlar generatori (mulberry32). */
export function createRng(seed?: number | string | null): () => number {
  if (seed === undefined || seed === null || seed === '') return Math.random;
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) {
    h = Math.imul(h ^ ch.charCodeAt(0), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const uniform = (rng: () => number, min: number, max: number) => min + (max - min) * rng();
export const randInt = (rng: () => number, min: number, max: number) => Math.floor(uniform(rng, min, max + 1));
