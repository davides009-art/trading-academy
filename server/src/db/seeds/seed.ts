import pool from '../index';
import { seedLevel0 } from './seed_level0_foundations';
import { seedLevel1 } from './seed_level1_price_action';
import { seedLevel2 } from './seed_level2_liquidity';
import { seedLevel4 } from './seed_level4_risk';
import { generateOHLC, CandleData } from './ohlc_generator';

// ─── Drill helper functions ───────────────────────────────────────────────────

function round2(n: number): number { return Math.round(n * 100) / 100; }

/** Global max-high and min-low across all candles, with their bar indices. */
function globalExtremes(candles: CandleData[]) {
  let maxHigh = -Infinity, maxHighIdx = 0;
  let minLow  =  Infinity, minLowIdx  = 0;
  candles.forEach((c, i) => {
    if (c.high > maxHigh) { maxHigh = c.high; maxHighIdx = i; }
    if (c.low  < minLow)  { minLow  = c.low;  minLowIdx  = i; }
  });
  return { maxHigh: round2(maxHigh), maxHighIdx, minLow: round2(minLow), minLowIdx };
}

/** Price range spanned by the bottom `pct` fraction of candle lows (support / liquidity zone). */
function bottomZone(candles: CandleData[], pct = 0.25) {
  const sorted = candles.map(c => c.low).sort((a, b) => a - b);
  const take   = Math.max(3, Math.ceil(sorted.length * pct));
  return { priceFrom: round2(sorted[0]), priceTo: round2(sorted[take - 1]) };
}

/** Price range spanned by the top `pct` fraction of candle highs (resistance zone). */
function topZone(candles: CandleData[], pct = 0.25) {
  const sorted = candles.map(c => c.high).sort((a, b) => b - a);
  const take   = Math.max(3, Math.ceil(sorted.length * pct));
  return { priceFrom: round2(sorted[take - 1]), priceTo: round2(sorted[0]) };
}

/**
 * Locate a structural swing low in the first 55 % of the chart, then find
 * the first subsequent bar whose close breaks below it (bearish BOS).
 */
function bearishBOS(candles: CandleData[]): { price: number; barIndex: number } {
  const searchEnd = Math.floor(candles.length * 0.55);

  // Prefer a genuine local minimum: lower than all 2 neighbours on each side
  let swingLow = Infinity, swingIdx = 3;
  for (let i = 3; i < searchEnd - 3; i++) {
    const isLocal =
      candles[i].low < candles[i - 1].low &&
      candles[i].low < candles[i - 2].low &&
      candles[i].low < candles[i + 1].low &&
      candles[i].low < candles[i + 2].low;
    if (isLocal && candles[i].low < swingLow) {
      swingLow = candles[i].low;
      swingIdx = i;
    }
  }
  // Fallback: global minimum low in the search window
  if (swingLow === Infinity) {
    for (let i = 0; i < searchEnd; i++) {
      if (candles[i].low < swingLow) { swingLow = candles[i].low; swingIdx = i; }
    }
  }

  // First bar after the swing low where close drops below it
  for (let i = swingIdx + 1; i < candles.length; i++) {
    if (candles[i].close < swingLow) return { price: round2(swingLow), barIndex: i };
  }
  // Fallback: no close-based BOS found — point just past the swing
  return { price: round2(swingLow), barIndex: Math.min(swingIdx + 5, candles.length - 1) };
}

/**
 * Locate a structural swing high in the first 55 % of the chart, then find
 * the first subsequent bar whose close breaks above it (bullish BOS).
 */
function bullishBOS(candles: CandleData[]): { price: number; barIndex: number } {
  const searchEnd = Math.floor(candles.length * 0.55);

  let swingHigh = -Infinity, swingIdx = 3;
  for (let i = 3; i < searchEnd - 3; i++) {
    const isLocal =
      candles[i].high > candles[i - 1].high &&
      candles[i].high > candles[i - 2].high &&
      candles[i].high > candles[i + 1].high &&
      candles[i].high > candles[i + 2].high;
    if (isLocal && candles[i].high > swingHigh) {
      swingHigh = candles[i].high;
      swingIdx  = i;
    }
  }
  // Fallback: global maximum high in the search window
  if (swingHigh === -Infinity) {
    for (let i = 0; i < searchEnd; i++) {
      if (candles[i].high > swingHigh) { swingHigh = candles[i].high; swingIdx = i; }
    }
  }

  // First bar after the swing high where close rises above it
  for (let i = swingIdx + 1; i < candles.length; i++) {
    if (candles[i].close > swingHigh) return { price: round2(swingHigh), barIndex: i };
  }
  return { price: round2(swingHigh), barIndex: Math.min(swingIdx + 5, candles.length - 1) };
}

// ─── Types for drill definitions ─────────────────────────────────────────────

const UI_ZONE_TYPES  = ['support', 'resistance', 'liquidity'] as const;
const UI_POINT_TYPES = ['swing_high', 'swing_low', 'bos'] as const;

