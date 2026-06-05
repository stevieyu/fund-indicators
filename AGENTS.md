# AGENTS.md — @stvy/fund-indicators

## Project Overview

**@stvy/fund-indicators** is a TypeScript library for computing quantitative fund NAV (Net Asset Value) analysis indicators. Unlike stock-oriented TA libraries, this project is purpose-built for **fund NAV series** — daily closing prices with no intraday high/low and no volume data. It covers five domains: technical indicators, risk/performance metrics, statistical features, DCA (Dollar-Cost Averaging) simulation, and chart pattern recognition.

- **Package name**: `@stvy/fund-indicators`
- **License**: MIT
- **Runtime**: Node.js >= 18
- **Language**: TypeScript (strict mode, target ES2020)
- **Main entry**: `dist/index.js` (CommonJS)
- **Browser entry**: `dist/browser/fund-indicators.min.js` (IIFE) / `dist/browser/fund-indicators.esm.js` (ESM)
- **Types**: `dist/index.d.ts`

---

## Architecture

The source lives in `src/` with 5 feature modules, 1 type-definition file, 1 barrel export, and 1 custom type declaration:

```
src/
  index.ts          — Barrel re-export of all public functions and types
  types.ts          — 30+ interfaces and type aliases
  technical.ts      — Trend, momentum, oscillator, and channel indicators
  risk.ts           — Volatility, drawdown, VaR/CVaR, Sharpe, Alpha/Beta, etc.
  statistics.ts     — Skewness, kurtosis, Hurst exponent, GARCH, autocorrelation
  dca.ts            — DCA simulation, IRR, smart DCA, take-profit/stop-loss
  pattern.ts        — Support/resistance, double bottom/top, gaps, head-and-shoulders
  jstat.d.ts        — Custom ambient type declaration for the jstat package
```

### Module Breakdown

#### `technical.ts` — Technical Indicators
Moving averages (SMA, EMA, WMA, DEMA, TEMA, KAMA), MACD, RSI, KDJ, Bollinger Bands, Donchian Channel, Keltner Channel, ADX, ATR, CCI, ROC, Momentum, Williams %R, Stochastic RSI, SAR, TRIX, DPO, Mass Index, BIAS (deviation rate), NAV percentile, MA cross-signal detection, MA alignment detection.

Uses the `technicalindicators` npm package internally (aliased as `TI_*`). Indicators that need candle input (ADX, CCI, ATR, KDJ, SAR, Williams %R) use the `navToHLC()` helper to set `high = low = close = NAV`.

#### `risk.ts` — Risk and Performance Metrics
NAV-to-returns conversion (`navToReturns`), annualized return (geometric), total return, annualized/downside/rolling volatility, volatility cone, max drawdown (with recovery detection), max drawdown duration, VaR (historical and parametric), CVaR, Sharpe/Sortino/Calmar/Treynor/Omega ratios, win rate, profit/loss ratio, profit factor, consecutive win/loss streaks, Beta, Alpha, tracking error, information ratio, and aggregate `riskMetrics()` / `performanceMetrics()` / `benchmarkMetrics()` summaries.

#### `statistics.ts` — Statistical Features
Full statistical feature set (`statisticalFeatures`, `navStatisticalFeatures`), Hurst exponent via R/S analysis, autocorrelation (ACF), Ljung-Box test, return quantiles, rolling skewness/kurtosis, GARCH(1,1) volatility forecast.

#### `dca.ts` — DCA and P&L Analysis
DCA simulation (`simulateDCA`), IRR via Newton's method with bisection fallback, take-profit/stop-loss signals, trailing stop, safety margin, price position, smart DCA multiplier, tiered buy/sell signals, position P&L calculation.

#### `pattern.ts` — Pattern Recognition
Support/resistance levels (KDE-inspired local-extrema clustering), double bottom (W) / double top (M) detection, gap detection (up/down with fill tracking), trend strength scoring (0-100, multi-factor), head-and-shoulders top/bottom identification.

---

## Key Conventions

### Input: `number[]` (NAV Series)

All functions take a `number[]` representing a time-ordered NAV series as their primary input. The `NavSeries` type alias is defined in `types.ts`:

```ts
export type NavSeries = number[];
```

### No Volume, No Intraday High/Low

Fund NAV has a single daily value. For candle-based indicators that expect high/low/close, the `navToHLC()` helper in `technical.ts` sets all three to the same value:

```ts
function navToHLC(nav: NavSeries) {
  return nav.map((v) => ({ high: v, low: v, close: v }));
}
```

### Annualization: 242 Trading Days

The constant `TRADING_DAYS_PER_YEAR = 242` in `risk.ts` reflects the A-share (China) market convention. It is used for annualizing volatility, returns, and IRR calculations throughout the library.

### Output Arrays Are Padded with `null`

All array-returning indicators produce output arrays whose length matches the input NAV series. Leading positions (where the indicator has not yet "warmed up") are filled with `null`. This is done by the `padLeft` helper in `technical.ts`:

