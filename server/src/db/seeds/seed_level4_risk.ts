import { PoolClient } from 'pg';

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

export async function seedLevel4(client: PoolClient, levelId: number): Promise<void> {
  const lessons: LessonData[] = [
    {
      order_num: 1,
      title: 'Building a Trading Plan',
      content: `A trading plan is a written document defining every aspect of your trading: markets, timeframes, strategy rules, risk per trade, daily loss limit, and when to stop for the day. Without a plan, every decision is made under emotional pressure — the worst possible state for judgment. Your plan removes the need to think under fire. Core sections: (1) Strategy — exact entry and exit criteria; (2) Risk rules — max % per trade, max daily/weekly drawdown; (3) Session rules — which hours and which to avoid; (4) Trade management — how and when to move stops or take partials. Review monthly using your journal data. A plan that evolves with evidence is a living tool.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Trading without a documented plan',
        'Having a plan but not following it consistently',
        'Not including a hard daily loss limit',
        'Updating the plan based on emotions rather than data',
        'Making the plan so complex it cannot be followed under pressure',
      ],
      key_takeaways: [
        'A trading plan eliminates in-the-moment emotional decisions',
        'Include strategy, risk rules, session rules, and trade management',
        'Define a daily loss limit and honor it without exception',
        'Review monthly using journal data — update with evidence only',
        'Simple, consistently-followed plan beats a complex plan you ignore',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'The primary purpose of a written trading plan is to:',
          options: [
            'Guarantee profits on every trade',
            'Remove emotional decision-making by pre-defining all rules',
            'Impress other traders in a community',
            'Avoid paying taxes on trading income',
          ],
          correct_answer: 'Remove emotional decision-making by pre-defining all rules',
          explanation: 'Rules defined before the market opens are objective. Decisions made mid-session are emotional. The plan bridges that gap.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'A daily loss limit is an optional component that experienced traders typically skip.',
          options: null,
          correct_answer: 'false',
          explanation: 'A daily loss limit is critical at all experience levels. Without it, a bad day can become a catastrophic account drawdown.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'A trading plan should be updated:',
          options: [
            'Never — once written it must remain fixed',
            'Randomly whenever you feel like changing something',
            'Monthly, based on journal data and statistical evidence',
            'After every single trade based on the outcome',
          ],
          correct_answer: 'Monthly, based on journal data and statistical evidence',
          explanation: 'Monthly review using objective data allows you to improve the plan systematically without reacting emotionally to individual trade outcomes.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'A simple plan you can follow consistently beats a complex plan you cannot follow under pressure.',
          options: null,
          correct_answer: 'true',
          explanation: 'Complexity is the enemy of execution. Under trading pressure, you will default to what is simple and automatic — not what requires effort to recall.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'Which of the following is NOT a core section of a trading plan?',
          options: [
            'Strategy entry and exit criteria',
            'Risk rules including max % per trade',
            'Social media trading groups to follow for signals',
            'Session rules defining trading hours',
          ],
          correct_answer: 'Social media trading groups to follow for signals',
          explanation: 'A trading plan covers your own rules and process. External signal sources undermine the discipline of building and following your own strategy.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
    {
      order_num: 2,
      title: 'Position Sizing Fundamentals',
      content: `Position sizing translates your risk percentage into a specific number of units (shares, lots, contracts) for each trade. The formula: Position Size = (Account Balance × Risk %) ÷ (Distance to Stop Loss × Value per Unit). Example: $10,000 account, 1% risk = $100. Stop loss is 50 pips on EUR/USD where 1 pip = $1 on a micro lot, so: $100 ÷ 50 = 2 micro lots. Consistent sizing means every trade risks the same dollar amount regardless of stop distance — a tight stop gets a larger lot; a wide stop gets a smaller lot. This prevents wide stops from accidentally creating outsized risk. Never size based on confidence; always use the formula.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Using the same lot size on every trade regardless of stop distance',
        'Sizing based on how confident you feel about the setup',
        'Not recalculating position size after account growth or drawdown',
        'Ignoring leverage when calculating actual dollar risk',
        'Rounding lot sizes in ways that significantly change the intended risk',
      ],
      key_takeaways: [
        'Position size = (account risk in $) ÷ (distance to stop × value per unit)',
        'Consistent dollar risk per trade regardless of stop distance',
        'Tight stop = larger lot; wide stop = smaller lot',
        'Never size emotionally — always run the formula',
        'Recalculate position size as your account balance changes',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'With a $20,000 account using a 1% risk rule, how much do you risk per trade?',
          options: ['$20', '$200', '$2,000', '$20,000'],
          correct_answer: '$200',
          explanation: '1% of $20,000 = $200. This is the maximum dollar loss you should incur on a single trade.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'You should use the same lot size on every trade regardless of stop loss distance.',
          options: null,
          correct_answer: 'false',
          explanation: 'Fixed lot sizing means a wider stop creates larger dollar risk. Proper sizing adjusts lots based on stop distance to maintain consistent dollar risk.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'If your stop loss distance doubles on a trade, your position size should:',
          options: ['Double', 'Stay exactly the same', 'Halve', 'Triple'],
          correct_answer: 'Halve',
          explanation: 'If stop distance doubles, you must halve the position size to keep your dollar risk the same: (risk $) ÷ (2× distance) = 0.5× size.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'Sizing a position based on how confident you feel about a setup is an effective strategy.',
          options: null,
          correct_answer: 'false',
          explanation: 'Confidence is not a reliable predictor of trade outcomes. Using the formula ensures consistent risk regardless of psychological state.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'The primary benefit of proper position sizing is:',
          options: [
            'Ensuring every trade has an equal probability of success',
            'Ensuring every trade has the same dollar risk regardless of stop distance',
            'Ensuring every trade uses the same lot size for simplicity',
            'Ensuring stop losses are always triggered at the exact planned level',
          ],
          correct_answer: 'Ensuring every trade has the same dollar risk regardless of stop distance',
          explanation: 'Consistent dollar risk is what position sizing achieves. This allows your statistics to be meaningful and comparable across all trades.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
    {
      order_num: 3,
      title: 'Stop Loss Placement Strategies',
      content: `Stop loss placement is a structural skill: stops should be based on market structure, not arbitrary pip counts. The principle — place your stop behind the level that invalidates your trade idea. If buying at support, the stop goes below support (buyers have failed if price gets there). If buying after a BOS, the stop goes below the swing low that formed the BOS. Common techniques: (1) Behind a key swing high/low — cleanest structural method; (2) Behind an order block's full range; (3) ATR-based stop — using a multiple of Average True Range to account for volatility. Give the stop a small buffer beyond the structural level to avoid obvious stop-hunt levels. Never place stops at round numbers where retail clusters concentrate.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Placing stop losses at obvious round numbers where they get hunted',
        'Using arbitrary fixed-pip stops not based on market structure',
        'Setting stops too tight so normal volatility triggers them',
        'Never adjusting the stop as the trade moves in your favor',
        'Placing stops exactly at the level instead of just beyond it',
      ],
      key_takeaways: [
        'Stop placement = behind the level that invalidates your trade idea',
        'Place behind structural swing points or order blocks',
        'Give a small buffer beyond the obvious level',
        'Avoid round numbers — stop-hunting concentrates there',
        'Trail your stop to lock in profits as the trade develops',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'The primary principle for placing a stop loss is:',
          options: [
            'Always use exactly 20 pips regardless of the setup',
            'Place it at the nearest round number',
            'Behind the level that structurally invalidates your trade idea',
            'As tight as possible to minimize the potential loss',
          ],
          correct_answer: 'Behind the level that structurally invalidates your trade idea',
          explanation: 'Your stop should be at the point where your reason for being in the trade is proven wrong — not at an arbitrary distance from entry.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'Placing a stop loss exactly at an obvious support level (without any buffer beyond it) is ideal.',
          options: null,
          correct_answer: 'false',
          explanation: 'The obvious level is the stop-hunt target. You need a buffer just beyond it so normal price wicks and brief sweeps don\'t trigger your exit.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'If you buy at a support zone, your stop loss should be placed:',
          options: [
            'Above the support zone',
            'Below the support zone where buyers have structurally failed',
            'At the midpoint of the support zone',
            'At breakeven immediately after entry',
          ],
          correct_answer: 'Below the support zone where buyers have structurally failed',
          explanation: 'If price closes below support, buyers have failed at that level — your trade idea is invalidated. That\'s where the stop goes.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'ATR (Average True Range) can be a useful reference when setting stops to account for natural market volatility.',
          options: null,
          correct_answer: 'true',
          explanation: 'ATR measures recent average price movement. Using a multiple of ATR ensures your stop is beyond the typical noise range for that instrument.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'Why should stop losses avoid obvious round numbers?',
          options: [
            'Because round numbers are always strong support/resistance',
            'Because many retail stops cluster there making them prime stop-hunt targets',
            'Because brokers charge higher fees for stops at round numbers',
            'Round numbers are irrelevant to stop placement decisions',
          ],
          correct_answer: 'Because many retail stops cluster there making them prime stop-hunt targets',
          explanation: 'Everyone places stops at obvious round numbers. Institutions know this and push price to those levels to trigger them before reversing.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
    {
      order_num: 4,
      title: 'Risk-to-Reward Ratios',
      content: `Risk-to-reward (R:R) ratio compares potential loss to potential profit. A 1:2 R:R means you risk $100 to potentially make $200. This determines how often you need to be right to be profitable. With 1:2 R:R, you only need to win 34% of trades to break even (ignoring commissions). With 1:1 R:R, you need 50%+ just to break even. Higher R:R ratios allow profitability even with a low win rate. Calculation: R (risk) = entry to stop distance; reward = entry to target distance. Minimum: 1.5:1 R:R; optimal for most strategies: 2:1 or better. If the target is too close relative to the stop, skip the trade. Never lower your target to make the math work — find a setup that naturally offers good R:R.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Taking trades with 1:1 or lower risk-to-reward',
        'Adjusting profit targets lower mid-trade to force a win',
        'Ignoring R:R calculation in the excitement of a setup',
        'Widening stop losses to artificially improve the apparent R:R',
        'Not recalculating R:R when market structure shifts stop or target levels',
      ],
      key_takeaways: [
        'R:R = potential reward ÷ potential risk per trade',
        '1:2 R:R: you need to win only ~34% of trades to break even',
        'Minimum 1.5:1 R:R before entering any trade',
        'Never lower profit targets to force a better-looking ratio',
        'High R:R allows profitability even with a sub-50% win rate',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'A trade with a 1:3 risk-to-reward ratio means:',
          options: [
            'You risk $3 to potentially make $1',
            'You risk $1 to potentially make $3',
            'You need to win 75% of trades to be profitable',
            'You can only afford to lose 3 trades before stopping',
          ],
          correct_answer: 'You risk $1 to potentially make $3',
          explanation: 'R:R is expressed as risk:reward. 1:3 = risk 1 unit to earn 3 units. At this ratio you only need to win 25%+ to be profitable.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'With a 1:2 risk-to-reward ratio, you need to win more than 50% of trades to be profitable.',
          options: null,
          correct_answer: 'false',
          explanation: 'At 1:2 R:R, break-even is roughly 34%. Each win earns twice what each loss costs, so you can profit with fewer wins.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'What is the minimum R:R ratio recommended before entering any trade?',
          options: ['0.5:1', '1:1', '1.5:1', '5:1 only'],
          correct_answer: '1.5:1',
          explanation: 'Below 1.5:1, your wins don\'t sufficiently offset your losses over time. Most professional traders target 2:1 or better.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'Widening your stop loss to artificially improve your apparent R:R ratio is a sound practice.',
          options: null,
          correct_answer: 'false',
          explanation: 'Widening the stop doesn\'t improve real R:R — it just increases the amount you lose when stopped out. True R:R is based on structural levels.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'A trader using a 1:2 R:R who wins 40% of their trades will:',
          options: [
            'Lose money overall since 40% win rate is below 50%',
            'Break even exactly',
            'Make a profit overall',
            'Need more information to determine the outcome',
          ],
          correct_answer: 'Make a profit overall',
          explanation: '10 trades: 4 wins × $2 = $8; 6 losses × $1 = $6. Net profit = $2. A 40% win rate at 1:2 R:R is mathematically profitable.',
          visual_config: null,
          order_num: 5,
        },
      ],
    },
    {
      order_num: 5,
      title: 'Managing Open Positions',
      content: `Once a trade is open, your role shifts from opportunity-finder to risk manager. Three management phases: (1) Initial — stop at the original structural level, do not touch it. (2) Breakeven — after price moves ~1R in your favor, move stop to entry price; the trade can no longer result in a loss. (3) Trailing — as price extends, trail the stop behind new swing lows (for longs) or swing highs (for shorts), locking in profit while keeping the trade open. Partial exits: taking 50% off at 1R–1.5R reduces emotional pressure and guarantees some profit while letting the remainder run. Avoid micromanaging — constant chart-watching leads to premature emotional exits.`,
      visual_type: null,
      visual_config: null,
      common_mistakes: [
        'Moving stop loss against the trade to avoid taking a loss',
        'Closing winning trades too early due to fear',
        'Never moving stop to breakeven after a 1R gain',
        'Watching the chart constantly, causing emotional decisions',
        'Taking full profit too early and missing the larger move',
      ],
      key_takeaways: [
        'Three phases: initial stop → move to breakeven after 1R → trailing stop',
        'Moving to breakeven eliminates loss risk after 1R gain',
        'Trail stop behind structural swings as the trade develops',
        'Partial exits reduce emotional pressure while maintaining exposure',
        'Set levels, set alerts, avoid micromanaging open positions',
      ],
      estimated_minutes: 5,
      questions: [
        {
          type: 'multiple_choice',
          question_text: 'Moving your stop loss to breakeven is most appropriate when:',
          options: [
            'Price moves against your position initially',
            'Price has moved approximately 1R in your favor',
            'You place the trade at the very beginning',
            'After the trade has already hit your profit target',
          ],
          correct_answer: 'Price has moved approximately 1R in your favor',
          explanation: 'At 1R gained, moving to breakeven eliminates loss risk on the trade. The position can now only result in a profit or a breakeven exit.',
          visual_config: null,
          order_num: 1,
        },
        {
          type: 'true_false',
          question_text: 'Moving a stop loss in the wrong direction (further away from entry) is an acceptable risk management technique.',
          options: null,
          correct_answer: 'false',
          explanation: 'Widening the stop converts a planned small loss into a larger one. It is one of the most destructive habits in trading.',
          visual_config: null,
          order_num: 2,
        },
        {
          type: 'multiple_choice',
          question_text: 'Trailing a stop loss means:',
          options: [
            'Moving it further from your entry as price moves away',
            'Moving it progressively closer to current price as the trade profits, locking in gains',
            'Keeping it permanently fixed at the original entry level',
            'Setting it at the nearest round number each day',
          ],
          correct_answer: 'Moving it progressively closer to current price as the trade profits, locking in gains',
          explanation: 'A trailing stop follows price in the profitable direction, locking in gains while keeping the trade open for further potential.',
          visual_config: null,
          order_num: 3,
        },
        {
          type: 'true_false',
          question_text: 'Taking a partial exit (e.g., 50% off at 1R) is a valid way to reduce emotional pressure while maintaining remaining exposure.',
          options: null,
          correct_answer: 'true',
          explanation: 'Partial exits bank some profit, reducing the emotional charge on the remaining position. This makes it easier to follow your trailing stop plan.',
          visual_config: null,
          order_num: 4,
        },
        {
          type: 'multiple_choice',
          question_text: 'What is the primary risk of micromanaging open trades?',
          options: [
            'Missing better entry opportunities on other instruments',
            'Premature exits driven by short-term noise instead of structural reasons',
            'Improved position sizing accuracy',
            'Missing scheduled economic news events',
          ],
          correct_answer: 'Premature exits driven by short-term noise instead of structural reasons',
          explanation: 'Constant watching triggers emotional responses to every minor candle. Set your levels, use alerts if needed, and review at key structural points only.',
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

  console.log(`  ✓ Level 4: ${lessons.length} lessons inserted`);
}
