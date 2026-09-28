/* Stoxed course content.
 * Every chart is generated from seeded waypoints so answers can be computed
 * from the same data the learner sees (e.g. the exact RSI < 30 candle). */
(function (global) {
  'use strict';

  const { gen, patch, closes, sma, rsi, macd } = global.StoxChart;

  const firstCrossUp = (a, b, from) => {
    for (let i = Math.max(1, from || 1); i < a.length; i++) {
      if ([a[i], b[i], a[i - 1], b[i - 1]].some(v => v == null)) continue;
      if (a[i] > b[i] && a[i - 1] <= b[i - 1]) return i;
    }
    return -1;
  };
  const firstIndex = (arr, fn, from) => {
    for (let i = from || 0; i < arr.length; i++) if (arr[i] != null && fn(arr[i], i)) return i;
    return -1;
  };

  /* =========================================================
   * Charts
   * ========================================================= */

  // Lesson 1 — market basics
  const bullRun = gen([[0, 100], [10, 112], [16, 107], [28, 130], [34, 125], [46, 150]], { seed: 3, vol: 1.6 });
  const bearRun = gen([[0, 150], [9, 139], [14, 145], [26, 121], [31, 127], [45, 100]], { seed: 5, vol: 1.6 });

  // Lesson 2 — candlesticks
  const twoCandles = [{ o: 100, h: 114, l: 94, c: 110 }, { o: 110, h: 116, l: 97, c: 101 }];
  const greenCandle = [{ o: 100, h: 114, l: 94, c: 110 }];
  const redCandle = [{ o: 110, h: 115, l: 93, c: 100 }];

  const hammer = patch(
    gen([[0, 128], [18, 104], [25, 113]], { seed: 11, vol: 1.1, wick: 0.3 }),
    { 18: { o: 104.4, h: 105.4, l: 97.2, c: 105.1 } }
  );

  const volumeTrend = gen([[0, 100], [8, 106], [12, 104], [22, 114], [26, 112], [34, 121]], { seed: 4, vol: 1.1 });

  const breakout = patch(
    gen([[0, 100], [4, 102.5], [8, 99.5], [12, 102.5], [16, 100], [20, 102], [21, 109], [29, 115]], { seed: 21, vol: 0.8, wick: 0.5 }),
    { 21: { o: 102.2, h: 109.8, l: 101.9, c: 109.4, v: 3900 }, 22: { o: 109.4, h: 110.6, l: 108.6, c: 110.1, v: 2100 } }
  );

  // Lesson 3 — support & resistance
  const rangeBound = gen([[0, 104], [4, 109.4], [8, 100.6], [12, 109.5], [16, 100.4], [20, 109.3], [24, 100.8], [28, 106]], { seed: 13, vol: 0.7, wick: 0.45 });

  const flipLevel = patch(
    gen([[0, 102], [4, 109], [8, 101], [12, 109.2], [15, 104], [19, 109.4], [23, 118], [27, 111], [29, 112.8], [36, 123]], { seed: 31, vol: 0.85, wick: 0.45 }),
    { 27: { o: 111.8, h: 112.4, l: 110.1, c: 112.1 } }
  );

  const trendBreak = patch(
    gen([[0, 100.8], [4, 108], [7, 105.4], [11, 113], [14, 110.2], [18, 119], [21, 115], [25, 124], [28, 120.4], [29, 113.6], [34, 110]], { seed: 41, vol: 0.85, wick: 0.4 }),
    { 29: { o: 120.2, h: 120.6, l: 113, c: 113.6 } }
  );
  const trendUp = trendBreak.slice(0, 26);
  // The widest line through two swing lows that no earlier low pierces.
  const trendLine = (() => {
    const lows = trendUp.map(c => c.l);
    let best = null;
    for (let i = 0; i < lows.length; i++) for (let j = i + 6; j < lows.length; j++) {
      const m = (lows[j] - lows[i]) / (j - i);
      const at = k => lows[i] + m * (k - i);
      if (m <= 0 || lows.some((l, k) => l < at(k) - 0.05)) continue;
      if (!best || j - i > best.j - best.i) best = { i, j, at };
    }
    return { a: [0, best.at(0)], b: [33, best.at(33)], at: best.at, touches: [best.i, best.j] };
  })();
  const trendBreakAt = firstIndex(trendBreak.map(c => c.c), (c, i) => c < trendLine.at(i), 26);

  // Lesson 4 — chart patterns
  const headShoulders = gen([[0, 96], [5, 108], [9, 101.4], [15, 118], [20, 101.4], [25, 109], [29, 101.2], [31, 97], [36, 90]], { seed: 51, vol: 0.9, wick: 0.45 });

  const doubleBottom = gen([[0, 121], [7, 100.5], [12, 110], [18, 100.8], [24, 112], [31, 121]], { seed: 61, vol: 0.95 });

  const doubleTop = patch(
    gen([[0, 100], [7, 119.6], [12, 111], [18, 119.4], [23, 112.6], [24, 106], [31, 98]], { seed: 71, vol: 0.9, wick: 0.4 }),
    { 24: { o: 112.4, h: 112.8, l: 105.6, c: 106.2 } }
  );
  const dtNeck = Math.min(...doubleTop.slice(9, 15).map(c => c.l));

  const ascTriangle = gen([[0, 100], [4, 109.6], [8, 103], [12, 109.7], [16, 106], [20, 109.6], [23, 108.4], [26, 116], [30, 119]], { seed: 81, vol: 0.7, wick: 0.35 });
  const descTriangle = gen([[0, 119], [4, 100.4], [8, 115], [12, 100.3], [16, 110], [20, 100.4], [23, 104], [26, 95], [30, 91]], { seed: 91, vol: 0.75, wick: 0.35 });

  // Lesson 5 — indicators
  const maData = gen([[0, 100], [12, 108], [18, 104], [34, 122], [40, 118], [50, 130]], { seed: 101, vol: 1.1 });
  const maClose = closes(maData);

  const crossData = gen([[0, 132], [20, 104], [27, 108], [33, 105], [52, 136]], { seed: 111, vol: 1.0 });
  const fastMA = sma(closes(crossData), 8), slowMA = sma(closes(crossData), 21);
  const goldenCross = firstCrossUp(fastMA, slowMA, 22);

  const rsiData = gen([[0, 110], [10, 117], [14, 114], [24, 95], [30, 98], [42, 110]], { seed: 121, vol: 0.9 });
  const rsiVals = rsi(closes(rsiData), 14);
  const firstOversold = firstIndex(rsiVals, v => v < 30, 14);

  // MACD needs ~34 candles of warm-up: compute on the full series, then show from candle 18.
  const macdFull = gen([[0, 118], [24, 110], [44, 96], [50, 99], [76, 122]], { seed: 133, vol: 1.0 });
  const macdFullVals = macd(closes(macdFull));
  const MACD_FROM = 18;
  const macdData = macdFull.slice(MACD_FROM);
  const macdVals = {
    macd: macdFullVals.macd.slice(MACD_FROM),
    signal: macdFullVals.signal.slice(MACD_FROM),
    hist: macdFullVals.hist.slice(MACD_FROM),
  };
  const macdCross = firstCrossUp(macdVals.macd, macdVals.signal, 34 - MACD_FROM);

  // Lesson 6 — orders
  const longTrade = gen([[0, 98], [4, 100], [9, 101.5], [12, 99.4], [20, 106], [26, 110.4]], { seed: 141, vol: 0.7, wick: 0.4 });
  const stopHit = gen([[0, 100], [5, 103.5], [10, 99.6], [14, 101.6], [19, 96.4], [22, 93], [27, 91]], { seed: 151, vol: 0.8, wick: 0.45 });
  const stopTrigger = firstIndex(stopHit.map(c => c.l), v => v <= 95, 1);

  // Lesson 7 — risk
  const rrTrade = gen([[0, 97], [6, 100], [10, 98.8], [18, 108], [24, 115.4], [27, 114]], { seed: 161, vol: 0.75, wick: 0.4 });

  /* =========================================================
   * Lessons
   * ========================================================= */

  const lessons = [
    {
      id: 'stocks-101',
      title: 'Stocks 101',
      desc: 'What a share really is, how exchanges price it, and bulls vs. bears.',
      icon: 'building',
      steps: [
        {
          type: 'learn',
          title: 'A stock is a slice of a company',
          body: '<p>When you buy a <b>share</b>, you become a part-owner of that business. If the company grows its profits, your slice becomes more valuable.</p>',
          points: [
            '<b>Price appreciation</b> — the share is worth more later than when you bought it.',
            '<b>Dividends</b> — some companies pay out part of their profits to shareholders. It’s optional, not guaranteed.',
          ],
          tip: 'Companies first sell shares to the public in an <b>IPO</b> (initial public offering) to raise money for growth.',
        },
        {
          type: 'mc',
          prompt: 'You buy one share of a company. What do you now own?',
          options: ['A small piece of the company', 'A loan you made to the company', 'A guaranteed yearly payout', 'The right to run the company day to day'],
          answer: 0,
          explain: 'A share is fractional ownership. A loan to a company is a bond, and dividends are never guaranteed.',
        },
        {
          type: 'learn',
          title: 'Exchanges match buyers and sellers',
          body: '<p>Stock exchanges like the <b>NYSE</b> and <b>Nasdaq</b> are marketplaces. They don’t set prices — they match orders.</p>',
          points: [
            '<b>Bid</b> — the highest price any buyer is currently willing to pay.',
            '<b>Ask</b> — the lowest price any seller is currently willing to accept.',
            '<b>Spread</b> — the gap between the two. Busy (liquid) stocks have tiny spreads.',
          ],
          tip: 'Price moves when one side is more eager: more urgent buyers lift the ask, more urgent sellers hit the bid.',
        },
        {
          type: 'mc',
          prompt: 'The highest price a buyer is currently willing to pay is called the…',
          options: ['Bid', 'Ask', 'Spread', 'Close'],
          answer: 0,
          explain: 'Buyers bid, sellers ask. The spread is the difference between the best bid and the best ask.',
        },
        {
          type: 'fill',
          prompt: 'Complete the sentence',
          text: 'A stock’s price rises when there are more eager ___ than ___.',
          bank: ['buyers', 'sellers', 'brokers', 'dividends'],
          answer: ['buyers', 'sellers'],
          explain: 'Price is pure supply and demand: when buyers are more aggressive than sellers, they must pay up to get filled.',
        },
        {
          type: 'tf',
          prompt: 'The stock exchange decides each stock’s price every morning.',
          answer: false,
          explain: 'Prices are set continuously by the orders of buyers and sellers. The exchange only runs the matching engine.',
        },
        {
          type: 'learn',
          title: 'Bull markets and bear markets',
          body: '<p>A <b>bull market</b> is a sustained rise in prices, driven by optimism. A <b>bear market</b> is a decline of <b>20% or more</b> from a recent high.</p>',
          chart: { candles: bullRun, height: 220, alt: 'A rising stock chart with higher highs and higher lows' },
          tip: 'Memory trick: a bull thrusts its horns <b>up</b>, a bear swipes its paws <b>down</b>. A 10–20% drop is usually called a <b>correction</b>.',
        },
        {
          type: 'mc',
          prompt: 'What kind of market does this chart show?',
          chart: { candles: bearRun, height: 220, alt: 'A falling stock chart' },
          options: ['Bull market', 'Bear market', 'Sideways market'],
          answer: 1,
          explain: 'Lower highs and lower lows, falling from 150 to 100 — a drop of about 33%. That’s bear territory.',
        },
        {
          type: 'match',
          prompt: 'Tap the matching pairs',
          pairs: [
            ['Share', 'A unit of ownership'],
            ['Exchange', 'Where orders get matched'],
            ['Spread', 'Gap between bid and ask'],
            ['Bull market', 'Prices trending up'],
            ['Bear market', 'A 20%+ decline'],
          ],
        },
        {
          type: 'mc',
          prompt: 'An index falls 12% from its peak over a few weeks, then stabilizes. What is this usually called?',
          options: ['A correction', 'A bear market', 'A bull market', 'An IPO'],
          answer: 0,
          explain: 'A 10–20% pullback is a correction. It only becomes a bear market past a 20% decline.',
        },
        {
          type: 'tf',
          prompt: 'Every company that sells stock must pay dividends to its shareholders.',
          answer: false,
          explain: 'Dividends are a choice. Many growth companies reinvest all their profits instead of paying them out.',
        },
      ],
    },

    {
      id: 'candlesticks',
      title: 'Reading Candlesticks',
      desc: 'Decode every candle: open, high, low, close — plus timeframes and volume.',
      icon: 'candle',
      steps: [
        {
          type: 'learn',
          title: 'Each candle tells a 4-price story',
          body: '<p>A candle summarizes one period of trading with four prices: <b>Open, High, Low, Close</b> (OHLC).</p>',
          chart: {
            candles: twoCandles, height: 260, candleMax: 48,
            alt: 'A green candle and a red candle, each annotated with open, high, low and close',
            notes: [
              { i: 0, p: 114, text: 'High', dx: 64, dy: 0 },
              { i: 0, p: 110, text: 'Close', dx: -64, dy: 0, tone: 'bull' },
              { i: 0, p: 100, text: 'Open', dx: -64, dy: 0 },
              { i: 0, p: 94, text: 'Low', dx: 64, dy: 0 },
              { i: 1, p: 116, text: 'High', dx: -64, dy: 0 },
              { i: 1, p: 110, text: 'Open', dx: 64, dy: 0 },
              { i: 1, p: 101, text: 'Close', dx: 64, dy: 0, tone: 'bear' },
              { i: 1, p: 97, text: 'Low', dx: -64, dy: 0 },
            ],
          },
          points: [
            '<b>Green</b> (bullish): close above open — the <b>top</b> of the body is the close.',
            '<b>Red</b> (bearish): close below open — the <b>bottom</b> of the body is the close.',
          ],
        },
        {
          type: 'label',
          prompt: 'Drag each label to the right spot on this bullish candle',
          chart: { candles: greenCandle, height: 280, candleMax: 56, alt: 'A single green candle with four empty drop zones' },
          targets: [
            { label: 'High', i: 0, p: 114, dx: 118, dy: 0 },
            { label: 'Close', i: 0, p: 110, dx: -118, dy: 0 },
            { label: 'Open', i: 0, p: 100, dx: -118, dy: 0 },
            { label: 'Low', i: 0, p: 94, dx: 118, dy: 0 },
          ],
          explain: 'On a green candle the body runs from the open (bottom) up to the close (top). The wick tips are the high and low.',
        },
        {
          type: 'mc',
          prompt: 'A red (bearish) candle means that during that period…',
          options: ['The price closed below where it opened', 'The price closed above where it opened', 'Volume was below average', 'The stock hit a new low'],
          answer: 0,
          explain: 'Color only compares close vs. open. Red = close < open. It says nothing about volume or longer-term lows.',
        },
        {
          type: 'learn',
          title: 'Bodies and wicks show who won',
          body: '<p>The <b>body</b> spans open to close. The thin <b>wicks</b> (shadows) show the extremes that price visited but couldn’t hold.</p>',
          points: [
            '<b>Long upper wick</b> — buyers pushed up, sellers slammed it back down.',
            '<b>Long lower wick</b> — sellers pushed down, buyers stepped in hard. After a downtrend this is called a <b>hammer</b>.',
            '<b>Tiny body</b> (a <b>doji</b>) — open ≈ close: indecision.',
          ],
        },
        {
          type: 'pick',
          prompt: 'After this downtrend, tap the hammer — the candle with a long lower wick.',
          chart: { candles: hammer, height: 250, alt: 'A downtrend followed by a hammer candle and a rebound' },
          answer: 18,
          explain: 'The hammer’s long lower wick shows sellers drove price to 97 but buyers pushed it right back up — often an early sign a downtrend is exhausting.',
        },
        {
          type: 'label',
          prompt: 'Label the parts of this bearish candle',
          chart: { candles: redCandle, height: 280, candleMax: 56, alt: 'A single red candle with three empty drop zones' },
          targets: [
            { label: 'Upper wick', i: 0, p: 112.5, dx: 128, dy: 0 },
            { label: 'Body', i: 0, p: 105, dx: -128, dy: 0 },
            { label: 'Lower wick', i: 0, p: 96.5, dx: 128, dy: 0 },
          ],
          explain: 'The filled body spans the open (110, top) to the close (100, bottom). The thin lines above and below are the wicks.',
        },
        {
          type: 'mc',
          prompt: 'A candle has Open 50, High 55, Low 48, Close 53. What is it?',
          options: ['Green, with a 2-point upper wick', 'Red, with a 2-point upper wick', 'Green, with a 5-point upper wick', 'Red, with a 3-point lower wick'],
          answer: 0,
          explain: 'Close (53) > Open (50), so it’s green. The upper wick runs from the top of the body (53) to the high (55): 2 points.',
        },
        {
          type: 'learn',
          title: 'Timeframes: zoom in, zoom out',
          body: '<p>One candle can represent <b>1 minute</b>, <b>1 hour</b>, <b>1 day</b> or <b>1 week</b>. The same stock can look like an uptrend on the daily chart and a downtrend on the 5-minute chart.</p>',
          points: [
            '<b>Day traders</b> watch 1- to 15-minute candles.',
            '<b>Swing traders</b> favor 1-hour to daily candles.',
            '<b>Investors</b> step back to daily and weekly charts.',
          ],
          tip: 'Pros start on a higher timeframe to find the trend, then zoom in to time the entry.',
        },
        {
          type: 'mc',
          prompt: 'On a daily chart, each candle represents…',
          options: ['One trading day', 'One hour', 'One week', 'One trade'],
          answer: 0,
          explain: 'Daily chart → one candle per trading session. Its open is the day’s first trade and its close is the last.',
        },
        {
          type: 'learn',
          title: 'Volume confirms the move',
          body: '<p><b>Volume</b> is how many shares traded during each candle — the bars along the bottom of the chart.</p>',
          chart: { candles: volumeTrend, height: 250, volume: true, alt: 'An uptrend with volume bars beneath' },
          points: [
            'Price up on <b>rising volume</b> → strong conviction behind the move.',
            'Price up on <b>fading volume</b> → fewer participants; the move may be running out of steam.',
          ],
        },
        {
          type: 'pick',
          prompt: 'The stock was stuck in a range, then broke out on huge volume. Tap the breakout candle.',
          chart: { candles: breakout, height: 260, volume: true, alt: 'A sideways range followed by a large green candle on a volume spike' },
          answer: 21,
          explain: 'That long green candle jumped out of the 100–103 range on roughly 4× normal volume — big participation that makes a breakout more trustworthy.',
        },
        {
          type: 'fill',
          prompt: 'Complete the sentence',
          text: 'A candle’s high and low are shown by its ___, while its open and close form the ___.',
          bank: ['wicks', 'body', 'volume', 'timeframe'],
          answer: ['wicks', 'body'],
          explain: 'Wicks mark the extremes; the body marks where the period opened and closed.',
        },
        {
          type: 'tf',
          prompt: 'A breakout on very low volume is usually more reliable than one on high volume.',
          answer: false,
          explain: 'Low-volume breakouts fail more often — there isn’t enough buying pressure to hold the new level.',
        },
      ],
    },

    {
      id: 'support-resistance',
      title: 'Support & Resistance',
      desc: 'Find the floors and ceilings where price keeps reacting, and draw trendlines.',
      icon: 'levels',
      steps: [
        {
          type: 'learn',
          title: 'Floors and ceilings',
          body: '<p><b>Support</b> is a price level where buyers keep stepping in, acting as a floor. <b>Resistance</b> is where sellers keep showing up, acting as a ceiling.</p>',
          chart: {
            candles: rangeBound, height: 240, alt: 'Price bouncing between support at 100 and resistance at 110',
            hlines: [{ p: 110, tone: 'bear', label: 'Resistance' }, { p: 100, tone: 'bull', label: 'Support' }],
          },
          tip: 'Levels are zones, not exact prices. Price often pokes slightly through before reversing.',
        },
        {
          type: 'mc',
          prompt: 'Which line marks support?',
          chart: {
            candles: rangeBound, height: 240, alt: 'A range chart with three lines labeled A, B and C',
            hlines: [{ p: 110, tone: 'neutral', label: 'A', axisTag: false }, { p: 105, tone: 'neutral', label: 'B', axisTag: false }, { p: 100, tone: 'neutral', label: 'C', axisTag: false }],
          },
          options: ['Line A', 'Line B', 'Line C'],
          shuffle: false,
          answer: 2,
          explain: 'Line C at 100 is where price bounced three times — the floor. A is resistance, and B is just the middle of the range.',
        },
        {
          type: 'label',
          prompt: 'Label the two key levels on this chart',
          chart: {
            candles: rangeBound, height: 250, alt: 'A range chart with two unlabeled dashed levels',
            hlines: [{ p: 110, tone: 'neutral' }, { p: 100, tone: 'neutral' }],
          },
          targets: [
            { label: 'Resistance', i: 14, p: 110, dy: -26 },
            { label: 'Support', i: 22, p: 100, dy: 26 },
          ],
          explain: 'The upper level at 110 rejected price three times (resistance); the lower level at 100 held three times (support).',
        },
        {
          type: 'tf',
          prompt: 'The more times a level gets tested and holds, the more significant traders consider it.',
          answer: true,
          explain: 'Each successful test shows more traders defending that price, so more people watch it and react to it.',
        },
        {
          type: 'learn',
          title: 'Broken resistance becomes support',
          body: '<p>When price finally breaks through resistance, that old ceiling often turns into the new floor. Traders call this a <b>role reversal</b> or <b>retest</b>.</p>',
          chart: {
            candles: flipLevel, height: 240, alt: 'Price breaking above 110, pulling back to it and bouncing',
            hlines: [{ p: 110, tone: 'accent', label: 'Old resistance → new support' }],
          },
          tip: 'Why? Traders who missed the breakout place buy orders at the level, hoping for a second chance.',
        },
        {
          type: 'pick',
          prompt: 'Price broke above 110. Tap the candle where it pulled back and retested 110 as support.',
          chart: { candles: flipLevel, height: 250, alt: 'Breakout above 110 followed by a pullback', hlines: [{ p: 110, tone: 'accent' }] },
          answer: 27,
          tol: 1,
          explain: 'After breaking out to about 118, price sank back to 110, found buyers exactly at the old ceiling, and rallied to new highs.',
        },
        {
          type: 'fill',
          prompt: 'Complete the rule',
          text: 'Once broken, old resistance often becomes new ___, and old support often becomes new ___.',
          bank: ['support', 'resistance', 'volume', 'spread'],
          answer: ['support', 'resistance'],
          explain: 'Role reversal works both ways. A broken floor becomes a ceiling that sellers defend.',
        },
        {
          type: 'learn',
          title: 'Trendlines: diagonal support',
          body: '<p>In an uptrend, connect the <b>higher lows</b> with a straight line. Price tends to bounce off it — a trendline is simply support that rises over time.</p>',
          chart: {
            candles: trendUp, height: 240, alt: 'An uptrend with a rising trendline under the higher lows',
            lines: [{ a: trendLine.a, b: [25, trendLine.at(25)], tone: 'bull' }],
            notes: trendLine.touches.map(i => ({ i, p: trendUp[i].l, text: 'Higher low', dy: 30 })),
          },
          tip: 'Two touches draw a line; a third touch confirms it. In a downtrend, connect the lower highs instead.',
        },
        {
          type: 'mc',
          prompt: 'In an uptrend, you draw a trendline by connecting the…',
          options: ['Higher lows', 'Lower highs', 'Biggest volume bars', 'Opening prices'],
          answer: 0,
          explain: 'Uptrend lines sit under price along the rising swing lows. Downtrend lines sit above price along the falling swing highs.',
        },
        {
          type: 'pick',
          prompt: 'Tap the candle that breaks the uptrend line.',
          chart: { candles: trendBreak, height: 250, alt: 'An uptrend with a trendline that eventually breaks', lines: [{ a: trendLine.a, b: trendLine.b, tone: 'bull' }] },
          answer: trendBreakAt,
          explain: 'The big red candle closes well below the trendline — the first sign the uptrend’s structure has failed.',
        },
        {
          type: 'mc',
          prompt: 'A stock keeps failing at $50 resistance. You want to buy a breakout. What’s the most sensible confirmation?',
          options: ['A candle closing above $50 on strong volume', 'The first tick above $50', 'Price reaching $49.90', 'Three red candles in a row'],
          answer: 0,
          explain: 'Intraday pokes above resistance often reverse (a “fakeout”). A close above the level, backed by volume, shows buyers actually won.',
        },
      ],
    },

    {
      id: 'chart-patterns',
      title: 'Classic Chart Patterns',
      desc: 'Head & shoulders, double tops and bottoms, and triangles — and how they’re confirmed.',
      icon: 'pattern',
      steps: [
        {
          type: 'learn',
          title: 'Head and shoulders',
          body: '<p>Three peaks: a <b>left shoulder</b>, a higher <b>head</b>, and a lower <b>right shoulder</b>. The <b>neckline</b> connects the lows between them.</p>',
          chart: {
            candles: headShoulders, height: 250, padTop: 0.2, alt: 'A head and shoulders top with its neckline',
            hlines: [{ p: 101, tone: 'bear', i0: 6, i1: 34, label: 'Neckline', labelRight: true }],
            notes: [
              { i: 5, p: 109, text: 'Left shoulder', dy: -24 },
              { i: 15, p: 119, text: 'Head', dy: -18 },
              { i: 25, p: 110, text: 'Right shoulder', dy: -24 },
            ],
          },
          tip: 'It’s a <b>bearish reversal</b> — but only confirmed when price <b>closes below the neckline</b>. An upside-down version (inverse H&S) is bullish.',
        },
        {
          type: 'label',
          prompt: 'Label the head and shoulders pattern',
          chart: {
            candles: headShoulders, height: 270, padTop: 0.28, alt: 'A head and shoulders pattern with empty drop zones',
            hlines: [{ p: 101, tone: 'neutral', i0: 6, i1: 34 }],
          },
          targets: [
            { label: 'Left shoulder', i: 5, p: 109.2, dy: -34 },
            { label: 'Head', i: 15, p: 119, dy: -30 },
            { label: 'Right shoulder', i: 25, p: 110.2, dy: -34 },
            { label: 'Neckline', i: 17, p: 101, dy: 30 },
          ],
          explain: 'Three peaks with the middle one highest, and a neckline drawn across the two troughs.',
        },
        {
          type: 'mc',
          prompt: 'A head and shoulders top that forms after a long rally usually signals…',
          options: ['A possible reversal from up to down', 'The uptrend is about to accelerate', 'A dividend is coming', 'Nothing — it’s random'],
          answer: 0,
          explain: 'The right shoulder failing below the head shows buyers losing strength. A neckline break confirms the reversal.',
        },
        {
          type: 'learn',
          title: 'Double tops (M) and double bottoms (W)',
          body: '<p>Price tests the same level twice and fails both times.</p>',
          points: [
            '<b>Double top</b> — two peaks at similar highs, shaped like an <b>M</b>. Bearish once price breaks below the trough between the peaks.',
            '<b>Double bottom</b> — two troughs at similar lows, shaped like a <b>W</b>. Bullish once price breaks above the peak between them.',
          ],
          chart: { candles: doubleBottom, height: 220, alt: 'A W-shaped double bottom', notes: [{ i: 7, p: 99.4, text: 'Low #1', dy: 22 }, { i: 18, p: 99.6, text: 'Low #2', dy: 22 }] },
        },
        {
          type: 'mc',
          prompt: 'Which pattern is this?',
          chart: { candles: doubleBottom, height: 230, alt: 'A W-shaped chart pattern' },
          options: ['Double bottom', 'Double top', 'Head and shoulders', 'Ascending triangle'],
          answer: 0,
          explain: 'Two lows at about the same price (~100) forming a W — a double bottom, a potential bullish reversal.',
        },
        {
          type: 'pick',
          prompt: 'This double top is confirmed when price closes below the neckline. Tap the confirming candle.',
          chart: {
            candles: doubleTop, height: 250, alt: 'An M-shaped double top with its neckline',
            hlines: [{ p: dtNeck, tone: 'bear', i0: 9, i1: 31, label: 'Neckline', labelRight: true }],
          },
          answer: 24,
          explain: 'Two failed pushes near 120, then a strong red candle closes below the trough between the peaks — the pattern is confirmed.',
        },
        {
          type: 'learn',
          title: 'Triangles: price coiling up',
          body: '<p>Triangles form when the range narrows. The breakout direction is what matters.</p>',
          chart: {
            candles: ascTriangle, height: 230, alt: 'An ascending triangle with flat resistance and rising lows, breaking upward',
            hlines: [{ p: 110, tone: 'bear', i0: 1, i1: 24, axisTag: false }],
            lines: [{ a: [0, 99.8], b: [24, 108.8], tone: 'bull' }],
          },
          points: [
            '<b>Ascending</b> — flat resistance + rising lows. Buyers are getting more aggressive → often breaks <b>up</b>.',
            '<b>Descending</b> — flat support + falling highs. Sellers pressing → often breaks <b>down</b>.',
            '<b>Symmetrical</b> — both lines converge. Neutral; wait for the break.',
          ],
        },
        {
          type: 'mc',
          prompt: 'Which pattern is this?',
          chart: { candles: descTriangle, height: 230, alt: 'A chart with flat support and falling highs' },
          options: ['Descending triangle', 'Ascending triangle', 'Symmetrical triangle', 'Double bottom'],
          answer: 0,
          explain: 'Support stays flat near 100 while each rally peaks lower — a descending triangle, which here broke to the downside.',
        },
        {
          type: 'match',
          prompt: 'Match each pattern to its shape',
          pairs: [
            ['Ascending triangle', 'Flat top, rising lows'],
            ['Descending triangle', 'Flat bottom, falling highs'],
            ['Symmetrical triangle', 'Two converging lines'],
            ['Double top', 'Two failed peaks (an M)'],
            ['Inverse H&S', 'Three troughs, bullish'],
          ],
        },
        {
          type: 'tf',
          prompt: 'A pattern is confirmed as soon as its shape is visible — you don’t need to wait for a breakout.',
          answer: false,
          explain: 'Many “patterns” never complete. Confirmation is the break (and close) through the neckline or trendline.',
        },
        {
          type: 'num',
          prompt: 'Head at $120, neckline at $100. Price breaks the neckline. What’s the classic measured-move target?',
          given: [['Head', '$120'], ['Neckline', '$100'], ['Pattern height', '?']],
          prefix: '$',
          answer: 80,
          tol: 0.01,
          explain: 'Pattern height = 120 − 100 = $20. Project it down from the neckline: 100 − 20 = $80. Targets are guides, not guarantees.',
        },
      ],
    },

    {
      id: 'indicators',
      title: 'Technical Indicators',
      desc: 'Moving averages, RSI and MACD — what they measure and how traders read them.',
      icon: 'wave',
      steps: [
        {
          type: 'learn',
          title: 'Moving averages smooth the noise',
          body: '<p>A <b>simple moving average (SMA)</b> is the average of the last <i>N</i> closing prices, recalculated every candle. It turns jagged price action into a clean trend line.</p>',
          chart: {
            candles: maData, height: 240, alt: 'Price with a 10-period and a 20-period moving average',
            overlays: [{ values: sma(maClose, 10), tone: 'accent', label: 'SMA 10' }, { values: sma(maClose, 20), tone: 'orange', label: 'SMA 20' }],
          },
          points: [
            '<b>EMA</b> (exponential) weights recent prices more, so it reacts faster.',
            'The <b>50-day</b> and <b>200-day</b> averages are the most widely watched.',
          ],
        },
        {
          type: 'mc',
          prompt: 'How is a 20-day SMA calculated?',
          options: ['Average of the last 20 closing prices', 'The highest price of the last 20 days', 'Today’s close minus the close 20 days ago', 'Average volume over 20 days'],
          answer: 0,
          explain: 'Add the last 20 closes and divide by 20. Tomorrow, drop the oldest close and add the newest — the average “moves”.',
        },
        {
          type: 'mc',
          prompt: 'Price is holding above a rising moving average. What does that generally suggest?',
          chart: { candles: maData, height: 230, alt: 'Price above a rising 20-period average', overlays: [{ values: sma(maClose, 20), tone: 'orange', label: 'SMA 20' }] },
          options: ['An uptrend is in control', 'A downtrend is in control', 'The stock is about to split', 'Volume is falling'],
          answer: 0,
          explain: 'A rising average means recent prices are higher than older ones, and price holding above it shows buyers defending the trend.',
        },
        {
          type: 'learn',
          title: 'Crossovers',
          body: '<p>When a <b>fast</b> average crosses above a <b>slow</b> one, momentum is turning up. The famous version is the <b>golden cross</b>: 50-day above 200-day. The bearish opposite is the <b>death cross</b>.</p>',
          tip: 'Moving averages are <b>lagging</b> — they confirm a trend after it starts, they don’t predict it.',
        },
        {
          type: 'pick',
          prompt: 'Tap the candle where the fast average (blue) crosses above the slow one (orange).',
          chart: {
            candles: crossData, height: 250, alt: 'A downtrend turning into an uptrend with two moving averages crossing',
            overlays: [{ values: fastMA, tone: 'accent', label: 'Fast SMA 8' }, { values: slowMA, tone: 'orange', label: 'Slow SMA 21' }],
          },
          answer: goldenCross,
          tol: 1,
          explain: 'Right there, the short-term average rises through the long-term one — a bullish crossover, confirming the new uptrend.',
        },
        {
          type: 'learn',
          title: 'RSI: momentum from 0 to 100',
          body: '<p>The <b>Relative Strength Index</b> compares the size of recent gains to recent losses (usually over 14 periods).</p>',
          chart: { candles: rsiData, height: 200, sub: { type: 'rsi', values: rsiVals }, subHeight: 100, alt: 'Price with the RSI indicator below' },
          points: [
            '<b>Above 70</b> — overbought: price rose fast and may be stretched.',
            '<b>Below 30</b> — oversold: price fell fast and may be due for a bounce.',
          ],
          tip: 'Strong trends can stay overbought or oversold for a long time. RSI is a warning light, not a trigger.',
        },
        {
          type: 'pick',
          prompt: 'Tap the candle where RSI first drops into oversold territory (below 30).',
          chart: { candles: rsiData, height: 200, sub: { type: 'rsi', values: rsiVals }, subHeight: 110, alt: 'Price and RSI during a sharp decline' },
          answer: firstOversold,
          tol: 1,
          explain: 'The steady string of red candles drove RSI under 30. Notice price bounced soon after — but that isn’t guaranteed.',
        },
        {
          type: 'tf',
          prompt: 'An RSI above 70 means you should immediately short the stock.',
          answer: false,
          explain: 'Overbought can stay overbought. Traders look for confirmation — like a break of support — before acting.',
        },
        {
          type: 'learn',
          title: 'MACD: trend + momentum',
          body: '<p><b>MACD</b> = 12-period EMA − 26-period EMA. A 9-period EMA of MACD is the <b>signal line</b>, and the <b>histogram</b> shows the gap between them.</p>',
          chart: {
            candles: macdData, height: 190, sub: { type: 'macd', ...macdVals }, subHeight: 110, alt: 'Price with MACD, signal line and histogram',
            legend: [{ label: 'MACD', tone: 'accent' }, { label: 'Signal', tone: 'orange' }],
          },
          points: [
            'MACD crossing <b>above</b> signal (histogram turns positive) → bullish momentum.',
            'MACD crossing <b>below</b> signal (histogram turns negative) → bearish momentum.',
          ],
        },
        {
          type: 'pick',
          prompt: 'Tap the candle where MACD (blue) crosses above its signal line (orange).',
          chart: {
            candles: macdData, height: 180, sub: { type: 'macd', ...macdVals }, subHeight: 120, alt: 'Price with MACD panel',
            legend: [{ label: 'MACD', tone: 'accent' }, { label: 'Signal', tone: 'orange' }],
          },
          answer: macdCross,
          tol: 1,
          explain: 'The histogram flips from red to green right where the lines cross — momentum shifting in favor of buyers.',
        },
        {
          type: 'match',
          prompt: 'Match each indicator to what it does',
          pairs: [
            ['SMA', 'Equal-weight average of closes'],
            ['EMA', 'Weights recent prices more'],
            ['RSI', 'Momentum from 0 to 100'],
            ['MACD', 'Gap between two EMAs'],
            ['Golden cross', '50-day crosses above 200-day'],
          ],
        },
        {
          type: 'fill',
          prompt: 'Complete the sentence',
          text: 'RSI readings below ___ are considered oversold, and readings above ___ overbought.',
          bank: ['30', '70', '50', '100'],
          answer: ['30', '70'],
          explain: 'The classic thresholds are 30 and 70. Some traders use 20/80 in strong trends.',
        },
      ],
    },

    {
      id: 'order-types',
      title: 'Order Types',
      desc: 'Market, limit and stop-loss orders — what each one guarantees, and what it doesn’t.',
      icon: 'order',
      steps: [
        {
          type: 'learn',
          title: 'Market orders: speed first',
          body: '<p>A <b>market order</b> buys or sells <b>immediately</b> at the best price available right now.</p>',
          points: [
            '✅ Guarantees <b>execution</b>.',
            '⚠️ Does <b>not</b> guarantee <b>price</b>. In fast or thin markets you can get filled worse than expected — that’s <b>slippage</b>.',
          ],
        },
        {
          type: 'learn',
          title: 'Limit orders: price first',
          body: '<p>A <b>limit order</b> only fills at <b>your price or better</b>.</p>',
          points: [
            '<b>Buy limit</b> — placed <b>below</b> the current price: “buy only if it gets this cheap”.',
            '<b>Sell limit</b> — placed <b>above</b> the current price: “sell only if it gets this high”.',
            '✅ Guarantees <b>price</b>. ⚠️ Doesn’t guarantee you get filled at all.',
          ],
        },
        {
          type: 'mc',
          prompt: 'Breaking news: you want in right now, no matter what. Which order?',
          options: ['Market order', 'Limit order', 'Stop-loss order', 'Stop-limit order'],
          answer: 0,
          explain: 'Only a market order guarantees an immediate fill. The trade-off: you accept whatever price the market gives you.',
        },
        {
          type: 'mc',
          prompt: 'A stock trades at $190. You place a buy limit at $185. What happens?',
          options: ['It fills only if price drops to $185 or lower', 'It fills immediately at $190', 'It fills immediately at $185', 'It sells your shares at $185'],
          answer: 0,
          explain: 'A buy limit waits for your price. If the stock never trades down to $185, you never get filled.',
        },
        {
          type: 'learn',
          title: 'Stop-loss: your exit plan',
          body: '<p>A <b>stop-loss</b> sits below your entry. When price trades down to the <b>stop price</b>, it becomes a market order and gets you out — capping the loss.</p>',
          chart: {
            candles: longTrade, height: 240, alt: 'A long trade with entry, stop-loss and take-profit levels',
            hlines: [{ p: 110, tone: 'bull', label: 'Take-profit' }, { p: 100, tone: 'accent', label: 'Entry' }, { p: 96, tone: 'bear', label: 'Stop-loss' }],
          },
          tip: 'A <b>stop-limit</b> becomes a limit order instead. That avoids a bad fill, but in a fast crash it might not fill at all.',
        },
        {
          type: 'label',
          prompt: 'Label this long trade plan',
          chart: {
            candles: longTrade, height: 250, alt: 'A long trade with three unlabeled levels',
            hlines: [{ p: 110, tone: 'neutral' }, { p: 100, tone: 'neutral' }, { p: 96, tone: 'neutral' }],
          },
          targets: [
            { label: 'Take-profit', i: 5, p: 110, dy: -24 },
            { label: 'Entry', i: 22, p: 100, dy: -24 },
            { label: 'Stop-loss', i: 14, p: 96, dy: 24 },
          ],
          explain: 'For a long trade: entry at 100, stop below it at 96 to cap the loss, and a take-profit (sell limit) above at 110.',
        },
        {
          type: 'pick',
          prompt: 'You bought at 100 with a stop-loss at 95. Tap the candle where your stop triggers.',
          chart: {
            candles: stopHit, height: 250, alt: 'Price falling through a stop-loss level at 95',
            hlines: [{ p: 100, tone: 'accent', label: 'Entry' }, { p: 95, tone: 'bear', label: 'Stop 95' }],
          },
          answer: stopTrigger,
          explain: 'The first candle whose low touches 95 triggers the stop. You’re out with a small, planned loss while price keeps falling.',
        },
        {
          type: 'tf',
          prompt: 'A stop-loss guarantees you’ll exit at exactly your stop price.',
          answer: false,
          explain: 'A stop becomes a market order. If a stock gaps down overnight from $96 to $90, a $95 stop fills near $90.',
        },
        {
          type: 'mc',
          prompt: 'You own shares at $50 and want to sell automatically if it rises to $60. Which order?',
          options: ['Sell limit at $60', 'Sell stop at $60', 'Buy limit at $60', 'Market order now'],
          answer: 0,
          explain: 'Selling at a higher price = sell limit (take-profit). Stops sit below the market for sells, to exit on weakness.',
        },
        {
          type: 'match',
          prompt: 'Match the order type to its behavior',
          pairs: [
            ['Market', 'Fills now, price not guaranteed'],
            ['Limit', 'Your price or better, fill not guaranteed'],
            ['Stop-loss', 'Exits when price hits a trigger'],
            ['Stop-limit', 'Trigger places a limit order'],
            ['Slippage', 'Fill differs from expected price'],
          ],
        },
        {
          type: 'fill',
          prompt: 'Complete the sentence',
          text: 'A buy limit is placed ___ the current price, and a sell stop-loss is placed ___ it.',
          bank: ['below', 'above', 'below', 'at'],
          answer: ['below', 'below'],
          explain: 'Both sit under the market: the buy limit waits for a cheaper entry, and the stop-loss waits to cut a losing position.',
        },
      ],
    },

    {
      id: 'risk-management',
      title: 'Risk Management',
      desc: 'Position sizing, risk/reward and diversification — how traders survive long enough to win.',
      icon: 'shield',
      steps: [
        {
          type: 'learn',
          title: 'Rule #1: protect your capital',
          body: '<p>Great traders are wrong often. They survive by keeping each loss small. The classic guideline is the <b>1% rule</b>: never risk more than 1–2% of your account on a single trade.</p>',
          formula: '<span>Dollar risk</span> = <span>Account</span> × <span>Risk %</span>',
          tip: 'Risk means what you lose if your stop is hit — not the total amount you invest.',
        },
        {
          type: 'num',
          prompt: 'Following the 1% rule, what’s the most you should lose on this trade?',
          given: [['Account size', '$10,000'], ['Risk per trade', '1%']],
          prefix: '$',
          answer: 100,
          explain: '$10,000 × 1% = $100. That’s your maximum loss if the stop gets hit.',
        },
        {
          type: 'learn',
          title: 'Position sizing',
          body: '<p>Your stop distance decides how many shares you can buy. A wide stop means fewer shares; a tight stop allows more.</p>',
          formula: '<span>Shares</span> = <span>Dollar risk</span> ÷ (<span>Entry</span> − <span>Stop</span>)',
          points: ['Example: $200 risk, entry $40, stop $38 → $200 ÷ $2 = <b>100 shares</b>.'],
        },
        {
          type: 'num',
          prompt: 'How many shares should you buy?',
          given: [['Account size', '$10,000'], ['Risk per trade', '1%'], ['Entry', '$50'], ['Stop-loss', '$48']],
          suffix: 'shares',
          answer: 50,
          explain: 'Dollar risk = $100. Risk per share = $50 − $48 = $2. $100 ÷ $2 = 50 shares.',
        },
        {
          type: 'learn',
          title: 'Risk/reward ratio',
          body: '<p>Compare what you could <b>lose</b> (entry to stop) with what you could <b>gain</b> (entry to target). Many traders only take trades with at least <b>1:2</b>.</p>',
          chart: {
            candles: rrTrade, height: 230, alt: 'A long trade with a red risk zone and a green reward zone',
            boxes: [{ i0: 6, i1: 27, p0: 95, p1: 100, tone: 'bear', label: 'Risk $5' }, { i0: 6, i1: 27, p0: 100, p1: 115, tone: 'bull', label: 'Reward $15' }],
            hlines: [{ p: 100, tone: 'accent', i0: 6, dash: false }],
          },
          tip: 'With 1:3 trades you can be wrong 3 times out of 4 and still roughly break even (before fees).',
        },
        {
          type: 'mc',
          prompt: 'Entry $100, stop $95, target $115. What’s the risk/reward ratio?',
          options: ['1:3', '1:2', '3:1', '1:1'],
          answer: 0,
          explain: 'Risk = $5, reward = $15. Written risk-first, that’s 1:3 — you stand to make three times what you risk.',
        },
        {
          type: 'mc',
          prompt: 'With a 1:2 risk/reward on every trade, roughly what win rate breaks even (ignoring fees)?',
          options: ['About 33%', 'About 50%', 'About 66%', 'About 20%'],
          answer: 0,
          explain: 'Win 1 of 3 trades: +2R − 1R − 1R = 0. Anything above ~33% wins is profitable at 1:2.',
        },
        {
          type: 'tf',
          prompt: 'If price approaches your stop, moving the stop further away is good risk management.',
          answer: false,
          explain: 'Widening a stop mid-trade increases your risk after the fact. Decide the stop before entering, then respect it.',
        },
        {
          type: 'num',
          prompt: 'Your account drops 50%. What gain do you now need to get back to even?',
          suffix: '%',
          answer: 100,
          explain: '$10,000 → $5,000. Getting back to $10,000 means doubling: a 100% gain. Losses hurt more than equal gains help.',
        },
        {
          type: 'learn',
          title: 'Diversification',
          body: '<p>Spreading money across different <b>sectors</b> and <b>asset types</b> means one bad bet can’t sink you.</p>',
          points: [
            'Five chip stocks isn’t diversified — they tend to move together (they’re <b>correlated</b>).',
            'Mixing sectors (tech, healthcare, energy, consumer) and assets (stocks, bonds) lowers overall swings.',
          ],
        },
        {
          type: 'mc',
          prompt: 'Which portfolio is the most diversified?',
          options: [
            'Stocks across tech, healthcare, energy and consumer, plus bonds',
            'Five different semiconductor stocks',
            'One stock you really believe in',
            'Three tech ETFs that hold the same big companies',
          ],
          answer: 0,
          explain: 'Different sectors and asset classes react differently to the same news, so losses in one area are cushioned by others.',
        },
        {
          type: 'match',
          prompt: 'Match each term to its meaning',
          pairs: [
            ['Position size', 'How many shares you buy'],
            ['Risk/reward', 'Potential loss vs. gain'],
            ['1% rule', 'Cap on risk per trade'],
            ['Diversification', 'Spreading across assets'],
            ['Drawdown', 'Drop from peak account value'],
          ],
        },
        {
          type: 'fill',
          prompt: 'Complete the sentence',
          text: 'Ten losses in a row at 1% risk cost about ___ of your account. At 10% risk they cost about ___.',
          bank: ['10%', '65%', '100%', '1%'],
          answer: ['10%', '65%'],
          explain: '0.99¹⁰ ≈ 0.90 (a ~10% drawdown) versus 0.90¹⁰ ≈ 0.35 (a ~65% drawdown). Small risk keeps you in the game.',
        },
      ],
    },
  ];

  const units = [
    { title: 'Market Basics', desc: 'What you own and how prices are set', tone: 'green', icon: 'building', lessons: ['stocks-101'] },
    { title: 'Reading Charts', desc: 'Candles, timeframes and volume', tone: 'blue', icon: 'candle', lessons: ['candlesticks'] },
    { title: 'Chart Patterns', desc: 'Levels, trendlines and classic formations', tone: 'violet', icon: 'pattern', lessons: ['support-resistance', 'chart-patterns'] },
    { title: 'Technical Indicators', desc: 'Moving averages, RSI and MACD', tone: 'orange', icon: 'wave', lessons: ['indicators'] },
    { title: 'Trading Like a Pro', desc: 'Orders and managing risk', tone: 'teal', icon: 'shield', lessons: ['order-types', 'risk-management'] },
  ];

  global.STOX_COURSE = { units, lessons };
})(window);