```ts
function padLeft(arr: (number | undefined)[], totalLen: number): (number | null)[] {
  const padLen = totalLen - arr.length;
  const result: (number | null)[] = new Array(padLen).fill(null);
  for (const v of arr) {
    result.push(v ?? null);
  }
  return result;
}
```

### Returns Calculation

Daily returns are computed via `navToReturns()` in `risk.ts`:

```ts
export function navToReturns(nav: NavSeries): ReturnSeries {
  const returns: ReturnSeries = [];
  for (let i = 1; i < nav.length; i++) {
    returns.push((nav[i] - nav[i - 1]) / nav[i - 1]);
  }
  return returns;
}
```

The output length is `nav.length - 1`.

### Types in `types.ts`

All public interfaces are defined in `src/types.ts` (30+ types). Key categories:
- **Basic**: `NavSeries`, `ReturnSeries`, `DateSeries`
- **Technical**: `MAResult`, `MACDResult`, `BollingerResult`, `ChannelResult`, `RSIResult`, `KDJResult`, `ADXResult`, `SARResult`, `MACrossSignal`, `MAAlignmentResult`
- **Risk/Performance**: `DrawdownResult`, `RiskMetrics`, `PerformanceMetrics`, `BenchmarkMetrics`
- **DCA**: `DCAConfig`, `DCAResult`, `TakeProfitStopLossSignal`
- **Statistics**: `StatisticalFeatures`, `HurstResult`, `AutocorrelationResult`
- **Pattern**: `SupportResistanceResult`, `DoubleBottomTopResult`, `GapResult`

---

## Build System

### Commands

| Command | Description |
|---|---|
| `npm run build:node` | `tsc` -- Compiles `src/` to `dist/*.js` + `dist/*.d.ts` (CommonJS, ES2020 target) |
| `npm run build:browser` | `node scripts/build-browser.mjs` -- Bundles with esbuild to `dist/browser/` (IIFE as `FundIndicators` global + ESM) |
| `npm run build` | Runs both `build:node` and `build:browser` sequentially |
| `npm test` | `tsx test/index.test.ts` -- Runs all tests via tsx (no compilation step needed) |
| `npx tsc --noEmit` | Type-check only, useful during development |

### TypeScript Configuration (`tsconfig.json`)

- **target**: ES2020
- **module**: CommonJS
- **rootDir**: `./src`
- **outDir**: `./dist`
- **strict**: true
- **declaration**: true (generates `.d.ts` files)
- **declarationMap**: true
- **sourceMap**: true

---

## Dependencies

### Runtime Dependencies

| Package | Purpose |
|---|---|
| `technicalindicators` ^3.1.0 | Classic TA library: SMA, EMA, WMA, MACD, RSI, Stochastic, BollingerBands, ADX, CCI, ROC, WilliamsR, StochasticRSI, ATR, PSAR, VWAP |
| `simple-statistics` ^7.8.0 | Statistical functions: mean, median, standardDeviation, sampleSkewness, sampleKurtosis, linearRegression, quantileSorted, sampleCovariance, variance, sampleCorrelation |
| `jstat` ^1.9.6 | Probability distributions: `jStat.normal.inv()` used for parametric VaR. **Has no `@types` package** -- a custom declaration file `src/jstat.d.ts` provides ambient types |

### Dev Dependencies

| Package | Purpose |
|---|---|
| `typescript` ^5.3.0 | Compiler |
| `esbuild` ^0.28.0 | Browser bundling (IIFE + ESM) |
| `tsx` ^4.7.0 | TypeScript execution for running tests directly |
| `@types/node` ^20.0.0 | Node.js type definitions |

---

## Testing Approach

### Single Test File

All tests live in `test/index.test.ts`. There is **no test framework** -- it uses a custom `assert()` function and manual pass/fail counting:

```ts
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.log(`  [FAIL] ${message}`);
  }
}
```

The process exits with code 1 if any test fails: `process.exit(failed > 0 ? 1 : 0)`.

### Mock NAV Data

Tests use synthetic NAV data generated with a **seeded pseudo-random number generator** (linear congruential generator, seed=42) and **Box-Muller transform** for normal distribution:

```ts
function generateMockNav(days: number = 500, startNav: number = 1.0, seed: number = 42): number[]
```

Parameters: ~0.03% daily drift (annualized ~7%), ~1.5% daily volatility. A separate benchmark series uses seed=123.

### Test Coverage

The test file covers all 5 modules with ~35 assertions organized into sections:
- Moving averages (SMA, EMA, KAMA, DEMA)
- MACD, RSI, KDJ, Bollinger Bands
- Channels (Donchian, Keltner)
- Other technicals (ADX, CCI, ROC, Momentum, BIAS, TRIX, percentile)
- MA cross signals and alignment
- Risk metrics (volatility, drawdown, VaR, CVaR, risk summary)
- Performance metrics (Sharpe, Sortino, Calmar, Omega, win rate, profit factor)
- Benchmark comparison (Alpha, Beta, tracking error, information ratio)
- Statistical features, Hurst exponent, autocorrelation, Ljung-Box, GARCH
- DCA simulation, take-profit/stop-loss, trailing stop
- Smart DCA (safety margin, price position, multiplier, tiered signals)
- Pattern recognition (support/resistance, double bottom/top, gaps, trend strength, head-and-shoulders)

