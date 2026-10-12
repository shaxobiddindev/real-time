import type { Algorithm } from '../core/types';

/**
 * Algoritmlar reyestri. Shu papkadagi har bir fayl (`define.ts`, `index.ts` va testlardan tashqari)
 * avtomatik yuklanadi — yangi algoritm qo'shish uchun bitta fayl yaratish kifoya.
 */
const modules = import.meta.glob<{ default: Algorithm }>(['./*.ts', '!./index.ts', '!./define.ts', '!./*.test.ts'], {
  eager: true,
});

export const algorithms: Algorithm[] = Object.entries(modules)
  .map(([file, mod]) => {
    if (!mod.default?.id) throw new Error(`${file}: "export default defineAlgorithm({...})" topilmadi`);
    return mod.default;
  })
  .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

const ids = new Set<string>();
for (const a of algorithms) {
  if (ids.has(a.id)) throw new Error(`Algoritm id takrorlangan: "${a.id}"`);
  ids.add(a.id);
}

export const algorithmById = (id: string) => algorithms.find((a) => a.id === id);