interface DrillDef {
  title: string;
  description: string;
  level_required: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  chart_config: { data: CandleData[]; settings: { title: string } };
  answer_set: {
    description: string;
    zones?: Array<{ type: string; priceFrom: number; priceTo: number; tolerance?: number }>;
    points?: Array<{ type: string; price: number; barIndex: number; direction?: string; tolerance?: number; barTolerance?: number }>;
  };
  hint1_text: string;
  hint2_text: string;
  explanation: string[];
}

/**
 * Seed-time QA: validates every drill definition before any DB write.
 * Logs ✅ PASS / ❌ FAIL per drill and throws if any fail.
 */
function validateAllDrills(drills: DrillDef[]): void {
  console.log('\n── Drill Validation ──────────────────────────────────────');
  let passed = 0, failed = 0;
  for (const drill of drills) {
    const errors: string[] = [];
    const candles = drill.chart_config.data;

    // 1. Minimum candle count
    if (candles.length < 30)
      errors.push(`only ${candles.length} candles (min 30)`);

    // 2. Answer prices within candle range
    const mn  = Math.min(...candles.map(c => c.low));
    const mx  = Math.max(...candles.map(c => c.high));
    const buf = 0.5;
    (drill.answer_set.zones ?? []).forEach((z, i) => {
      if (z.priceFrom < mn - buf || z.priceTo > mx + buf)
        errors.push(`zone[${i}] ${z.priceFrom}–${z.priceTo} outside [${round2(mn)}–${round2(mx)}]`);
    });
    (drill.answer_set.points ?? []).forEach((p, i) => {
      if (p.price < mn - buf || p.price > mx + buf)
        errors.push(`point[${i}] price ${p.price} outside [${round2(mn)}–${round2(mx)}]`);
    });

    // 3. Mark types supported by UI
    (drill.answer_set.zones ?? []).forEach((z, i) => {
      if (!(UI_ZONE_TYPES as readonly string[]).includes(z.type))
        errors.push(`zone[${i}] type "${z.type}" not supported by UI`);
    });
    (drill.answer_set.points ?? []).forEach((p, i) => {
      if (!(UI_POINT_TYPES as readonly string[]).includes(p.type))
        errors.push(`point[${i}] type "${p.type}" not supported by UI`);
    });

    // 4. At least one answer element
    const total = (drill.answer_set.zones?.length ?? 0) + (drill.answer_set.points?.length ?? 0);
    if (total === 0) errors.push('no answer elements (zones or points)');

    // 5. Has hints and explanation
    if (!drill.hint1_text)       errors.push('missing hint1_text');
    if (!drill.hint2_text)       errors.push('missing hint2_text');
    if (!drill.explanation?.length) errors.push('missing explanation');

    if (errors.length === 0) {
      console.log(`  ✅ PASS  [${drill.difficulty.padEnd(6)}] "${drill.title}"`);
      passed++;
    } else {
      console.error(`  ❌ FAIL  "${drill.title}"`);
      errors.forEach(e => console.error(`         → ${e}`));
      failed++;
    }
  }
  console.log(`\n  Total: ${drills.length}  Pass: ${passed}  Fail: ${failed}`);
  console.log('──────────────────────────────────────────────────────────\n');
  if (failed > 0)
    throw new Error(`${failed} drill(s) failed validation — aborting seed`);
}

// ─── Pre-compute drill candles (deterministic — same seed → same candles) ────

// Existing 5 drills
const d1Candles: CandleData[] = generateOHLC(9001, 50, 120, -0.3, 2.0).map((c, i) => {
  if (i < 20) return c;
  if (i < 25) return { ...c, close: Math.max(c.close, 98), low: Math.max(c.low, 96) };
  return c;
});
const d2Candles: CandleData[] = generateOHLC(9002, 40, 100, 0.0, 2.5);
const d3Candles: CandleData[] = generateOHLC(9003, 50,  90, 0.3, 1.8);
const d4Candles: CandleData[] = generateOHLC(9004, 40, 110, 0.0, 1.5);
const d5Candles: CandleData[] = generateOHLC(9005, 45, 120, -0.4, 1.8);

// Easy drills (4)
const eC1: CandleData[] = generateOHLC(9006, 40, 100, 0.0, 2.0);
const eC2: CandleData[] = generateOHLC(9007, 40, 110, 0.0, 2.0);
const eC3: CandleData[] = generateOHLC(9008, 45, 100, 0.0, 1.8);
const eC4: CandleData[] = generateOHLC(9009, 45, 115, 0.0, 1.8);

// Medium drills (4)
const mC1: CandleData[] = generateOHLC(9010, 50, 105, 0.0, 2.2);
const mC2: CandleData[] = generateOHLC(9011, 50, 110, 0.0, 1.8);
const mC3: CandleData[] = generateOHLC(9012, 45, 100, 0.4, 2.0);
const mC4: CandleData[] = generateOHLC(9013, 40, 120, 0.0, 1.5);

// Hard drills (2)
const hC1: CandleData[] = generateOHLC(9014, 55, 110, 0.0, 2.5);
const hC2: CandleData[] = generateOHLC(9015, 55, 120, -0.3, 2.0);

// ─── Derive answer sets from the same candle arrays ──────────────────────────