### Running Tests

```bash
npm test              # Run all tests
npx tsx test/index.test.ts   # Equivalent direct invocation
```

---

## Adding a New Indicator

Follow these steps when adding a new indicator to the library:

### 1. Add the Function to the Appropriate Module

Place it in the module that matches its domain:
- `src/technical.ts` -- Trend, momentum, oscillator, channel indicators
- `src/risk.ts` -- Risk, performance, and benchmark metrics
- `src/statistics.ts` -- Statistical features and tests
- `src/dca.ts` -- DCA simulation and P&L analysis
- `src/pattern.ts` -- Pattern recognition and detection

### 2. Add an Interface to `types.ts` (If Needed)

If the function returns a new result shape, define an interface in `src/types.ts`. Follow the existing naming convention: result interfaces use PascalCase with a descriptive suffix (e.g., `MAResult`, `HurstResult`, `GapResult`).

### 3. Export from `src/index.ts`

Add the function to the appropriate `export { ... } from './module'` block in `src/index.ts`. All public API surface goes through this barrel file.

### 4. Add a Test Case in `test/index.test.ts`

Add a test section (using `section('...')` for console output grouping) and assertions using the `assert()` helper. Call the new function with the mock NAV data and verify:
- Output array length matches input (if applicable)
- Values are in expected ranges
- Non-null results where expected

### 5. Verify

```bash
npm test              # All tests must pass
npx tsc --noEmit      # Type-check without emitting
```

---

## Things to Watch Out For

### `padLeft` Alignment

The `padLeft` helper in `technical.ts` left-pads output arrays with `null` to match input length. When chaining indicators or manually combining results, always verify array alignment. Off-by-one errors here silently corrupt downstream calculations.

### KDJ Computation

KDJ is computed from `Stochastic` output for K and D, then J is calculated manually as `J = 3K - 2D`. The J array is derived element-wise, and any position where K or D is `null` must also produce `null` for J.

### DEMA and TEMA Nested EMA Offset Tracking

DEMA (`2*EMA - EMA(EMA)`) and TEMA (`3*EMA1 - 3*EMA2 + EMA3`) perform nested EMA calculations. Each successive EMA starts later than the previous one, so the code must carefully track array offsets when combining them into a full-length output array. Getting the offset wrong produces misaligned or `NaN` results.

### Hurst Exponent: R/S Analysis

The Hurst exponent implementation uses Rescaled Range (R/S) analysis:
1. Generate logarithmically-spaced window sizes
2. For each window, divide the return series into sub-periods
3. Compute the rescaled range `R/S` for each sub-period
4. Perform log-log linear regression; the slope is the Hurst exponent

Interpretation thresholds: `H > 0.55` = trending, `H < 0.45` = mean-reverting, else random walk. The result is clamped to [0, 1].

### GARCH(1,1): Simplified Moment Estimation

The GARCH(1,1) implementation uses **simplified moment estimation** (not maximum likelihood estimation). Parameters are estimated from the autocorrelation of squared returns. This is fast and adequate for approximate volatility forecasting, but not suitable for academic-grade inference.

For short series (< 30 observations), it falls back to unconditional variance with default parameters (`alpha=0.1`, `beta=0.8`).

### jstat Has No `@types` Package

The `jstat` package does not ship TypeScript types and has no `@types/jstat` on DefinitelyTyped. A custom ambient declaration file at `src/jstat.d.ts` declares the module with the specific functions used:

```ts
declare module 'jstat' {
  export const jStat: {
    normal: { pdf, cdf, inv };
    chisquare: { cdf, inv };
    studentt: { cdf, inv };
  };
}
```

If you need additional jstat functions, extend this declaration file rather than adding inline `any` casts.

### `TRADING_DAYS_PER_YEAR` Is Hardcoded

The constant `TRADING_DAYS_PER_YEAR = 242` is defined in `risk.ts` and used for all annualization. It is not configurable via function parameters. If you need a different market convention (e.g., 252 for US markets), you must modify this constant.

### Returns vs. NAV Input

Some functions take a NAV series (`number[]`) and internally convert to returns (e.g., `sharpeRatio`, `performanceMetrics`, `statisticalFeatures`). Others take a pre-computed returns series (e.g., `annualizedVolatility`, `calculateVaR`, `autocorrelation`). Check the function signature carefully -- passing the wrong type will produce silently incorrect results rather than a type error, since both are `number[]`.

### IRR Convergence

The IRR calculation in `dca.ts` uses Newton's method with a bisection fallback. It clamps the rate to `[-0.99, 10]` to prevent divergence. For unusual cash flow patterns (e.g., very few investments or extreme NAV changes), IRR may return `null` if neither method converges.

### No Test Framework

The test suite uses a custom runner, not Jest/Mocha/Vitest. There is no `describe`/`it` nesting, no snapshot testing, and no mocking infrastructure. Tests are simple imperative assertions against deterministic mock data. Adding parallel test execution or coverage tooling requires introducing a proper test framework.
