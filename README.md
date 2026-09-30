# Stoxed

**Learn to read the market, one candle at a time.**

Stoxed is a Duolingo-style web app that teaches stock trading and chart reading. You work through a skill path of bite-sized lessons, answer interactive questions on real-looking candlestick charts, and earn XP, streaks and badges along the way.

There's no build step and no backend. It's plain HTML, CSS and JavaScript, and progress is saved in `localStorage`.

## Run it

```bash
# any static server works
npx serve .            # or: python3 -m http.server
```

Then open the printed URL. You can also just open `index.html` directly in a browser.

## What's inside

### The path

| Unit | Lesson | Covers |
| --- | --- | --- |
| 1 · Market Basics | **Stocks 101** | What a share is, dividends, IPOs, exchanges, bid/ask/spread, bull vs. bear markets, corrections |
| 2 · Reading Charts | **Reading Candlesticks** | OHLC anatomy, bodies & wicks, hammers & dojis, timeframes, volume confirmation |
| 3 · Chart Patterns | **Support & Resistance** | Floors & ceilings, role reversal / retests, trendlines, breakout confirmation |
| | **Classic Chart Patterns** | Head & shoulders, double tops/bottoms, ascending/descending/symmetrical triangles, measured moves |
| 4 · Technical Indicators | **Technical Indicators** | SMA vs. EMA, crossovers (golden/death cross), RSI overbought/oversold, MACD + signal + histogram |
| 5 · Trading Like a Pro | **Order Types** | Market, limit, stop-loss, stop-limit, slippage, gaps |
| | **Risk Management** | The 1% rule, position sizing, risk/reward, break-even win rates, drawdown math, diversification |

Each lesson mixes short concept cards with 8–10 exercises.

### Question types

- **Multiple choice** and **True / false** (keys `1`–`4` select, `Enter` checks)
- **Fill in the blank**: tap words from a word bank into the sentence
- **Label the chart**: drag labels onto a chart (tapping a label and then a spot also works)
- **Read the chart**: tap the right candle, e.g. the hammer, the breakout or the RSI < 30 moment
- **Match the pairs**
- **Run the numbers**: numeric answers for position sizing, measured moves and drawdowns

### Game mechanics

- **XP**: +15 for finishing a lesson, +5 for a perfect run, +5 for practicing a finished lesson
- **Streaks**: finish a lesson on consecutive days. The flame and the 7-day calendar track it.
- **Hearts**: 5 hearts, and you lose one per wrong answer. They refill one every 5 minutes, or you can spend 30 XP for a full refill.
- **Mistake review**: questions you miss come back at the end of the lesson
- **Sequential unlocks**: finishing a lesson unlocks the next node, with an animation
- **Daily goal** ring (30 XP), combo streak on the progress bar, confetti and a results screen

## Architecture

```
index.html          app shell
css/styles.css      design tokens (light + dark), components, animations
js/icons.js         inline SVG icon set
js/chart.js         SVG candlestick engine + seeded data generator + SMA/EMA/RSI/MACD
js/content.js       all course content (units, lessons, questions, charts)
js/app.js           state/persistence, path UI, lesson player, question renderers
tests/playthrough.mjs  headless end-to-end run through every lesson
```

**Why a custom chart engine?** The label and pick exercises need exact control over where every candle and price sits on screen. `chart.js` is a small SVG renderer (about 400 lines) built for that. Chart data is generated from seeded waypoints, so every learner sees the same charts. Answers like "the candle where RSI first drops below 30" or "the MACD crossover" are **computed from the same data that's drawn**, rather than hard-coded.

### Adding a lesson

Add an object to `lessons` in `js/content.js` and reference its `id` from a unit:

```js
{ type: 'mc', prompt: '…', options: ['…', '…'], answer: 0, explain: '…', chart: { candles } }
{ type: 'pick', prompt: 'Tap the …', chart: { candles }, answer: 21, tol: 1, explain: '…' }
{ type: 'label', prompt: '…', chart: { candles }, targets: [{ label: 'High', i: 0, p: 114, dx: 110 }] }
```

## Tests

```bash
npm install            # installs Playwright
npm start &            # serves on :8765
npm test               # plays every lesson and checks simulated phone safe areas
```

The safe-area checks cover light and dark themes with simulated 44px top and 34px bottom insets, including header overlap and the lesson footer. They do not replace testing on a physical notched device.

---

*Stoxed is an educational project, not financial advice.*
