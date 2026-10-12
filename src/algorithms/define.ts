import type { Algorithm } from '../core/types';

/** Faqat turini tekshirish uchun: yangi algoritm fayli `export default defineAlgorithm({...})` qaytaradi. */
export const defineAlgorithm = <T extends Algorithm>(algorithm: T): T => algorithm;
