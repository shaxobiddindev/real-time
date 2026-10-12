# Real vaqt tizimlari — interaktiv laboratoriya

Real vaqt tizimlari fani bo‘yicha amaliy ishlarni **brauzerda** bajarish uchun ochiq veb-ilova.
Server kerak emas — barcha hisob-kitoblar foydalanuvchi brauzerida bajariladi, sayt istalgan statik hostingda
(GitHub Pages va h.k.) ishlaydi.

## Bo‘limlar

### 1. Rejalashtirish algoritmlari
Vazifalar (Arrival, Burst, Priority, Deadline, Period) bo‘yicha algoritmlarni taqqoslash:

- **FCFS, SJF, Priority, Round Robin, EDF, RMS** + qo‘shimcha **LLF, HRRN**
- har bir algoritm uchun **Gantt diagrammasi** (jonli ijro / animatsiya bilan)
- Tugash vaqti, **TAT**, **WT**, Response time, deadline natijasi (Ulgurdi / Ulgurmadi)
- o‘rtacha qiymatlar formulasi bilan: `O‘rtacha WT = (0+5+8+10+14)/5 = 37/5 = 7,4 ms`
- umumiy natijalar jadvali va taqqoslash diagrammasi
- protsessor yuklanishi `U = Σ C/T`, Liu–Layland chegarasi, EDF sharti
- **avtomatik xulosa**
- preemptiv rejim (SRTF, preemptiv Priority/EDF/RMS/LLF), Round Robin kvantini o‘zgartirish
- vazifalarni qo‘shish/o‘chirish/tartiblash, tasodifiy vazifalar, **CSV/JSON import-eksport**
- **havola orqali ulashish** (ma’lumotlar URL ichida), **chop etish / PDF**

Standart ma’lumotlar — amaliy ish hujjatidagi 5 ta vazifa; natijalar hujjat bilan to‘liq mos keladi (testlar bilan tekshirilgan).

### 2. O‘lchash tizimi (real vaqt)
Davriy o‘lchash vazifasining real vaqtda simulyatsiyasi (harorat, namlik, bosim, yorug‘lik, kuchlanish):

- o‘lchovlar soni (yoki cheksiz), **davriylik**, **deadline**, qiymat va me’yor oraliqlari
- bajarilish vaqti: tasodifiy (min–max) yoki **haqiqiy** — brauzerda ishlov berish `performance.now()` bilan o‘lchanadi
- kechikish: tasodifiy yoki **haqiqiy** — brauzer taymerining kechikishi o‘lchanadi
- tezlik: ×1 (haqiqiy vaqt), ×2, ×5, ×10 yoki darhol; pauza / davom ettirish / to‘xtatish
- **seed** — bir xil seed bilan butun guruh bir xil natija oladi
- konsol (jadval yoki batafsil format), jonli grafiklar, **YAKUNIY HISOBOT**, TXT/CSV eksport

```
#01 | Harorat: 27.8 °C | Bajarilish: 218.96 ms | Kechikish:  1.75 ms | Jami: 220.72 ms | Deadline: ULGURMADI
```

Sayt oq va qora fonda ishlaydi (yuqori o‘ng burchakdagi tugma), telefonda ham qulay.

## Ishga tushirish

Node.js 22+ kerak.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testlar
npm run build      # dist/ papkasiga statik sayt
```

## Hammaga ochiq qilish (GitHub Pages)

`.github/workflows/deploy.yml` har bir `main` branchga push qilinganda testlarni ishga tushiradi va saytni
GitHub Pages’ga joylaydi. Bir marta sozlash kerak:

1. GitHub’da repozitoriy → **Settings → Pages**
2. **Source: GitHub Actions** ni tanlang
3. `main` branchga push qiling — sayt `https://<foydalanuvchi>.github.io/<repozitoriy>/` manzilida ochiladi

`dist/` papkasini istalgan statik hostingga (Netlify, Vercel, oddiy veb-server) ham yuklash mumkin.

## Kengaytirish

Loyiha yangi imkoniyatlar qo‘shish oson bo‘ladigan qilib tuzilgan.

```
src/
├── algorithms/        ← har bir algoritm alohida fayl (avtomatik topiladi)
├── core/              ← simulyatsiya dvigateli, turlar, testlar
├── scheduling/        ← "Rejalashtirish algoritmlari" sahifasi
├── monitor/           ← "O‘lchash tizimi" sahifasi, sensorlar ro‘yxati
├── components/, hooks/, lib/
└── App.tsx            ← sahifalar ro‘yxati
```

### Yangi algoritm qo‘shish

`src/algorithms/` papkasida yangi fayl yarating — boshqa hech narsani o‘zgartirish shart emas:
algoritm tanlash ro‘yxatida, natijalar jadvalida, diagrammalarda va xulosada o‘zi paydo bo‘ladi.

**1-usul — kalit funksiyasi** (eng oson). Har safar tayyor vazifalar ichidan kaliti eng kichigi tanlanadi;
bo‘sh turish, preemptiv rejim va barcha metrikalarni dvigatel o‘zi hisoblaydi:

```ts
// src/algorithms/lrtf.ts
import { defineAlgorithm } from './define';

export default defineAlgorithm({
  id: 'lrtf',
  name: 'LRTF',
  title: 'LRTF (Longest Remaining Time First)',
  order: 90,                       // sahifadagi o‘rni
  enabledByDefault: false,
  preemption: 'optional',          // 'never' | 'always' | 'optional'
  describe: () => 'Qolgan bajarilish vaqti eng uzun bo‘lgan vazifa tanlanadi.',
  // kalit: [birinchi mezon, ikkinchi mezon, ...]; state = { time, remaining }
  key: (task, { remaining }) => [-remaining, task.arrival],
});
```

**2-usul — o‘z simulyatsiyasi** (`run`): Gantt bo‘laklarini o‘zingiz qaytarasiz.
Namuna — [`src/algorithms/roundRobin.ts`](src/algorithms/roundRobin.ts). Algoritmga parametr kerak bo‘lsa
(`params`), uning maydoni sozlamalarda avtomatik chiziladi.

So‘ng `src/core/engine.test.ts` ga test qo‘shing va `npm test` ni ishga tushiring.

### Yangi sensor qo‘shish

`src/monitor/sensors.ts` dagi `SENSORS` massiviga bitta obyekt qo‘shing:

```ts
{ id: 'co2', valueLabel: 'CO₂', systemTitle: "CO2 NI O'LCHASH TIZIMI", unit: 'ppm', decimals: 0, range: [400, 2000], normal: [400, 1000] },
```

### Yangi bo‘lim (sahifa) qo‘shish

Komponent yarating (`PageProps` ni qabul qiladi) va `src/App.tsx` dagi `PAGES` ro‘yxatiga bitta qator qo‘shing.

## Hissa qo‘shish

1. Fork qiling va yangi branch oching
2. O‘zgartirish kiriting, `npm test` va `npm run build` muvaffaqiyatli o‘tishini tekshiring
3. Pull request yuboring

Xato topsangiz yoki g‘oyangiz bo‘lsa — Issue oching.

## Litsenziya

[MIT](LICENSE) — erkin foydalanish, o‘zgartirish va tarqatish mumkin.
