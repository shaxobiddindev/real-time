/** localStorage'ga xavfsiz murojaat (yashirin rejim yoki bloklangan saytlarda ham sahifa ishlaydi). */
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* saqlab bo'lmasa — e'tiborsiz qoldiramiz */
  }
}
