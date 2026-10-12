/**
 * Sensorlar ro'yxati. Yangi sensor qo'shish uchun shu massivga bitta obyekt qo'shing —
 * sozlamalar, konsol, grafiklar va hisobot avtomatik moslashadi.
 */
export interface Sensor {
  id: string;
  /** Qiymat nomi: "Harorat". */
  valueLabel: string;
  /** Konsol sarlavhasi: "HARORATNI O'LCHASH TIZIMI". */
  systemTitle: string;
  unit: string;
  decimals: number;
  /** Tasodifiy qiymatlar oralig'i (standart). */
  range: [number, number];
  /** Me'yoriy oraliq (standart). */
  normal: [number, number];
}

export const SENSORS: Sensor[] = [
  { id: 'harorat', valueLabel: 'Harorat', systemTitle: "HARORATNI O'LCHASH TIZIMI", unit: '°C', decimals: 1, range: [20, 35], normal: [18, 30] },
  { id: 'namlik', valueLabel: 'Namlik', systemTitle: "NAMLIKNI O'LCHASH TIZIMI", unit: '%', decimals: 1, range: [30, 90], normal: [40, 70] },
  { id: 'bosim', valueLabel: 'Bosim', systemTitle: "BOSIMNI O'LCHASH TIZIMI", unit: 'hPa', decimals: 1, range: [980, 1040], normal: [1000, 1025] },
  { id: 'yoruglik', valueLabel: "Yorug'lik", systemTitle: "YORUG'LIKNI O'LCHASH TIZIMI", unit: 'lx', decimals: 0, range: [100, 1200], normal: [300, 800] },
  { id: 'kuchlanish', valueLabel: 'Kuchlanish', systemTitle: "KUCHLANISHNI O'LCHASH TIZIMI", unit: 'V', decimals: 1, range: [200, 245], normal: [210, 235] },
];

export const sensorById = (id: string) => SENSORS.find((s) => s.id === id) ?? SENSORS[0];
