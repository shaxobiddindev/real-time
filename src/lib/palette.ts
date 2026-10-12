/** Monoxrom "seriya" uslublari soni (CSS'dagi .series-1 … .series-8: kulrang tuslar va naqshlar). */
export const SERIES_COUNT = 8;

/**
 * Vazifa uslubi. 8 tadan ko'p vazifada uslub takrorlanadi, lekin keyingi "aylana"ga
 * qo'shimcha chegara chizig'i beriladi; vazifa nomi esa doim yozib qo'yiladi.
 */
export function seriesClass(index: number): string {
  const slot = (index % SERIES_COUNT) + 1;
  const round = Math.floor(index / SERIES_COUNT);
  return `series series-${slot}${round > 0 ? ' series-alt' : ''}`;
}