const d1Zone = bottomZone(d1Candles, 0.25);
const d2Ext  = globalExtremes(d2Candles);
const d3Zone = topZone(d3Candles, 0.25);
const d4Zone = bottomZone(d4Candles, 0.20);
const d5BOS  = bearishBOS(d5Candles);

const eE1   = globalExtremes(eC1);
const eE2   = globalExtremes(eC2);
const eZ3   = bottomZone(eC3, 0.25);
const eZ4   = topZone(eC4, 0.25);

const mE1   = globalExtremes(mC1);
const mZ2s  = bottomZone(mC2, 0.25);
const mZ2r  = topZone(mC2, 0.25);
const mBOS3 = bullishBOS(mC3);
const mZ4   = topZone(mC4, 0.20);

const hE1   = globalExtremes(hC1);
const hZ1   = bottomZone(hC1, 0.25);
const hZ2s  = bottomZone(hC2, 0.25);
const hZ2r  = topZone(hC2, 0.25);
const hBOS2 = bearishBOS(hC2);

// ─── Drill definitions (chart and answerSet share exactly the same candles) ──

const drillDefinitions: DrillDef[] = [
  // ── Existing 5 ──────────────────────────────────────────────────────────────
  {
    title: 'Mark the Support Zone',
    description: 'Identify and mark the main support zone on this chart. Price has tested this area multiple times. Draw a zone that captures the full support area.',
    level_required: 0,
    difficulty: 'easy',
    tags: ['support', 'range'],
    chart_config: { data: d1Candles, settings: { title: 'Mark the Support Zone' } },
    answer_set: {
      description: `The support zone sits around ${d1Zone.priceFrom}–${d1Zone.priceTo}, where price bounced repeatedly.`,
      zones: [{ type: 'support', priceFrom: d1Zone.priceFrom, priceTo: d1Zone.priceTo, tolerance: 4 }],
    },
    hint1_text: 'Scan the chart for a price level where falling candles reversed upward more than once — that repeated floor is your support zone.',
    hint2_text: `Focus on the lower portion of the chart. The support zone spans from roughly ${d1Zone.priceFrom} to ${d1Zone.priceTo} — look for where the lowest wicks cluster.`,
    explanation: [
      `The support zone sits around ${d1Zone.priceFrom}–${d1Zone.priceTo}, where buyers consistently absorbed selling pressure.`,
      'Key clue: candle wicks extend into the zone but closes remain above it — classic support behaviour.',
      'Mark from the lowest wick (bottom boundary) to the first meaningful close above the cluster (top boundary).',
      'A wider tolerance is fine — what matters is capturing the full tested area, not a precise single line.',
    ],
  },
  {
    title: 'Identify Swing Highs and Lows',
    description: 'Mark the most significant swing high and the most significant swing low visible on this chart.',
    level_required: 1,
    difficulty: 'medium',
    tags: ['swing', 'structure'],
    chart_config: { data: d2Candles, settings: { title: 'Identify Swing Highs and Lows' } },
    answer_set: {
      description: `Swing high: price ${d2Ext.maxHigh} at bar ${d2Ext.maxHighIdx}. Swing low: price ${d2Ext.minLow} at bar ${d2Ext.minLowIdx}.`,
      points: [
        { type: 'swing_high', price: d2Ext.maxHigh, barIndex: d2Ext.maxHighIdx, tolerance: 5, barTolerance: 10 },
        { type: 'swing_low',  price: d2Ext.minLow,  barIndex: d2Ext.minLowIdx,  tolerance: 5, barTolerance: 10 },
      ],
    },
    hint1_text: 'A swing high is the highest candle peak on the chart. A swing low is the deepest trough. Look for the single most extreme candle in each direction.',
    hint2_text: `Find the tallest candle top — that is the swing high near price ${d2Ext.maxHigh} (around bar ${d2Ext.maxHighIdx}). Find the deepest wick down — that is the swing low near price ${d2Ext.minLow} (around bar ${d2Ext.minLowIdx}).`,
    explanation: [
      `Swing high: the highest point on this chart is price ${d2Ext.maxHigh}, found at bar ${d2Ext.maxHighIdx}.`,
      `Swing low: the lowest point is price ${d2Ext.minLow}, found at bar ${d2Ext.minLowIdx}.`,
      'Always use wick extremes (not candle bodies) when marking swing points.',
      'These structural turning points are the foundation of trend analysis and trade setups.',
    ],
  },
  {
    title: 'Draw the Resistance Zone',
    description: 'This chart shows price approaching a ceiling multiple times. Identify and draw the main resistance zone.',
    level_required: 1,
    difficulty: 'easy',
    tags: ['resistance', 'range'],
    chart_config: { data: d3Candles, settings: { title: 'Draw the Resistance Zone' } },
    answer_set: {
      description: `The resistance zone is approximately ${d3Zone.priceFrom}–${d3Zone.priceTo}. Price has failed to close above this area on multiple attempts.`,
      zones: [{ type: 'resistance', priceFrom: d3Zone.priceFrom, priceTo: d3Zone.priceTo, tolerance: 4 }],
    },
    hint1_text: 'Look for a price ceiling where rising candles have been repeatedly rejected — wicks poke into this area but closes remain below it.',
    hint2_text: `The resistance sits near the top of the chart's price range. Multiple candle tops cluster around ${d3Zone.priceFrom}–${d3Zone.priceTo}.`,
    explanation: [
      `Resistance zone: approximately ${d3Zone.priceFrom}–${d3Zone.priceTo}, where sellers have consistently stepped in to cap rallies.`,
      'Multiple bearish wicks and reversal candles cluster here — each touch strengthens the zone.',
      'Draw from the lowest rejection close (bottom boundary) to the highest wick tip (top boundary).',
      'Price is likely to continue failing at this level until a high-volume candle closes convincingly above it.',
    ],
  },
  {
    title: 'Spot the Liquidity Pool',
    description: 'This chart shows a range with a cluster of equal lows. Identify the liquidity pool where stop orders are concentrated below the equal lows.',
    level_required: 2,
    difficulty: 'medium',
    tags: ['liquidity', 'range'],
    chart_config: { data: d4Candles, settings: { title: 'Spot the Liquidity Pool (Equal Lows)' } },
    answer_set: {
      description: `The liquidity pool sits around ${d4Zone.priceFrom}–${d4Zone.priceTo}, just below the cluster of equal lows.`,
      zones: [{ type: 'liquidity', priceFrom: d4Zone.priceFrom, priceTo: d4Zone.priceTo, tolerance: 4 }],
    },
    hint1_text: 'Equal lows signal where retail traders have placed stop losses. Institutions often sweep these stops by briefly pushing price below the equal lows before reversing — that cluster is the liquidity pool.',
    hint2_text: `Find the area where several candle lows land at nearly the same price level. The liquidity pool sits at roughly ${d4Zone.priceFrom}–${d4Zone.priceTo}.`,
    explanation: [
      `The liquidity pool sits around ${d4Zone.priceFrom}–${d4Zone.priceTo}, where the lowest cluster of equal lows is concentrated.`,
      'Equal lows signal stop-loss clusters: retail traders defending the range floor all place stops at the same level.',
      'Smart money targets this zone to sweep stops before reversing — watch for a sharp wick below the lows then a close back inside the range.',
      'Mark the zone from just below the lowest equal low to the level of the lows themselves.',
    ],
  },
  {
    title: 'Identify the Break of Structure',
    description: 'A bearish market structure is visible on this chart. Identify where the Break of Structure (BOS) occurred — mark the price of the swing low that was broken and select bearish direction.',
    level_required: 2,
    difficulty: 'medium',
    tags: ['bos', 'structure'],
    chart_config: { data: d5Candles, settings: { title: 'Identify the Break of Structure (BOS)' } },
    answer_set: {
      description: `The bearish BOS occurs at bar ${d5BOS.barIndex}, where price closes below the prior swing low at ${d5BOS.price}.`,
      points: [
        { type: 'bos', price: d5BOS.price, barIndex: d5BOS.barIndex, direction: 'bearish', tolerance: 4, barTolerance: 8 },
      ],
    },
    hint1_text: 'A bearish BOS happens when price closes below the most recently established swing low. Scan for the first candle whose closing price breaks that prior swing low.',
    hint2_text: `The key swing low sits near price ${d5BOS.price}. Find the first candle that closes below this level (around bar ${d5BOS.barIndex}) — that is the BOS. Select "bearish" direction.`,
    explanation: [
      `The bearish BOS occurs at bar ${d5BOS.barIndex}, where price closes below the prior swing low at ${d5BOS.price}.`,
      'A BOS confirms structural change — uptrend swing lows are now being violated by closes, not just wicks.',
      'Mark the BOS price at the swing low level that was broken, not the close price itself.',
      'After a bearish BOS, look for lower highs and lower lows to confirm the new downtrend.',
    ],
  },

  // ── Easy-1: Find the Swing High ───────────────────────────────────────────
  {
    title: 'Find the Swing High',
    description: 'A single task: identify and mark only the most significant swing high (the highest peak) on this chart. Use the "swing high" mark type and enter the price of the tallest wick.',
    level_required: 0,
    difficulty: 'easy',
    tags: ['swing', 'structure'],
    chart_config: { data: eC1, settings: { title: 'Find the Swing High' } },
    answer_set: {
      description: `The swing high is at price ${eE1.maxHigh}, bar ${eE1.maxHighIdx}.`,
      points: [
        { type: 'swing_high', price: eE1.maxHigh, barIndex: eE1.maxHighIdx, tolerance: 5, barTolerance: 10 },
      ],
    },
    hint1_text: 'Scan the entire chart from left to right and find the single candle whose top wick reaches the highest price. That is the swing high.',
    hint2_text: `The highest candle peak on this chart is near price ${eE1.maxHigh}. Find it and mark it as swing high.`,
    explanation: [
      `The swing high is at price ${eE1.maxHigh} (bar ${eE1.maxHighIdx}) — the tallest candle top on the chart.`,
      'Use the candle high (wick tip), not the close, when marking swing highs.',
      'Swing highs are key structural levels — they signal where sellers overwhelmed buyers.',
      'In a downtrend, each new swing high is typically lower than the previous one (lower highs).',
    ],
  },

  // ── Easy-2: Find the Swing Low ────────────────────────────────────────────
  {
    title: 'Find the Swing Low',
    description: 'Identify and mark only the most significant swing low (the deepest trough) on this chart. Use the "swing low" mark type and enter the price of the lowest wick.',
    level_required: 0,
    difficulty: 'easy',
    tags: ['swing', 'structure'],
    chart_config: { data: eC2, settings: { title: 'Find the Swing Low' } },
    answer_set: {
      description: `The swing low is at price ${eE2.minLow}, bar ${eE2.minLowIdx}.`,
      points: [
        { type: 'swing_low', price: eE2.minLow, barIndex: eE2.minLowIdx, tolerance: 5, barTolerance: 10 },
      ],
    },
    hint1_text: 'Find the single candle whose bottom wick reaches the lowest price on the entire chart. That is your swing low.',
    hint2_text: `The deepest trough on this chart sits near price ${eE2.minLow}. Mark it as swing low using the wick low, not the candle body.`,
    explanation: [
      `The swing low is at price ${eE2.minLow} (bar ${eE2.minLowIdx}) — the lowest wick on the chart.`,
      'Always mark swing lows at the wick tip (the candle low), not at the body open or close.',
      'Swing lows define support — buyers stepped in strongly enough to reverse price at this level.',
      'In an uptrend, each new swing low is higher than the previous (higher lows) — confirming bullish structure.',
    ],
  },

  // ── Easy-3: Mark the Support Floor ───────────────────────────────────────
  {
    title: 'Mark the Support Floor',
    description: 'Price has bounced from the same floor level multiple times on this chart. Draw a support zone that covers the area where lows have clustered.',
    level_required: 0,
    difficulty: 'easy',
    tags: ['support', 'range'],
    chart_config: { data: eC3, settings: { title: 'Mark the Support Floor' } },
    answer_set: {
      description: `The support floor zone spans ${eZ3.priceFrom}–${eZ3.priceTo}.`,
      zones: [{ type: 'support', priceFrom: eZ3.priceFrom, priceTo: eZ3.priceTo, tolerance: 4 }],
    },
    hint1_text: 'Find the price area at the bottom of the chart where multiple candle wicks have touched and reversed upward. That cluster is your support zone.',
    hint2_text: `The support floor is in the lower range of this chart, approximately ${eZ3.priceFrom}–${eZ3.priceTo}. Set priceFrom to the lowest wick and priceTo to the top of the tested cluster.`,
    explanation: [
      `Support floor: ${eZ3.priceFrom}–${eZ3.priceTo} — buyers have defended this zone repeatedly.`,
      'Draw the bottom of your zone at the lowest wick and the top at where closes consistently stay above.',
      'More touches = stronger support. Each successful defence adds confluence.',
      'This zone is invalidated if price closes convincingly below ${eZ3.priceFrom} on high momentum.',
    ],
  },

  // ── Easy-4: Mark the Resistance Ceiling ──────────────────────────────────
  {
    title: 'Mark the Resistance Ceiling',
    description: 'Price has been rejected from the same ceiling multiple times on this chart. Draw a resistance zone that captures where the rejections have occurred.',
    level_required: 0,
    difficulty: 'easy',
    tags: ['resistance', 'range'],
    chart_config: { data: eC4, settings: { title: 'Mark the Resistance Ceiling' } },
    answer_set: {
      description: `The resistance ceiling zone spans ${eZ4.priceFrom}–${eZ4.priceTo}.`,
      zones: [{ type: 'resistance', priceFrom: eZ4.priceFrom, priceTo: eZ4.priceTo, tolerance: 4 }],
    },
    hint1_text: 'Scan the top of the chart for a price level where rallies have been turned back repeatedly. Candle wicks poke above but closes stay below — that is the resistance zone.',
    hint2_text: `The resistance ceiling is near the top of this chart's price range, around ${eZ4.priceFrom}–${eZ4.priceTo}. Set priceFrom to where rejection bodies cluster and priceTo to the highest wick.`,
    explanation: [
      `Resistance ceiling: ${eZ4.priceFrom}–${eZ4.priceTo} — sellers have capped every rally here.`,
      'The bottom boundary of your zone should be where bullish candles stop closing above (the rejection zone).',
      'The top boundary is the highest wick tip that marks the absolute ceiling.',
      'A bullish breakout above this zone, on a strong close, would invalidate it and make it potential support.',
    ],
  },

  // ── Medium-1: Identify Both Swing Points ─────────────────────────────────
  {
    title: 'Identify Both Swing Points',
    description: 'This chart has clear structural extremes. Mark both the highest swing high and the lowest swing low you can identify.',
    level_required: 1,
    difficulty: 'medium',
    tags: ['swing', 'structure'],
    chart_config: { data: mC1, settings: { title: 'Identify Both Swing Points' } },
    answer_set: {
      description: `Swing high at ${mE1.maxHigh} (bar ${mE1.maxHighIdx}). Swing low at ${mE1.minLow} (bar ${mE1.minLowIdx}).`,
      points: [
        { type: 'swing_high', price: mE1.maxHigh, barIndex: mE1.maxHighIdx, tolerance: 5, barTolerance: 10 },
        { type: 'swing_low',  price: mE1.minLow,  barIndex: mE1.minLowIdx,  tolerance: 5, barTolerance: 10 },
      ],
    },
    hint1_text: 'You need to place two marks: one swing high (highest peak) and one swing low (deepest trough). Scan the whole chart for the most extreme points in each direction.',
    hint2_text: `Swing high is near ${mE1.maxHigh} (bar ~${mE1.maxHighIdx}). Swing low is near ${mE1.minLow} (bar ~${mE1.minLowIdx}). Add both marks using their respective wick prices.`,
    explanation: [
      `Swing high at ${mE1.maxHigh} (bar ${mE1.maxHighIdx}) and swing low at ${mE1.minLow} (bar ${mE1.minLowIdx}).`,
      'Together these two points define the chart\'s overall price range and trading boundary.',
      'The distance between them is the total range — useful for measuring potential moves.',
      'In trending markets these extremes define the trend direction: rising swing highs/lows = uptrend.',
    ],
  },

  // ── Medium-2: Mark Range Boundaries ──────────────────────────────────────
  {
    title: 'Mark Range Boundaries',
    description: 'Price is clearly ranging between two levels on this chart. Draw both the support zone (bottom of range) and the resistance zone (top of range).',
    level_required: 1,
    difficulty: 'medium',
    tags: ['support', 'resistance', 'range'],
    chart_config: { data: mC2, settings: { title: 'Mark Range Boundaries' } },
    answer_set: {
      description: `Support zone: ${mZ2s.priceFrom}–${mZ2s.priceTo}. Resistance zone: ${mZ2r.priceFrom}–${mZ2r.priceTo}.`,
      zones: [
        { type: 'support',    priceFrom: mZ2s.priceFrom, priceTo: mZ2s.priceTo, tolerance: 4 },
        { type: 'resistance', priceFrom: mZ2r.priceFrom, priceTo: mZ2r.priceTo, tolerance: 4 },
      ],
    },
    hint1_text: 'A range has a floor (support) and a ceiling (resistance). Find where price repeatedly bounces up (support) and where it repeatedly gets rejected downward (resistance). Draw both zones.',
    hint2_text: `Support zone is at the bottom cluster around ${mZ2s.priceFrom}–${mZ2s.priceTo}. Resistance zone is at the top cluster around ${mZ2r.priceFrom}–${mZ2r.priceTo}. Add one support and one resistance mark.`,
    explanation: [
      `Support: ${mZ2s.priceFrom}–${mZ2s.priceTo} (range floor). Resistance: ${mZ2r.priceFrom}–${mZ2r.priceTo} (range ceiling).`,
      'Range trading means buying near support and selling near resistance — or waiting for a breakout.',
      'The range midpoint is often a magnet for price; expect choppiness between the two zones.',
      'A close outside either boundary with momentum signals a potential breakout trade.',
    ],
  },

  // ── Medium-3: Identify the Bullish BOS ───────────────────────────────────
  {
    title: 'Identify the Bullish BOS',
    description: 'A bullish market structure shift is visible on this chart. Mark the Break of Structure (BOS) — enter the price of the swing high that was broken and select bullish direction.',
    level_required: 2,
    difficulty: 'medium',
    tags: ['bos', 'structure'],
    chart_config: { data: mC3, settings: { title: 'Identify the Bullish BOS' } },
    answer_set: {
      description: `The bullish BOS occurs at bar ${mBOS3.barIndex}, where price closes above the prior swing high at ${mBOS3.price}.`,
      points: [
        { type: 'bos', price: mBOS3.price, barIndex: mBOS3.barIndex, direction: 'bullish', tolerance: 4, barTolerance: 8 },
      ],
    },
    hint1_text: 'A bullish BOS occurs when a candle closes above the most recent swing high. Find the swing high in the first half of the chart, then look for the first candle after it that closes above that level.',
    hint2_text: `The swing high to watch is near price ${mBOS3.price}. The first candle to close above this level (around bar ${mBOS3.barIndex}) is the BOS. Select "bullish" direction.`,
    explanation: [
      `The bullish BOS occurs at bar ${mBOS3.barIndex} — the first close above the swing high at ${mBOS3.price}.`,
      'A close above a prior swing high, not just a wick, confirms the break is genuine.',
      'This signals that buyers have taken control and prior sellers are being stopped out.',
      'After a bullish BOS, look for a pullback to the broken swing high (now potential support) for an entry.',
    ],
  },

  // ── Medium-4: Equal Highs Liquidity Pool ─────────────────────────────────
  {
    title: 'Equal Highs Liquidity Pool',
    description: 'Multiple candle highs have stacked at nearly the same price level near the top of this chart — a classic equal highs formation. Mark the liquidity zone above those equal highs.',
    level_required: 2,
    difficulty: 'medium',
    tags: ['liquidity', 'range'],
    chart_config: { data: mC4, settings: { title: 'Equal Highs Liquidity Pool' } },
    answer_set: {
      description: `The liquidity zone sits at the equal-highs cluster: ${mZ4.priceFrom}–${mZ4.priceTo}.`,
      zones: [{ type: 'liquidity', priceFrom: mZ4.priceFrom, priceTo: mZ4.priceTo, tolerance: 4 }],
    },
    hint1_text: 'Equal highs mean many retail traders have placed their stop losses just above that level. Institutions may sweep those stops upward before reversing. Mark the zone at those equal highs.',
    hint2_text: `The equal highs cluster is near the top of the chart around ${mZ4.priceFrom}–${mZ4.priceTo}. This is where buy-side liquidity sits (breakout buyers and sellers\' stops).`,
    explanation: [
      `Liquidity sits at ${mZ4.priceFrom}–${mZ4.priceTo} — the equal highs cluster at the top of the range.`,
      'Equal highs attract stop runs: sellers have stops above, breakout buyers enter here, creating a dense order cluster.',
      'Smart money sweeps this area to fill large orders before reversing — look for a sharp wick above then a close back inside.',
      'This zone is a potential short entry after a sweep, or a breakout level if price closes and holds above it.',
    ],
  },

  // ── Hard-1: Swing Structure and Support ──────────────────────────────────
  {
    title: 'Swing Structure and Support',
    description: 'A multi-element analysis drill. Mark all three: (1) the main swing high, (2) the main swing low, and (3) the support zone at the base of the chart. All three elements will be scored.',
    level_required: 3,
    difficulty: 'hard',
    tags: ['swing', 'support', 'structure'],
    chart_config: { data: hC1, settings: { title: 'Swing Structure and Support' } },
    answer_set: {
      description: `Swing high at ${hE1.maxHigh} (bar ${hE1.maxHighIdx}), swing low at ${hE1.minLow} (bar ${hE1.minLowIdx}), support zone ${hZ1.priceFrom}–${hZ1.priceTo}.`,
      points: [
        { type: 'swing_high', price: hE1.maxHigh, barIndex: hE1.maxHighIdx, tolerance: 5, barTolerance: 10 },
        { type: 'swing_low',  price: hE1.minLow,  barIndex: hE1.minLowIdx,  tolerance: 5, barTolerance: 10 },
      ],
      zones: [
        { type: 'support', priceFrom: hZ1.priceFrom, priceTo: hZ1.priceTo, tolerance: 4 },
      ],
    },
    hint1_text: 'You need three marks: a swing high (highest peak), a swing low (deepest trough), and a support zone (the price floor where lows cluster). Start with the extremes, then draw the zone.',
    hint2_text: `Swing high near ${hE1.maxHigh} (bar ~${hE1.maxHighIdx}). Swing low near ${hE1.minLow} (bar ~${hE1.minLowIdx}). Support zone approximately ${hZ1.priceFrom}–${hZ1.priceTo} at the chart base.`,
    explanation: [
      `Swing high: ${hE1.maxHigh} at bar ${hE1.maxHighIdx}. Swing low: ${hE1.minLow} at bar ${hE1.minLowIdx}.`,
      `Support zone: ${hZ1.priceFrom}–${hZ1.priceTo} — the base where multiple lows have clustered.`,
      'Combining swing extremes with a support zone gives you a complete structural picture of this chart.',
      'A trade setup here: buy near support with a stop below the swing low, targeting the swing high.',
    ],
  },

  // ── Hard-2: Full Range Analysis ───────────────────────────────────────────
  {
    title: 'Full Range Analysis',
    description: 'The hardest drill. Mark all three: (1) the support zone, (2) the resistance zone, and (3) the bearish Break of Structure (BOS). All three are scored independently.',
    level_required: 3,
    difficulty: 'hard',
    tags: ['support', 'resistance', 'bos', 'structure'],
    chart_config: { data: hC2, settings: { title: 'Full Range Analysis' } },
    answer_set: {
      description: `Support: ${hZ2s.priceFrom}–${hZ2s.priceTo}. Resistance: ${hZ2r.priceFrom}–${hZ2r.priceTo}. Bearish BOS at bar ${hBOS2.barIndex}, price ${hBOS2.price}.`,
      zones: [
        { type: 'support',    priceFrom: hZ2s.priceFrom, priceTo: hZ2s.priceTo, tolerance: 4 },
        { type: 'resistance', priceFrom: hZ2r.priceFrom, priceTo: hZ2r.priceTo, tolerance: 4 },
      ],
      points: [
        { type: 'bos', price: hBOS2.price, barIndex: hBOS2.barIndex, direction: 'bearish', tolerance: 4, barTolerance: 8 },
      ],
    },
    hint1_text: 'You need three marks: support zone (bottom cluster), resistance zone (top cluster), and a bearish BOS (the candle that first closes below the prior swing low). Work top-down: zones first, then find the structure break.',
    hint2_text: `Support: ${hZ2s.priceFrom}–${hZ2s.priceTo}. Resistance: ${hZ2r.priceFrom}–${hZ2r.priceTo}. Bearish BOS is at price ${hBOS2.price} (bar ~${hBOS2.barIndex}) — select "bearish" direction.`,
    explanation: [
      `Support: ${hZ2s.priceFrom}–${hZ2s.priceTo}. Resistance: ${hZ2r.priceFrom}–${hZ2r.priceTo}.`,
      `Bearish BOS at bar ${hBOS2.barIndex}: the first close below prior swing low ${hBOS2.price} — structural shift confirmed.`,
      'A bearish BOS inside a range signals potential breakdown — sellers are now strong enough to violate former support.',
      'Full picture: price ranged between support and resistance, then broke bearishly. Expect continuation lower or a retest of the broken support (now resistance).',
    ],
  },
];

