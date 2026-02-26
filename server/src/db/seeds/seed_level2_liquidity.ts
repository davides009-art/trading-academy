import { PoolClient } from 'pg';
import { generateOHLC } from './ohlc_generator';

interface Question {
  type: 'multiple_choice' | 'true_false' | 'visual';
  question_text: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string;
  visual_config: object | null;
  order_num: number;
}

interface LessonData {
  order_num: number;
  title: string;
  content: string;
  visual_type: string | null;
  visual_config: object | null;
  common_mistakes: string[];
  key_takeaways: string[];
  estimated_minutes: number;
  questions: Question[];
}

// Bearish-then-bullish chart: downtrend followed by a BOS breakout
const BEARISH_CHART = generateOHLC(7007, 20, 120, -0.5, 1.8);
// Range with equal highs/lows for liquidity lesson
const RANGE_CHART = generateOHLC(8008, 24, 110, 0.0, 2.0);

export async function seedLevel2(client: PoolClient, levelId: number): Promise<void> {
  const lessons: LessonData[] = [
    {
      order_num: 1,
      title: 'Understanding Market Structure',
      content: `Market structure is the framework of swing highs and swing lows and the sequence they create — it is the foundation of institutional-style price action analysis. Bullish structure: higher highs (HH) and higher lows (HL). Bearish structure: lower lows (LL) and lower highs (LH). When structure is clearly bullish, the bias is long (buy pullbacks to HL). When bearish, the bias is short (sell rallies to LH). Structure exists on every timeframe — the higher timeframe provides the overall directional bias; lower timeframes offer entry precision. Structural swings must be significant (formed by momentum or multiple candles). Minor noise candles do not qualify. Start with structure before any indicator or pattern.`,
      visual_type: 'candlestick',
      visual_config: {
        type: 'candlestick',
        data: BEARISH_CHART,
        caption: 'Bearish market structure: each swing high is lower than the last and each swing low is lower — LL + LH sequence.',
      },
      common_mistakes: [
        'Marking every minor candle wiggle as a structural swing point',
        'Ignoring higher-timeframe structure when analyzing lower TF',
        'Changing bias too quickly after a single weak swing',
        'Not distinguishing between internal and external structure swings',
        'Over-complicating analysis with too many labeled points',
      ],
      key_takeaways: [
        'Market structure = the sequence of significant swing highs and lows',
        'Bullish: HH + HL; Bearish: LL + LH',
        'Higher timeframe structure sets the overall directional bias',
        'Structure is the foundation — apply it before indicators or patterns',
        'Only label structurally significant, momentum-driven swings',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'What does a bullish market structure consist of?',
          options: ['Lower lows and lower highs', 'Higher highs and higher lows', 'Equal highs and equal lows', 'Random swings without clear direction'],
          correct_answer: 'Higher highs and higher lows',
          explanation: 'HH + HL is the definition of bullish market structure — each peak and each pullback bottom is higher than the previous.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'Minor noise candles should be labeled as structural swing points when building market structure analysis.',
          options: null,
          correct_answer: 'false',
          explanation: 'Only momentum-driven, significant swing points qualify. Labeling minor noise creates chart clutter and false signals.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'Higher-timeframe market structure is primarily used to:',
          options: [
            'Find exact entry prices with precision',
            'Establish the overall directional bias before looking for entries',
            'Identify specific candle patterns for immediate trading',
            'Calculate precise position size',
          ],
          correct_answer: 'Establish the overall directional bias before looking for entries',
          explanation: 'The HTF structure tells you which direction to trade. LTF analysis then finds precise entry points within that bias.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'In a clearly bearish market structure, traders primarily look for long (buy) setups.',
          options: null,
          correct_answer: 'false',
          explanation: 'Bearish structure (LL + LH) means the dominant bias is short. Trading long fights the dominant force and lowers win probability.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'Market structure analysis should be performed:',
          options: [
            'After all indicators have been applied to the chart',
            'Before indicators or patterns — as the primary analytical framework',
            'Only on the 1-minute chart for day traders',
            'Only by institutional traders, not retail traders',
          ],
          correct_answer: 'Before indicators or patterns — as the primary analytical framework',
          explanation: 'Structure gives you the directional bias. Patterns and indicators are then used to time entries within that structural context.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
    {
      order_num: 2,
      title: 'Break of Structure (BOS)',
      content: `A Break of Structure (BOS) occurs when price takes out the most recent significant swing high (in bullish structure) or swing low (in bearish structure). In an uptrend, a BOS happens when price closes above the prior swing high — confirming continuation of bullish structure. In a downtrend, a BOS closes below the prior swing low. The BOS is a continuation signal: the market remains committed to the current direction. After a BOS, expect a brief pullback before the next leg continues. This pullback to a relevant level (prior structure, order block, S/R) offers the highest-probability entry. The BOS is your "green light" to look for continuation entries.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Treating every minor new high as a significant BOS',
        'Entering immediately after the BOS candle without waiting for pullback',
        'Confusing BOS (continuation) with CHOCH (potential reversal)',
        'Ignoring whether the BOS occurred on a significant timeframe',
        'Entering at the BOS candle itself instead of the subsequent pullback',
      ],
      key_takeaways: [
        'BOS = price closes beyond the most recent structural swing point',
        'Bullish BOS: close above prior swing high = trend continuation',
        'Bearish BOS: close below prior swing low = trend continuation',
        'Wait for pullback after BOS for the highest-probability entry',
        'BOS confirms continuation — it is not a reversal signal',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'A bullish Break of Structure (BOS) occurs when:',
          options: [
            'Price closes below the prior swing low',
            'Price closes above the prior swing high',
            'Price forms a doji at a support level',
            'Price consolidates for 5 or more candles',
          ],
          correct_answer: 'Price closes above the prior swing high',
          explanation: 'A bullish BOS confirms that buyers have taken out the most recent resistance swing high — structure continues higher.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'A Break of Structure (BOS) is primarily a trend reversal signal.',
          options: null,
          correct_answer: 'false',
          explanation: 'BOS is a continuation signal — it confirms the trend is extending in the same direction. CHOCH, not BOS, signals potential reversal.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'After a bullish BOS, the highest-probability entry is found:',
          options: [
            'Immediately on the candle that made the BOS',
            'During the pullback to a relevant structural level',
            'At the next resistance level above the BOS',
            'When price makes another BOS in the same direction',
          ],
          correct_answer: 'During the pullback to a relevant structural level',
          explanation: 'Entering on the BOS candle means buying at resistance (the broken level). Waiting for a pullback gives a better price with defined risk.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'A BOS must occur on all timeframes simultaneously to be considered valid.',
          options: null,
          correct_answer: 'false',
          explanation: 'BOS is timeframe-specific. A BOS on the H4 is valid for H4 analysis. It doesn\'t need to match the 1-minute or weekly chart simultaneously.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'A bearish BOS is confirmed when:',
          options: [
            'Price makes a new swing high',
            'Price closes below the most recent significant swing low',
            'A doji forms at a key resistance level',
            'Trading volume doubles on a single candle',
          ],
          correct_answer: 'Price closes below the most recent significant swing low',
          explanation: 'Breaking the prior swing low confirms bearish structure is extending — sellers have taken out the last area buyers defended.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
    {
      order_num: 3,
      title: 'Change of Character (CHOCH)',
      content: `A Change of Character (CHOCH) signals a potential shift from bullish to bearish structure (or vice versa) — unlike the BOS which confirms continuation. In an uptrend, a CHOCH occurs when price fails to make a new higher high, then breaks below the most recent higher low — breaking the bullish structure for the first time. In a downtrend, CHOCH happens when price fails to make a new lower low, then breaks above the most recent lower high. CHOCH is a warning, not a confirmed reversal. Confirmation arrives when a subsequent BOS occurs in the new direction. The CHOCH-then-BOS sequence provides a framework for identifying potential trend reversals with controlled risk.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Trading the CHOCH immediately as a confirmed full reversal',
        'Ignoring the need for a confirming BOS in the new direction',
        'Confusing CHOCH with a normal pullback within the existing trend',
        'Applying CHOCH on very low timeframes where noise dominates',
        'Risking large position size on CHOCH before BOS confirmation',
      ],
      key_takeaways: [
        'CHOCH = first break of the dominant trend structure',
        'Bullish-to-bearish CHOCH: fails to make HH, then breaks below prior HL',
        'Bearish-to-bullish CHOCH: fails to make LL, then breaks above prior LH',
        'CHOCH is a warning signal — wait for BOS to confirm new direction',
        'CHOCH → BOS sequence = high-confidence reversal framework',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'How does a CHOCH fundamentally differ from a BOS?',
          options: [
            'CHOCH is a trend continuation signal; BOS signals reversal',
            'CHOCH signals potential reversal; BOS confirms trend continuation',
            'They are identical patterns with different names',
            'CHOCH only occurs on higher timeframes',
          ],
          correct_answer: 'CHOCH signals potential reversal; BOS confirms trend continuation',
          explanation: 'BOS = trend continues. CHOCH = trend may be ending. This distinction is fundamental to smart money analysis.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'A CHOCH alone is sufficient reason to immediately enter a large reversal trade.',
          options: null,
          correct_answer: 'false',
          explanation: 'CHOCH is only the first signal. It warns of potential reversal but requires a confirming BOS in the new direction before high-conviction entry.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'A bearish CHOCH in an uptrend is signaled by:',
          options: [
            'Price making a new higher high strongly',
            'Price failing to make a new HH, then breaking below the prior HL',
            'Three consecutive bearish candles with long upper wicks',
            'A bearish engulfing pattern at a random price level',
          ],
          correct_answer: 'Price failing to make a new HH, then breaking below the prior HL',
          explanation: 'The two-step sequence — no new HH + break of prior HL — is what defines a CHOCH and distinguishes it from a normal pullback.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'After a CHOCH, traders wait for a subsequent BOS in the new direction before entering with full confidence.',
          options: null,
          correct_answer: 'true',
          explanation: 'CHOCH + confirming BOS = the two-step reversal confirmation. This sequence reduces false positives versus trading on CHOCH alone.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'The "CHOCH followed by BOS" sequence is used to:',
          options: [
            'Confirm trend continuation with high certainty',
            'Identify potential trend reversal areas with increased confidence',
            'Calculate the exact position size for a trade',
            'Find breakout entries in a ranging market',
          ],
          correct_answer: 'Identify potential trend reversal areas with increased confidence',
          explanation: 'The two-step sequence filters out single-candle fakeouts and provides a structured framework for reversal trading.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
    {
      order_num: 4,
      title: 'Liquidity and Equal Highs/Lows',
      content: `Liquidity refers to clusters of pending orders sitting near identifiable price levels. Retail traders commonly place stop losses just beyond obvious highs and lows — creating pools of orders that institutional participants can target. Equal highs (two or more swing highs at approximately the same price) signal a high concentration of stop orders just above them. Equal lows signal stops just below. Institutions often push price to these pools to fill their large orders before reversing — this is why many "breakouts" fail sharply. The concept explains fakeouts: price sweeps the equal high/low (collecting stops), then reverses. Recognizing this pattern helps you avoid being the trader whose stop gets hunted.`,
      visual_type: 'candlestick',
      visual_config: {
        type: 'candlestick',
        data: RANGE_CHART,
        caption: 'Range with equal highs and equal lows — retail stop-loss clusters sit just above the highs and just below the lows.',
      },
      common_mistakes: [
        'Placing stop losses at the obvious equal high/low level without a buffer',
        'Not distinguishing between stop hunts and genuine breakouts',
        'Assuming every liquidity sweep leads to a reversal',
        'Ignoring the broader market context when interpreting sweeps',
        'Treating any two similar price levels as significant equal highs/lows',
      ],
      key_takeaways: [
        'Liquidity = clusters of pending orders near identifiable levels',
        'Equal highs/lows = concentrated retail stop-loss zones',
        'Institutions sweep these zones to fill orders, then reverse',
        'Place stops beyond the obvious level to avoid being hunted',
        'Liquidity sweeps often precede reversals — but need confirmation',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: '"Equal highs" in market structure typically represent:',
          options: [
            'A strong breakout confirmation signal',
            'A cluster of retail stop-loss orders sitting above those highs',
            'A confirmed bullish breakout zone',
            'A random coincidence of equal price levels',
          ],
          correct_answer: 'A cluster of retail stop-loss orders sitting above those highs',
          explanation: 'Traders who sold at equal highs placed their stops just above them. This creates a predictable liquidity pool for larger participants to target.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'Institutional traders target retail stop-loss clusters near obvious levels to fill their large orders.',
          options: null,
          correct_answer: 'true',
          explanation: 'Institutions need counterpart orders to fill large positions. Retail stops provide that liquidity. Once filled, they reverse — causing the "fakeout" effect.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'After a liquidity sweep of equal lows, what most commonly happens next?',
          options: [
            'Price immediately continues lower with accelerating momentum',
            'Price reverses sharply upward after collecting stop orders below',
            'Nothing changes — price resumes its prior direction',
            'Trading volume disappears completely',
          ],
          correct_answer: 'Price reverses sharply upward after collecting stop orders below',
          explanation: 'After sweeping the stops below equal lows, institutions have filled their buy orders. With no more sell pressure, price reverses up sharply.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'Placing your stop loss exactly at an obvious equal high/low is the safest approach.',
          options: null,
          correct_answer: 'false',
          explanation: 'The obvious level is exactly where stop hunts are designed to reach. Place stops beyond the obvious level — past where the sweep would go.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'visual',
          question_text: 'Looking at the range chart shown: price has formed multiple highs at approximately the same level. What does this represent?',
          options: [
            'A confirmed breakout zone with strong bullish momentum',
            'A liquidity pool — a concentration of stop orders just above those equal highs',
            'A resistance zone that price will never breach',
            'A pattern with no significance in price action analysis',
          ],
          correct_answer: 'A liquidity pool — a concentration of stop orders just above those equal highs',
          explanation: 'Equal highs create a predictable pool of stop-loss orders. This is a target for liquidity sweeps before potential reversal.',
          visual_config: {
            type: 'candlestick',
            data: RANGE_CHART,
          },
          order_num: 5,
        },
      ],
    },
    {
      order_num: 5,
      title: 'Introduction to Order Blocks',
      content: `An order block is the last significant bearish candle (or cluster) before a strong bullish impulse, or the last significant bullish candle before a strong bearish impulse. The logic: institutions cannot fill all their orders at once without moving price against themselves, so they leave residual orders at the level where they began. Price returns on a pullback to collect those remaining orders. A bullish order block (last bearish candle before a strong up-move) acts as support on retest. A bearish order block (last bullish candle before a strong down-move) acts as resistance. Most reliable when: the subsequent impulse was strong and impulsive, the order block is "fresh" (not yet retested), and it aligns with higher-timeframe bias.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Labeling random candles as order blocks without a strong impulse following them',
        'Using order blocks that have been retested multiple times (mitigated)',
        'Ignoring higher-timeframe directional bias when applying order blocks',
        'Treating order blocks as guaranteed bounce levels in all conditions',
        'Confusing order blocks with general support/resistance zones',
      ],
      key_takeaways: [
        'Order block = last opposing candle before a strong impulse move',
        'Bullish OB: last bearish candle before a strong up-move',
        'Bearish OB: last bullish candle before a strong down-move',
        'Price returns to fill residual institutional orders at that level',
        'Most reliable when the impulse was strong and the OB is fresh/untested',
      ],
      estimated_minutes: 6,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'A bullish order block is best described as:',
          options: [
            'The first green candle in a new uptrend',
            'The last significant bearish candle before a strong bullish impulse move',
            'A support zone drawn from multiple swing lows',
            'An engulfing pattern at a key level',
          ],
          correct_answer: 'The last significant bearish candle before a strong bullish impulse move',
          explanation: 'The last bearish candle before the impulse is where institutional buyers began entering. Residual orders remain there for the retest.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'An order block that has been retested and visited multiple times is considered "fresh" and highly reliable.',
          options: null,
          correct_answer: 'false',
          explanation: 'Each retest "mitigates" the order block — filling residual orders. After multiple visits, most orders are filled and the OB loses its significance.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'Why do institutions leave residual orders at order block levels?',
          options: [
            'Because regulations require them to hold orders at specific levels',
            'Because they cannot fill all their orders at once without moving price against themselves',
            'Because retail traders avoid those levels, making them safe',
            'Because lagging indicators signal reversals there',
          ],
          correct_answer: 'Because they cannot fill all their orders in one candle without moving price against themselves',
          explanation: 'Large orders cause slippage. Institutions spread entry over multiple executions. The initial entry zone remains a magnet for their remaining orders.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'A bearish order block is the last bullish candle before a strong bearish impulse move.',
          options: null,
          correct_answer: 'true',
          explanation: 'The last bullish candle before the bearish impulse is where institutional sellers began their distribution. It acts as resistance on retest.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'Which condition makes an order block most reliable as a trading level?',
          options: [
            'The order block is located on a 1-minute chart',
            'The impulse following the OB was strong, and the OB has not yet been retested',
            'The OB coincides with a round number price',
            'The OB is confirmed by a lagging indicator signal',
          ],
          correct_answer: 'The impulse following the OB was strong, and the OB has not yet been retested',
          explanation: 'A strong impulse confirms institutional conviction at that level. Being fresh (untested) means the residual orders are still waiting to be filled.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
  ];

  for (const lesson of lessons) {
    const { questions, ...lessonData } = lesson;
    const lessonResult = await client.query(
      `INSERT INTO lessons (level_id, order_num, title, content, visual_type, visual_config, common_mistakes, key_takeaways, estimated_minutes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        levelId,
        lessonData.order_num,
        lessonData.title,
        lessonData.content,
        lessonData.visual_type,
        lessonData.visual_config ? JSON.stringify(lessonData.visual_config) : null,
        JSON.stringify(lessonData.common_mistakes),
        JSON.stringify(lessonData.key_takeaways),
        lessonData.estimated_minutes,
      ]
    );
    const lessonId: number = lessonResult.rows[0].id;

    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (lesson_id, type, question_text, options, correct_answer, explanation, visual_config, order_num)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          lessonId,
          q.type,
          q.question_text,
          q.options ? JSON.stringify(q.options) : null,
          q.correct_answer,
          q.explanation,
          q.visual_config ? JSON.stringify(q.visual_config) : null,
          q.order_num,
        ]
      );
    }
  }

  console.log(`  ✓ Level 2: ${lessons.length} lessons inserted`);
}
