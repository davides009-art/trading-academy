// Deterministic seeded LCG random number generator
// Same seed always produces same OHLC data — no external data needed.

export interface CandleData {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return (): number => {
    s = Math.imul(1664525, s) + 1013904223;
    s = s >>> 0;
    return s / 0xffffffff;
  };
}

/**
 * Generate a deterministic OHLC series.
 * @param seed      Any integer — same seed always yields same data
 * @param count     Number of candles
 * @param start     Starting price
 * @param drift     Directional bias per candle (-1 to +1)
 * @param vol       Average body size (price units)
 */
export function generateOHLC(
  seed: number,
  count: number,
  start: number = 100,
  drift: number = 0,
  vol: number = 1.5
): CandleData[] {
  const rand = lcg(seed);
  const BASE = 1704067200; // 2024-01-01 00:00:00 UTC
  const DAY = 86400;
  const candles: CandleData[] = [];
  let price = start;

  for (let i = 0; i < count; i++) {
    const body = (rand() - 0.45 + drift * 0.12) * vol * 2;
    const open = Math.max(0.01, price);
    const close = Math.max(0.01, open + body);
    const upperWick = rand() * vol * 0.7;
    const lowerWick = rand() * vol * 0.7;
    const high = Math.max(open, close) + upperWick;
    const low = Math.min(open, close) - lowerWick;

    candles.push({
      time: BASE + i * DAY,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
    });

    price = close;
  }
  return candles;
}

// ─── Pre-built datasets for visual quiz questions ─────────────────────────────

/** 15-candle uptrend for trend-identification questions */
export const DATASET_UPTREND: CandleData[] = generateOHLC(1001, 15, 100, 0.6, 1.2);

/** 15-candle downtrend */
export const DATASET_DOWNTREND: CandleData[] = generateOHLC(2002, 15, 120, -0.6, 1.2);

/** Single candle: open 100, high 113, low 97, close 106 — bullish with wicks */
export const SINGLE_CANDLE_BULLISH: CandleData[] = [
  { time: 1704067200, open: 100, high: 113, low: 97, close: 106 },
];

/** Range (20 candles oscillating between ~95 and ~115) */
export const DATASET_RANGE: CandleData[] = generateOHLC(3003, 20, 105, 0, 2.5);

/** Pin bar sequence: 12 candles leading to a pin bar at candle 13 */
export const DATASET_PIN_BAR: CandleData[] = [
  ...generateOHLC(4004, 12, 102, 0.2, 1.0),
  // Explicit pin bar: open ≈ close near top, long lower wick
  { time: 1704067200 + 12 * 86400, open: 108, high: 109.5, low: 98, close: 108.5 },
  ...generateOHLC(5005, 3, 109, 0.3, 0.8),
];