async function seed() {
  // ── Run QA validation before touching the database ─────────────────────────
  validateAllDrills(drillDefinitions);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear existing seed data (order matters due to FK constraints)
    await client.query('DELETE FROM quiz_attempt_answers');
    await client.query('DELETE FROM quiz_attempts');
    await client.query('DELETE FROM mastery_scores');
    await client.query('DELETE FROM review_queue');
    await client.query('DELETE FROM user_lesson_progress');
    await client.query('DELETE FROM drill_attempts');
    await client.query('DELETE FROM drills');
    await client.query('DELETE FROM questions');
    await client.query('DELETE FROM lessons');
    await client.query('DELETE FROM levels');
    console.log('Cleared existing seed data.');

    // ─── Levels ──────────────────────────────────────────────────────────────
    const levelsData = [
      { order_num: 0, title: 'Foundations', description: 'Core concepts every trader must know: markets, charts, orders, risk basics, and trading psychology.', icon: '📚' },
      { order_num: 1, title: 'Price Action', description: 'Read and trade raw price movement using structure, key levels, and candle patterns.', icon: '📊' },
      { order_num: 2, title: 'Liquidity & Market Structure', description: 'Institutional-style analysis: BOS, CHOCH, liquidity pools, and order blocks.', icon: '🏦' },
      { order_num: 3, title: 'Volume Profile', description: 'Introduction to volume-based analysis and high-volume nodes.', icon: '📈' },
      { order_num: 4, title: 'Strategy & Risk Management', description: 'Build a complete trading plan, master position sizing, stops, R:R, and trade management.', icon: '🎯' },
    ];

    const levelIds: Record<number, number> = {};
    for (const lvl of levelsData) {
      const res = await client.query(
        `INSERT INTO levels (order_num, title, description, icon) VALUES ($1,$2,$3,$4) RETURNING id`,
        [lvl.order_num, lvl.title, lvl.description, lvl.icon]
      );
      levelIds[lvl.order_num] = res.rows[0].id;
    }
    console.log('Levels inserted.');

    // ─── Level 3 placeholder lesson ──────────────────────────────────────────
    await client.query(
      `INSERT INTO lessons (level_id, order_num, title, content, visual_type, visual_config, common_mistakes, key_takeaways, estimated_minutes)
       VALUES ($1,1,'Introduction to Volume Profile',
       'Volume Profile is an advanced charting tool that displays trading volume at each price level over a given period, revealing where the most buying and selling activity occurred. High Volume Nodes (HVNs) are price areas where substantial trading took place — price tends to consolidate around or be attracted to these zones. Low Volume Nodes (LVNs) are thin areas where little trading occurred — price tends to move through them quickly. The Point of Control (POC) is the single price level with the highest traded volume in the period. Understanding where volume concentrates gives insight into institutional activity and likely areas of support/resistance that are not visible on a standard candlestick chart.',
       NULL, NULL,
       $2, $3, 7)`,
      [
        levelIds[3],
        JSON.stringify([
          'Applying volume profile without understanding price structure first',
          'Over-relying on volume profile as the only analysis tool',
          'Ignoring the timeframe of the volume profile being used',
        ]),
        JSON.stringify([
          'Volume Profile shows volume at each price level, not over time',
          'HVN: high trading activity — price consolidates here',
          'LVN: low activity — price moves through quickly',
          'POC: price level with the most volume in the period',
          'Combines powerfully with price action and market structure',
        ]),
      ]
    );
    console.log('Level 3 placeholder lesson inserted.');

    // ─── Seed lessons for Levels 0, 1, 2, 4 ─────────────────────────────────
    await seedLevel0(client, levelIds[0]);
    await seedLevel1(client, levelIds[1]);
    await seedLevel2(client, levelIds[2]);
    await seedLevel4(client, levelIds[4]);

    // ─── Chart Practice Drills ────────────────────────────────────────────────
    for (const drill of drillDefinitions) {
      await client.query(
        `INSERT INTO drills
           (title, description, level_required, chart_config, answer_set,
            hint1_text, hint2_text, explanation, difficulty, tags)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          drill.title,
          drill.description,
          drill.level_required,
          JSON.stringify(drill.chart_config),
          JSON.stringify(drill.answer_set),
          drill.hint1_text,
          drill.hint2_text,
          JSON.stringify(drill.explanation),
          drill.difficulty,
          JSON.stringify(drill.tags),
        ]
      );
    }
    console.log(`Drills inserted: ${drillDefinitions.length}`);

    await client.query('COMMIT');
    console.log('\n✅ Seed completed successfully!');
    console.log('   Levels: 5');
    console.log('   Lessons: 30 (10 + 10 + 5 + 1 placeholder + 5)');
    console.log(`   Drills: ${drillDefinitions.length} (5 existing + 4 easy + 4 medium + 2 hard)`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed, rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
