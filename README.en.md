# @stvy/fund-indicators

**[中文](README.md)** | English

**Automated Trading Indicator Library for Funds** — Compute all technical indicators from historical NAV (Net Asset Value) data.

[![npm version](https://img.shields.io/npm/v/@stvy/fund-indicators)](https://www.npmjs.com/package/@stvy/fund-indicators)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/stevieyu/fund-indicators/actions/workflows/ci.yml/badge.svg)](https://github.com/stevieyu/fund-indicators/actions/workflows/ci.yml)

A quantitative analysis library designed specifically for OTC funds, index funds, and ETF feeder funds. Simply pass in a daily NAV array to compute 70+ technical indicators, risk metrics, performance metrics, statistical features, DCA (Dollar-Cost Averaging) analysis, and pattern recognition signals.

---

## Features

- **Zero-friction input**: Every function requires only a single `number[]` (daily NAV array)
- **TypeScript native**: Full type definitions and JSDoc annotations for excellent IDE support
- **Comprehensive coverage**: Technical indicators + risk/performance + statistical features + DCA analysis + pattern recognition — 5 modules, 70+ functions
- **Fund-optimized**: Annualization parameters based on 242 A-share trading days; supports OTC fund NAV analysis
- **Lightweight dependencies**: Only depends on `technicalindicators` + `simple-statistics` + `jstat`
- **Battle-tested**: 35 automated tests covering all core functionality

---

## Installation

```bash
npm install @stvy/fund-indicators
```

### Browser Usage

This library also ships browser-ready builds that can be used directly in HTML pages.

**Option 1: `<script>` tag (IIFE)**

```html
<script src="https://unpkg.com/@stvy/fund-indicators/dist/browser/fund-indicators.min.js"></script>
<script>
  const nav = [1.0, 1.02, 1.01, 1.05, 1.03, 1.08];

  const ma = FundIndicators.sma(nav, 3);
  console.log('SMA(3):', ma.current);

  const rsi = FundIndicators.rsi(nav, 3);
  console.log('RSI(3):', rsi.current);

  const sharpe = FundIndicators.sharpeRatio(nav);
  console.log('Sharpe Ratio:', sharpe);
</script>
```

**Option 2: `<script type="module">` (ESM)**

```html
<script type="module">
  import { sma, rsi, sharpeRatio } from 'https://unpkg.com/@stvy/fund-indicators/dist/browser/fund-indicators.esm.js';

  const nav = [1.0, 1.02, 1.01, 1.05, 1.03, 1.08];

  console.log('SMA(3):', sma(nav, 3).current);
  console.log('RSI(3):', rsi(nav, 3).current);
  console.log('Sharpe Ratio:', sharpeRatio(nav));
</script>
```

**Build artifacts:**

| File | Format | Size | Use Case |
|------|--------|------|----------|
| `fund-indicators.js` | IIFE | ~257 KB | `<script>` tag; exposes global `FundIndicators` |
| `fund-indicators.min.js` | IIFE minified | ~99 KB | Recommended for production |
| `fund-indicators.esm.js` | ESM | ~241 KB | `<script type="module">` or frontend bundlers |
| `fund-indicators.esm.min.js` | ESM minified | ~99 KB | Recommended for production ESM |

> Browser builds bundle all dependencies inline — no additional installations required.

---

## Quick Start

```typescript
import {
  sma, macd, rsi, kdj, bollingerBands,
  sharpeRatio, maxDrawdown, performanceMetrics,
  hurstExponent, simulateDCA,
} from '@stvy/fund-indicators';

// Your fund's historical NAV series (sorted by date ascending)
const nav = [1.0, 1.02, 1.01, 1.05, 1.03, 1.08, /* ... */];

// ── Technical Indicators ──
const ma20 = sma(nav, 20);
console.log('20-day MA:', ma20.current);

const m = macd(nav);
console.log('MACD DIF/DEA:', m.currentDIF, m.currentDEA);

const r = rsi(nav, 14);
console.log('RSI(14):', r.current);

const k = kdj(nav);
console.log('KDJ:', k.currentK, k.currentD, k.currentJ);

// ── Risk & Performance ──
console.log('Sharpe Ratio:', sharpeRatio(nav, 0.025));
console.log('Max Drawdown:', maxDrawdown(nav).maxDrawdown);

const perf = performanceMetrics(nav);
console.log('Annualized Return:', perf.annualizedReturn);
console.log('Sortino Ratio:', perf.sortinoRatio);

// ── Statistical Features ──
const hurst = hurstExponent(nav);
console.log('Hurst Exponent:', hurst.hurstExponent, '→', hurst.interpretation);

// ── DCA Simulation ──
const dca = simulateDCA(nav, { amount: 1000, interval: 22 });
console.log('DCA Return Rate:', dca.returnRate, 'IRR:', dca.irr);
```

---

## Module Documentation

### 1. Technical Indicators Module (`technical`)

Compute trend, momentum, oscillator, and channel indicators from historical NAV data.

#### Moving Averages

| Function | Description | Parameters |
|----------|-------------|------------|
| `sma(nav, period)` | Simple Moving Average | `period` default 20 |
| `ema(nav, period)` | Exponential Moving Average | `period` default 20 |
| `wma(nav, period)` | Weighted Moving Average | `period` default 20 |
| `dema(nav, period)` | Double Exponential Moving Average | `period` default 20 |
| `tema(nav, period)` | Triple Exponential Moving Average | `period` default 20 |
| `kama(nav, period, fast?, slow?)` | Kaufman Adaptive Moving Average | `period` default 10 |

All moving average functions return `MAResult`:

```typescript
interface MAResult {
  values: (number | null)[];  // Array same length as input; first N-1 entries are null
  current: number | null;     // Last valid value
  period: number;
  type: string;
}
```

**Example — Moving average crossover detection:**

```typescript
const fast = ema(nav, 10);
const slow = ema(nav, 30);
const signal = detectCrossSignal(fast, slow);

if (signal.type === 'golden_cross') console.log('Golden Cross! Buy signal');
if (signal.type === 'death_cross')  console.log('Death Cross! Sell signal');
```

**Example — Moving average alignment:**

```typescript
const alignment = detectMAAlignment([
  sma(nav, 5), sma(nav, 10), sma(nav, 20), sma(nav, 60),
]);
console.log(alignment.alignment);  // 'bullish' | 'bearish' | 'neutral'
```

#### MACD

```typescript
const result = macd(nav, 12, 26, 9);
// result.currentDIF      — DIF line (fast line)
// result.currentDEA      — DEA line (slow line)
// result.currentHistogram — Histogram (bar chart values)
// result.dif / .dea / .histogram — Full series arrays
```

#### Momentum & Oscillator Indicators

| Function | Description | Typical Usage |
|----------|-------------|---------------|
| `rsi(nav, period?)` | RSI (Relative Strength Index) | >70 overbought, <30 oversold |
| `kdj(nav, kPeriod?, kSmooth?, dPeriod?)` | KDJ Stochastic (includes J value) | K/D golden/death cross |
| `roc(nav, period?)` | Rate of Change | Momentum strength |
| `momentum(nav, period?)` | Momentum Indicator | Trend acceleration/deceleration |
| `williamsR(nav, period?)` | Williams %R | Overbought/oversold |
| `cci(nav, period?)` | Commodity Channel Index | >100 / <-100 |
| `trix(nav, period?)` | Triple-Smoothed Exponential | Noise-filtered trend |
| `dpo(nav, period?)` | Detrended Price Oscillator | Cycle identification |
| `stochasticRSI(nav, ...)` | Stochastic RSI | More sensitive overbought/oversold |
| `massIndex(nav, emaPeriod?, sumPeriod?)` | Mass Index | Reversal point detection |

#### Channels & Volatility

| Function | Description |
|----------|-------------|
| `bollingerBands(nav, period?, stdDev?)` | Bollinger Bands (includes bandwidth and %B) |
| `donchianChannel(nav, period?)` | Donchian Channel |
| `keltnerChannel(nav, emaPeriod?, atrPeriod?, multiplier?)` | Keltner Channel |
| `adx(nav, period?)` | ADX (Average Directional Index) + DI+/DI- |
| `atr(nav, period?)` | ATR (Average True Range, approximated) |
| `sar(nav, step?, max?)` | Parabolic SAR |

#### Derived Indicators

| Function | Description |
|----------|-------------|
| `bias(nav, period?)` | BIAS = (NAV - MA) / MA × 100 |
| `navPercentile(nav, lookback?)` | NAV percentile within historical range (0–100) |

---

### 2. Risk & Performance Module (`risk`)

#### Basic Utilities

```typescript
import { navToReturns, totalReturn, annualizeReturn } from '@stvy/fund-indicators';

const returns = navToReturns(nav);       // NAV → daily returns
const tr = totalReturn(nav);             // Cumulative return
const ar = annualizeReturn(returns);     // Annualized return (geometric mean)
```

#### Volatility

```typescript
import { annualizedVolatility, downsideVolatility, rollingVolatility, volatilityCone } from '@stvy/fund-indicators';

annualizedVolatility(returns);              // Annualized volatility
downsideVolatility(returns, 0.025);        // Downside volatility
rollingVolatility(returns, 20);            // Rolling 20-day volatility
volatilityCone(returns, [5,10,20,60,120]); // Volatility cone
```

#### Drawdown Analysis

```typescript
const dd = maxDrawdown(nav, dates?);

// dd.maxDrawdown         — Maximum drawdown (negative value, e.g. -0.25)
// dd.peakIndex           — Index of the drawdown peak (start)
// dd.troughIndex         — Index of the drawdown trough (bottom)
// dd.durationDays        — Duration of the drawdown in days
// dd.recoveryDays        — Recovery days (null if not yet recovered)
// dd.drawdownSeries      — Full drawdown series
```

#### VaR / CVaR

```typescript
calculateVaR(returns, 0.95, 'historical');  // 95% Historical Simulation VaR
calculateVaR(returns, 0.99, 'parametric');  // 99% Parametric VaR
calculateCVaR(returns, 0.95);              // 95% Conditional Value at Risk
```

#### Risk Metrics Summary

```typescript
const risk = riskMetrics(nav, 0.025);
// risk.annualizedVolatility — Annualized volatility
// risk.downsideVolatility   — Downside volatility
// risk.maxDrawdown          — Maximum drawdown
// risk.maxDrawdownDuration  — Max drawdown duration in days
// risk.var95 / risk.var99   — VaR
// risk.cvar95 / risk.cvar99 — CVaR
```

#### Performance Metrics

| Function | Formula |
|----------|---------|
| `sharpeRatio(nav, rf?)` | (Annualized Return - Risk-Free Rate) / Annualized Volatility |
| `sortinoRatio(nav, rf?)` | (Annualized Return - Risk-Free Rate) / Downside Volatility |
| `calmarRatio(nav)` | Annualized Return / \|Max Drawdown\| |
| `treynorRatio(nav, benchmark, rf?)` | (Annualized Return - Risk-Free Rate) / Beta |
| `omegaRatio(nav, threshold?)` | Weighted Upside Return / Weighted Downside Loss |
| `winRate(returns)` | Positive-return days / Total days |
| `profitLossRatio(returns)` | Average Gain / Average Loss |
| `profitFactor(returns)` | Total Gains / Total Losses |
| `consecutiveWinLoss(returns)` | Max consecutive winning/losing days |

**Get all performance metrics at once:**

```typescript
const perf = performanceMetrics(nav, 0.025);
// perf.totalReturn / .annualizedReturn
// perf.sharpeRatio / .sortinoRatio / .calmarRatio
// perf.omegaRatio / .winRate / .profitLossRatio / .profitFactor
// perf.maxConsecutiveWins / .maxConsecutiveLosses
```

#### Benchmark Comparison Metrics

```typescript
const bm = benchmarkMetrics(fundNav, benchmarkNav, 0.025);
// bm.alpha             — Alpha (excess return)
// bm.beta              — Beta coefficient
// bm.trackingError     — Tracking error (annualized)
// bm.informationRatio  — Information ratio
// bm.correlation       — Correlation coefficient
// bm.rSquared          — R²
```

---

### 3. Statistical Features Module (`statistics`)

```typescript
import {
  statisticalFeatures, hurstExponent, autocorrelation,
  ljungBoxTest, garch11, returnQuantiles,
  rollingSkewness, rollingKurtosis,
} from '@stvy/fund-indicators';

// Full statistical feature set
const stats = statisticalFeatures(nav);
// stats.mean / .median / .stdDev
// stats.skewness / .kurtosis
// stats.jarqueBera — Normality test

// Hurst Exponent
const h = hurstExponent(nav);
// h.hurstExponent  — >0.5 trending / <0.5 mean-reverting / ≈0.5 random
// h.interpretation — 'trending' | 'mean_reverting' | 'random_walk'

// Autocorrelation analysis
const acf = autocorrelation(nav, 20);
// acf.coefficients — Autocorrelation coefficients at each lag
// acf.interpretation — 'persistent' | 'anti_persistent' | 'no_correlation'

// Ljung-Box test
const lb = ljungBoxTest(returns, 10);
// lb.qStatistic / lb.approximatePValue

// GARCH(1,1) volatility forecast
const g = garch11(returns);
// g.nextPeriodForecast — Next-period conditional variance forecast
// g.omega / g.alpha / g.beta — GARCH parameters

// Return quantiles
const quantiles = returnQuantiles(nav, [0.01, 0.05, 0.5, 0.95, 0.99]);

// Rolling skewness / kurtosis
const skew = rollingSkewness(returns, 60);
const kurt = rollingKurtosis(returns, 60);
```

---

### 4. DCA & PnL Analysis Module (`dca`)

#### DCA Simulation

```typescript
const dca = simulateDCA(nav, {
  amount: 1000,     // Investment amount per period
  interval: 22,     // DCA interval (trading days), 22 ≈ monthly
  startIndex: 0,    // Starting index
});

// dca.totalInvestments — Number of investments made
// dca.totalInvested     — Total amount invested
// dca.currentValue      — Current market value
// dca.averageCost       — Average holding cost
// dca.returnRate        — Return rate
// dca.irr               — Internal Rate of Return (annualized)
```

#### Take-Profit & Stop-Loss

```typescript
// Fixed take-profit / stop-loss
const signal = takeProfitStopLoss(nav, costPrice, 0.30, -0.15);
// signal.takeProfitTriggered — Whether the 30% take-profit was triggered
// signal.stopLossTriggered   — Whether the 15% stop-loss was triggered

// Trailing stop (triggered when price drops N% from peak)
const trail = trailingStop(nav, 0.10, costPrice);
// trail.triggered — Whether triggered
// trail.drawdownFromPeak — Drawdown from peak
```

#### Smart DCA

```typescript
// Dynamically adjust investment amount based on NAV relative to moving average
const multiplier = smartDCAMultiplier(nav, 250, 2.0, 0.5);
// > 1 when below MA (invest more), < 1 when above MA (invest less)

// Tiered buy / sell signals
const buyLevel = tieredBuySignal(nav, [0.3, 0.2, 0.1]);
const sellLevel = tieredSellSignal(nav, [0.7, 0.8, 0.9]);
```

#### Utility Functions

```typescript
safetyMargin(nav);         // Drawdown from all-time high
pricePosition(nav);        // Current price position between historical high and low (0–1)
positionPnL(nav, buyIdx, sellIdx?, amount?);  // Single-position PnL details
```

---

### 5. Pattern Recognition Module (`pattern`)

```typescript
import {
  supportResistance, doubleBottomTop,
  detectGaps, trendStrength, headAndShoulders,
} from '@stvy/fund-indicators';

// Support / Resistance levels
const sr = supportResistance(nav, 0.02, 3);
// sr.supports[0].level / .strength / .touches
// sr.resistances[0].level / .strength / .touches

// Double Bottom (W-bottom) / Double Top (M-top)
const dbt = doubleBottomTop(nav, 60, 0.03, 10);
// dbt.type — 'double_bottom' | 'double_top' | 'none'
// dbt.breakout — Whether neckline breakout occurred
// dbt.confidence — Signal strength 0–1

// Gap detection
const gaps = detectGaps(nav, 0.02);
// gaps[i].type — 'gap_up' | 'gap_down'
// gaps[i].gapSize — Gap size
// gaps[i].filled — Whether the gap has been filled

// Trend strength score
const score = trendStrength(nav, 20);  // 0–100

// Head and Shoulders pattern
const hs = headAndShoulders(nav, 90);
// hs.type — 'head_and_shoulders_top' | 'head_and_shoulders_bottom' | 'none'
```

---

## Full API Reference

| Module | Functions | Input | Output |
|--------|-----------|-------|--------|
| **Moving Averages** | `sma` `ema` `wma` `dema` `tema` `kama` | `nav, period` | `MAResult` |
| **Trend** | `macd` | `nav, fast?, slow?, signal?` | `MACDResult` |
| **Momentum** | `rsi` `kdj` `roc` `momentum` `williamsR` `cci` `trix` `dpo` `stochasticRSI` `massIndex` | `nav, period?` | `MAResult` / `KDJResult` |
| **Channels** | `bollingerBands` `donchianChannel` `keltnerChannel` | `nav, ...params` | `BollingerResult` / `ChannelResult` |
| **Trend Strength** | `adx` `atr` `sar` | `nav, period?` | `ADXResult` / `MAResult` / `SARResult` |
| **Derived** | `bias` `navPercentile` `detectCrossSignal` `detectMAAlignment` | `nav, ...` | Varies |
| **Volatility** | `annualizedVolatility` `downsideVolatility` `rollingVolatility` `volatilityCone` | `returns` | `number` / `array` |
| **Drawdown** | `maxDrawdown` `maxDrawdownDuration` | `nav, dates?` | `DrawdownResult` / `number` |
| **VaR** | `calculateVaR` `calculateCVaR` | `returns, confidence` | `number` |
| **Risk Summary** | `riskMetrics` | `nav, rf?` | `RiskMetrics` |
| **Performance** | `sharpeRatio` `sortinoRatio` `calmarRatio` `treynorRatio` `omegaRatio` `winRate` `profitLossRatio` `profitFactor` `consecutiveWinLoss` `performanceMetrics` | `nav` / `returns` | `number` / `PerformanceMetrics` |
| **Benchmark** | `calculateBeta` `calculateAlpha` `trackingError` `informationRatio` `benchmarkMetrics` | `nav, benchmark` | `number` / `BenchmarkMetrics` |
| **Statistics** | `statisticalFeatures` `navStatisticalFeatures` | `nav` | `StatisticalFeatures` |
| **Hurst** | `hurstExponent` | `nav, ...` | `HurstResult` |
| **Autocorrelation** | `autocorrelation` `ljungBoxTest` | `nav, maxLag` | `AutocorrelationResult` |
| **GARCH** | `garch11` | `returns` | `{ conditionalVariance, nextPeriodForecast, ... }` |
| **Distribution** | `returnQuantiles` `rollingSkewness` `rollingKurtosis` | `nav` / `returns` | `Map` / `array` |
| **DCA** | `simulateDCA` | `nav, config` | `DCAResult` |
| **Take-Profit / Stop-Loss** | `takeProfitStopLoss` `trailingStop` | `nav, cost, ...` | `TakeProfitStopLossSignal` |
| **Smart DCA** | `smartDCAMultiplier` `tieredBuySignal` `tieredSellSignal` | `nav, ...` | `number` |
| **Utilities** | `safetyMargin` `pricePosition` `positionPnL` | `nav, ...` | `number` / `object` |
| **Patterns** | `supportResistance` `doubleBottomTop` `detectGaps` `trendStrength` `headAndShoulders` | `nav, ...` | Varies |

---

## Data Requirements

This library only requires a **historical daily NAV series** — no volume, holdings, or fund flow data is needed.

Input format:

```typescript
// NAV array sorted by date ascending
const nav: number[] = [1.0000, 1.0032, 0.9985, 1.0120, ...];
```

Important notes:

- The NAV series should be sorted in chronological order (earliest first)
- A minimum of 60 data points is recommended; some indicators (e.g. Hurst Exponent, GARCH) work best with 250+
- Dividend distributions cause abrupt NAV drops — use **adjusted NAV** (cumulative NAV or dividend-reinvested NAV) for accurate results
- Annualization parameters are based on **242 A-share trading days**; modify the `TRADING_DAYS_PER_YEAR` constant to adapt to other markets

---

## Development Guide

### Prerequisites

- Node.js >= 18
- npm >= 9

### Local Development

```bash
# Clone the repository
git clone https://github.com/stevieyu/fund-indicators.git
cd fund-indicators

# Install dependencies
npm install

# Run tests
npm test

# Compile TypeScript
npm run build
```

### Project Structure

```
fund-indicators/
├── src/
│   ├── index.ts          # Unified export entry point
│   ├── types.ts          # Full type definitions (30+ interfaces)
│   ├── technical.ts      # Technical indicators (MA/MACD/RSI/KDJ/Bollinger/Channels)
│   ├── risk.ts           # Risk & performance (Volatility/Drawdown/VaR/Sharpe/Alpha/Beta)
│   ├── statistics.ts     # Statistical features (Skewness/Kurtosis/Hurst/GARCH/Autocorrelation)
│   ├── dca.ts            # DCA analysis (Simulation/IRR/Smart DCA/Take-Profit & Stop-Loss)
│   ├── pattern.ts        # Pattern recognition (Support/Resistance/Double Bottom-Top/H&S/Gaps)
│   └── jstat.d.ts        # jstat type declarations
├── scripts/
│   └── build-browser.mjs # Browser build script (esbuild)
├── test/
│   └── index.test.ts     # 35 validation tests
├── dist/
│   ├── *.js / *.d.ts     # Node.js build artifacts (CommonJS + type declarations)
│   └── browser/          # Browser build artifacts (IIFE + ESM)
├── .github/
│   └── workflows/
│       ├── ci.yml        # CI pipeline (Node LTS)
│       └── publish.yml   # Auto-publish to npm on release
├── package.json
├── tsconfig.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## Dependencies

| Dependency | Purpose | Size |
|------------|---------|------|
| [technicalindicators](https://github.com/anandanand84/technicalindicators) | Classic technical indicator calculations (MA/MACD/RSI/Bollinger Bands, etc.) | ~150KB |
| [simple-statistics](https://github.com/simple-statistics/simple-statistics) | Statistical functions (std dev, skewness, kurtosis, regression, quantiles, etc.) | ~50KB |
| [jstat](https://github.com/jstat/jstat) | Probability distribution functions (normal, chi-squared, t-distribution; used for VaR) | ~30KB |

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Write code and corresponding tests
4. Make sure tests pass (`npm test`) and TypeScript compiles without errors (`npm run build`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Convention

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test-related changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Build/tooling changes

---

## FAQ

**Q: Fund NAV data has no volume — can I still use indicators like ATR and OBV?**

A: Yes, partially. Since fund NAV has no intraday high/low, this library sets high, low, and close all to the daily NAV. ATR degenerates to EMA(|ΔNAV|), which still serves as a useful measure of daily volatility magnitude. OBV, however, is meaningless without volume data and is not recommended.

**Q: Why is the annualization parameter set to 242?**

A: The A-share market has approximately 242 trading days per year. If you are analyzing Hong Kong stocks (~250 days) or US stocks (~252 days), you can fork the repository and modify the `TRADING_DAYS_PER_YEAR` constant.

**Q: How should I handle NAV drops caused by dividend distributions?**

A: Use **adjusted NAV** (cumulative NAV or dividend-reinvested NAV) as input. If you use unit NAV, dividend distributions will cause sudden drops that distort indicator calculations. The library's `detectGaps` function can help identify such anomalous jumps.

**Q: Why are my Hurst Exponent results unstable?**

A: The Hurst Exponent's R/S analysis is sensitive to data length. At least 500 data points are recommended. With short datasets, R² tends to be low and results are unreliable. You can assess result reliability via `hurst.rSquared` (R² > 0.9 is considered good).

---

## License

[MIT](LICENSE)

---

## Acknowledgments

Technical indicator calculations in this project are powered by [technicalindicators](https://github.com/anandanand84/technicalindicators), statistical analysis by [simple-statistics](https://github.com/simple-statistics/simple-statistics), and probability distribution computations by [jstat](https://github.com/jstat/jstat). Our thanks to these outstanding open-source projects.
