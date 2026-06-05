# @stvy/fund-indicators

**[English](README.en.md)** | 中文

**基金自动化交易指标计算工具库** — 基于历史净值 (NAV) 数据计算全部技术指标。

[![npm version](https://img.shields.io/npm/v/@stvy/fund-indicators)](https://www.npmjs.com/package/@stvy/fund-indicators)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![CI](https://github.com/stevieyu/fund-indicators/actions/workflows/ci.yml/badge.svg)](https://github.com/stevieyu/fund-indicators/actions/workflows/ci.yml)

专为场外基金、指数基金、ETF 联接基金等设计的量化分析工具库，只需传入每日净值数组，即可计算 70+ 种技术指标、风险指标、绩效指标、统计特征、定投分析和形态识别信号。

---

## 特性

- **零门槛输入**：所有函数只需一个 `number[]`（每日净值数组）即可调用
- **TypeScript 原生**：完整的类型定义和 JSDoc 注释，IDE 智能提示友好
- **覆盖全面**：技术指标 + 风险绩效 + 统计特征 + 定投分析 + 形态识别，5 大模块 70+ 函数
- **基金场景优化**：年化参数基于 A 股 242 个交易日，支持场外基金净值分析
- **轻量依赖**：仅依赖 `technicalindicators` + `simple-statistics` + `jstat` 三个库
- **经过验证**：35 项自动化测试覆盖所有核心功能

---

## 安装

```bash
npm install @stvy/fund-indicators
```

### 浏览器直接使用

本库同时提供浏览器可用的构建产物，可以直接在 HTML 页面中使用。

**方式一：`<script>` 标签（IIFE）**

```html
<script src="https://unpkg.com/@stvy/fund-indicators/dist/browser/fund-indicators.min.js"></script>
<script>
  const nav = [1.0, 1.02, 1.01, 1.05, 1.03, 1.08];

  const ma = FundIndicators.sma(nav, 3);
  console.log('SMA(3):', ma.current);

  const rsi = FundIndicators.rsi(nav, 3);
  console.log('RSI(3):', rsi.current);

  const sharpe = FundIndicators.sharpeRatio(nav);
  console.log('夏普比率:', sharpe);
</script>
```

**方式二：`<script type="module">`（ESM）**

```html
<script type="module">
  import { sma, rsi, sharpeRatio } from 'https://unpkg.com/@stvy/fund-indicators/dist/browser/fund-indicators.esm.js';

  const nav = [1.0, 1.02, 1.01, 1.05, 1.03, 1.08];

  console.log('SMA(3):', sma(nav, 3).current);
  console.log('RSI(3):', rsi(nav, 3).current);
  console.log('夏普比率:', sharpeRatio(nav));
</script>
```

**产物说明：**

| 文件 | 格式 | 大小 | 用途 |
|------|------|------|------|
| `fund-indicators.js` | IIFE | ~257 KB | `<script>` 标签，暴露全局变量 `FundIndicators` |
| `fund-indicators.min.js` | IIFE minified | ~99 KB | 生产环境推荐 |
| `fund-indicators.esm.js` | ESM | ~241 KB | `<script type="module">` 或前端打包工具 |
| `fund-indicators.esm.min.js` | ESM minified | ~99 KB | 生产环境 ESM 推荐 |

> 浏览器构建将所有依赖打包在内，无需额外安装任何依赖。

---

## 快速开始

```typescript
import {
  sma, macd, rsi, kdj, bollingerBands,
  sharpeRatio, maxDrawdown, performanceMetrics,
  hurstExponent, simulateDCA,
} from '@stvy/fund-indicators';

// 你的基金历史净值序列（按日期升序）
const nav = [1.0, 1.02, 1.01, 1.05, 1.03, 1.08, /* ... */];

// ── 技术指标 ──
const ma20 = sma(nav, 20);
console.log('20日均线:', ma20.current);

const m = macd(nav);
console.log('MACD DIF/DEA:', m.currentDIF, m.currentDEA);

const r = rsi(nav, 14);
console.log('RSI(14):', r.current);

const k = kdj(nav);
console.log('KDJ:', k.currentK, k.currentD, k.currentJ);

// ── 风险与绩效 ──
console.log('夏普比率:', sharpeRatio(nav, 0.025));
console.log('最大回撤:', maxDrawdown(nav).maxDrawdown);

const perf = performanceMetrics(nav);
console.log('年化收益:', perf.annualizedReturn);
console.log('索提诺比率:', perf.sortinoRatio);

// ── 统计特征 ──
const hurst = hurstExponent(nav);
console.log('Hurst 指数:', hurst.hurstExponent, '→', hurst.interpretation);

// ── 定投模拟 ──
const dca = simulateDCA(nav, { amount: 1000, interval: 22 });
console.log('定投收益率:', dca.returnRate, 'IRR:', dca.irr);
```

---

## 模块文档

### 1. 技术指标模块 (`technical`)

基于历史净值计算趋势、动量、震荡和通道类指标。

#### 均线系列

| 函数 | 说明 | 参数 |
|------|------|------|
| `sma(nav, period)` | 简单移动平均线 | `period` 默认 20 |
| `ema(nav, period)` | 指数移动平均线 | `period` 默认 20 |
| `wma(nav, period)` | 加权移动平均线 | `period` 默认 20 |
| `dema(nav, period)` | 双重指数移动平均线 | `period` 默认 20 |
| `tema(nav, period)` | 三重指数移动平均线 | `period` 默认 20 |
| `kama(nav, period, fast?, slow?)` | 考夫曼自适应均线 | `period` 默认 10 |

所有均线函数返回 `MAResult`：

```typescript
interface MAResult {
  values: (number | null)[];  // 与输入等长的数组，前 N-1 个为 null
  current: number | null;     // 最后一个有效值
  period: number;
  type: string;
}
```

**示例 — 均线交叉检测：**

```typescript
const fast = ema(nav, 10);
const slow = ema(nav, 30);
const signal = detectCrossSignal(fast, slow);

if (signal.type === 'golden_cross') console.log('金叉！买入信号');
if (signal.type === 'death_cross')  console.log('死叉！卖出信号');
```

**示例 — 均线多空排列：**

```typescript
const alignment = detectMAAlignment([
  sma(nav, 5), sma(nav, 10), sma(nav, 20), sma(nav, 60),
]);
console.log(alignment.alignment);  // 'bullish' | 'bearish' | 'neutral'
```

#### MACD

```typescript
const result = macd(nav, 12, 26, 9);
// result.currentDIF      — DIF 线（快线）
// result.currentDEA      — DEA 线（慢线）
// result.currentHistogram — 柱状线
// result.dif / .dea / .histogram — 完整序列
```

#### 动量与震荡指标

| 函数 | 说明 | 典型用法 |
|------|------|----------|
| `rsi(nav, period?)` | RSI 相对强弱指标 | >70 超买，<30 超卖 |
| `kdj(nav, kPeriod?, kSmooth?, dPeriod?)` | KDJ 随机指标（含 J 值） | K/D 金叉死叉 |
| `roc(nav, period?)` | 变动率 | 动量强弱 |
| `momentum(nav, period?)` | 动量指标 | 趋势加速/减速 |
| `williamsR(nav, period?)` | 威廉指标 | 超买超卖 |
| `cci(nav, period?)` | 商品通道指数 | >100 / <-100 |
| `trix(nav, period?)` | 三重平滑指数 | 过滤噪音的趋势 |
| `dpo(nav, period?)` | 去趋势价格震荡器 | 识别周期 |
| `stochasticRSI(nav, ...)` | 随机 RSI | 更灵敏的超买超卖 |
| `massIndex(nav, emaPeriod?, sumPeriod?)` | 质量指数 | 识别变盘点 |

#### 通道与波动

| 函数 | 说明 |
|------|------|
| `bollingerBands(nav, period?, stdDev?)` | 布林带（含带宽和 %B） |
| `donchianChannel(nav, period?)` | 唐奇安通道 |
| `keltnerChannel(nav, emaPeriod?, atrPeriod?, multiplier?)` | 肯特纳通道 |
| `adx(nav, period?)` | ADX 平均趋向指标 + DI+/DI- |
| `atr(nav, period?)` | ATR 平均真实波幅（近似） |
| `sar(nav, step?, max?)` | SAR 抛物线转向 |

#### 衍生指标

| 函数 | 说明 |
|------|------|
| `bias(nav, period?)` | 乖离率 = (净值 - MA) / MA × 100 |
| `navPercentile(nav, lookback?)` | 净值在历史区间中的百分位 (0-100) |

---

### 2. 风险与绩效模块 (`risk`)

#### 基础工具

```typescript
import { navToReturns, totalReturn, annualizeReturn } from '@stvy/fund-indicators';

const returns = navToReturns(nav);       // 净值 → 日收益率
const tr = totalReturn(nav);             // 累计收益率
const ar = annualizeReturn(returns);     // 年化收益率（几何平均）
```

#### 波动率

```typescript
import { annualizedVolatility, downsideVolatility, rollingVolatility, volatilityCone } from '@stvy/fund-indicators';

annualizedVolatility(returns);              // 年化波动率
downsideVolatility(returns, 0.025);        // 下行波动率
rollingVolatility(returns, 20);            // 滚动 20 日波动率
volatilityCone(returns, [5,10,20,60,120]); // 波动率锥
```

#### 回撤分析

```typescript
const dd = maxDrawdown(nav, dates?);

// dd.maxDrawdown         — 最大回撤（负数，如 -0.25）
// dd.peakIndex           — 回撤起点索引
// dd.troughIndex         — 回撤谷底索引
// dd.durationDays        — 下跌持续天数
// dd.recoveryDays        — 恢复天数（null 表示未恢复）
// dd.drawdownSeries      — 完整回撤序列
```

#### VaR / CVaR

```typescript
calculateVaR(returns, 0.95, 'historical');  // 95% 历史模拟 VaR
calculateVaR(returns, 0.99, 'parametric');  // 99% 参数法 VaR
calculateCVaR(returns, 0.95);              // 95% 条件在险价值
```

#### 风险指标汇总

```typescript
const risk = riskMetrics(nav, 0.025);
// risk.annualizedVolatility — 年化波动率
// risk.downsideVolatility   — 下行波动率
// risk.maxDrawdown          — 最大回撤
// risk.maxDrawdownDuration  — 最大回撤持续天数
// risk.var95 / risk.var99   — VaR
// risk.cvar95 / risk.cvar99 — CVaR
```

#### 绩效评价指标

| 函数 | 公式 |
|------|------|
| `sharpeRatio(nav, rf?)` | (年化收益 - 无风险利率) / 年化波动率 |
| `sortinoRatio(nav, rf?)` | (年化收益 - 无风险利率) / 下行波动率 |
| `calmarRatio(nav)` | 年化收益 / \|最大回撤\| |
| `treynorRatio(nav, benchmark, rf?)` | (年化收益 - 无风险利率) / Beta |
| `omegaRatio(nav, threshold?)` | 加权上行收益 / 加权下行亏损 |
| `winRate(returns)` | 正收益天数 / 总天数 |
| `profitLossRatio(returns)` | 平均盈利 / 平均亏损 |
| `profitFactor(returns)` | 总盈利 / 总亏损 |
| `consecutiveWinLoss(returns)` | 最大连续盈利/亏损天数 |

**一键获取全部绩效指标：**

```typescript
const perf = performanceMetrics(nav, 0.025);
// perf.totalReturn / .annualizedReturn
// perf.sharpeRatio / .sortinoRatio / .calmarRatio
// perf.omegaRatio / .winRate / .profitLossRatio / .profitFactor
// perf.maxConsecutiveWins / .maxConsecutiveLosses
```

#### 基准对比指标

```typescript
const bm = benchmarkMetrics(fundNav, benchmarkNav, 0.025);
// bm.alpha             — Alpha（超额收益）
// bm.beta              — Beta 系数
// bm.trackingError     — 跟踪误差（年化）
// bm.informationRatio  — 信息比率
// bm.correlation       — 相关系数
// bm.rSquared          — R²
```

---

### 3. 统计特征模块 (`statistics`)

```typescript
import {
  statisticalFeatures, hurstExponent, autocorrelation,
  ljungBoxTest, garch11, returnQuantiles,
  rollingSkewness, rollingKurtosis,
} from '@stvy/fund-indicators';

// 完整统计特征
const stats = statisticalFeatures(nav);
// stats.mean / .median / .stdDev
// stats.skewness / .kurtosis
// stats.jarqueBera — 正态性检验

// 赫斯特指数
const h = hurstExponent(nav);
// h.hurstExponent  — >0.5 趋势性 / <0.5 均值回归 / ≈0.5 随机
// h.interpretation — 'trending' | 'mean_reverting' | 'random_walk'

// 自相关分析
const acf = autocorrelation(nav, 20);
// acf.coefficients — 各滞后期自相关系数
// acf.interpretation — 'persistent' | 'anti_persistent' | 'no_correlation'

// Ljung-Box 检验
const lb = ljungBoxTest(returns, 10);
// lb.qStatistic / lb.approximatePValue

// GARCH(1,1) 波动率预测
const g = garch11(returns);
// g.nextPeriodForecast — 下一期条件方差预测
// g.omega / g.alpha / g.beta — GARCH 参数

// 收益率分位数
const quantiles = returnQuantiles(nav, [0.01, 0.05, 0.5, 0.95, 0.99]);

// 滚动偏度/峰度
const skew = rollingSkewness(returns, 60);
const kurt = rollingKurtosis(returns, 60);
```

---

### 4. 定投与盈亏分析模块 (`dca`)

#### 定投模拟

```typescript
const dca = simulateDCA(nav, {
  amount: 1000,     // 每次投入金额
  interval: 22,     // 定投周期（交易日数），22 ≈ 每月
  startIndex: 0,    // 起始位置
});

// dca.totalInvestments — 定投次数
// dca.totalInvested     — 总投入金额
// dca.currentValue      — 当前市值
// dca.averageCost       — 平均持仓成本
// dca.returnRate        — 收益率
// dca.irr               — 内部收益率（年化）
```

#### 止盈止损

```typescript
// 固定止盈止损
const signal = takeProfitStopLoss(nav, costPrice, 0.30, -0.15);
// signal.takeProfitTriggered — 是否触发 30% 止盈
// signal.stopLossTriggered   — 是否触发 15% 止损

// 跟踪止盈（从最高点回撤 N% 触发）
const trail = trailingStop(nav, 0.10, costPrice);
// trail.triggered — 是否触发
// trail.drawdownFromPeak — 距最高点回撤幅度
```

#### 智能定投

```typescript
// 根据净值相对均线位置动态调整定投金额
const multiplier = smartDCAMultiplier(nav, 250, 2.0, 0.5);
// 低于均线时 > 1（加大投入），高于均线时 < 1（减少投入）

// 分批买入/卖出信号
const buyLevel = tieredBuySignal(nav, [0.3, 0.2, 0.1]);
const sellLevel = tieredSellSignal(nav, [0.7, 0.8, 0.9]);
```

#### 辅助工具

```typescript
safetyMargin(nav);         // 距历史最高点的回撤幅度
pricePosition(nav);        // 当前价格在历史高低点之间的位置（0-1）
positionPnL(nav, buyIdx, sellIdx?, amount?);  // 单笔持仓盈亏明细
```

---

### 5. 形态识别模块 (`pattern`)

```typescript
import {
  supportResistance, doubleBottomTop,
  detectGaps, trendStrength, headAndShoulders,
} from '@stvy/fund-indicators';

// 支撑位/阻力位
const sr = supportResistance(nav, 0.02, 3);
// sr.supports[0].level / .strength / .touches
// sr.resistances[0].level / .strength / .touches

// 双底(W底) / 双顶(M头)
const dbt = doubleBottomTop(nav, 60, 0.03, 10);
// dbt.type — 'double_bottom' | 'double_top' | 'none'
// dbt.breakout — 是否突破颈线
// dbt.confidence — 信号强度 0-1

// 缺口识别
const gaps = detectGaps(nav, 0.02);
// gaps[i].type — 'gap_up' | 'gap_down'
// gaps[i].gapSize — 缺口大小
// gaps[i].filled — 是否已回补

// 趋势强度评分
const score = trendStrength(nav, 20);  // 0-100

// 头肩形态
const hs = headAndShoulders(nav, 90);
// hs.type — 'head_and_shoulders_top' | 'head_and_shoulders_bottom' | 'none'
```

---

## 完整 API 列表

| 模块 | 函数 | 输入 | 输出 |
|------|------|------|------|
| **均线** | `sma` `ema` `wma` `dema` `tema` `kama` | `nav, period` | `MAResult` |
| **趋势** | `macd` | `nav, fast?, slow?, signal?` | `MACDResult` |
| **动量** | `rsi` `kdj` `roc` `momentum` `williamsR` `cci` `trix` `dpo` `stochasticRSI` `massIndex` | `nav, period?` | `MAResult` / `KDJResult` |
| **通道** | `bollingerBands` `donchianChannel` `keltnerChannel` | `nav, ...params` | `BollingerResult` / `ChannelResult` |
| **趋势强度** | `adx` `atr` `sar` | `nav, period?` | `ADXResult` / `MAResult` / `SARResult` |
| **衍生** | `bias` `navPercentile` `detectCrossSignal` `detectMAAlignment` | `nav, ...` | 各有不同 |
| **波动率** | `annualizedVolatility` `downsideVolatility` `rollingVolatility` `volatilityCone` | `returns` | `number` / `array` |
| **回撤** | `maxDrawdown` `maxDrawdownDuration` | `nav, dates?` | `DrawdownResult` / `number` |
| **VaR** | `calculateVaR` `calculateCVaR` | `returns, confidence` | `number` |
| **风险汇总** | `riskMetrics` | `nav, rf?` | `RiskMetrics` |
| **绩效** | `sharpeRatio` `sortinoRatio` `calmarRatio` `treynorRatio` `omegaRatio` `winRate` `profitLossRatio` `profitFactor` `consecutiveWinLoss` `performanceMetrics` | `nav` / `returns` | `number` / `PerformanceMetrics` |
| **基准对比** | `calculateBeta` `calculateAlpha` `trackingError` `informationRatio` `benchmarkMetrics` | `nav, benchmark` | `number` / `BenchmarkMetrics` |
| **统计** | `statisticalFeatures` `navStatisticalFeatures` | `nav` | `StatisticalFeatures` |
| **Hurst** | `hurstExponent` | `nav, ...` | `HurstResult` |
| **自相关** | `autocorrelation` `ljungBoxTest` | `nav, maxLag` | `AutocorrelationResult` |
| **GARCH** | `garch11` | `returns` | `{ conditionalVariance, nextPeriodForecast, ... }` |
| **分布** | `returnQuantiles` `rollingSkewness` `rollingKurtosis` | `nav` / `returns` | `Map` / `array` |
| **定投** | `simulateDCA` | `nav, config` | `DCAResult` |
| **止盈止损** | `takeProfitStopLoss` `trailingStop` | `nav, cost, ...` | `TakeProfitStopLossSignal` |
| **智能定投** | `smartDCAMultiplier` `tieredBuySignal` `tieredSellSignal` | `nav, ...` | `number` |
| **辅助** | `safetyMargin` `pricePosition` `positionPnL` | `nav, ...` | `number` / `object` |
| **形态** | `supportResistance` `doubleBottomTop` `detectGaps` `trendStrength` `headAndShoulders` | `nav, ...` | 各有不同 |

---

## 数据要求

本库仅需要**历史每日净值序列**即可工作，不需要成交量、持仓、资金流等额外数据。

输入格式要求：

```typescript
// 按日期升序排列的净值数组
const nav: number[] = [1.0000, 1.0032, 0.9985, 1.0120, ...];
```

注意事项：

- 净值序列应按时间正序排列（最早的在前）
- 建议至少提供 60 个数据点，部分指标（如 Hurst 指数、GARCH）建议 250+
- 分红会导致净值跳变，建议使用**复权净值**（累计净值或分红再投资净值）
- 年化参数基于 A 股 **242 个交易日**，如需适配其他市场可修改 `TRADING_DAYS_PER_YEAR` 常量

---

## 开发指南

### 环境要求

- Node.js >= 18
- npm >= 9

### 本地开发

```bash
# 克隆项目
git clone https://github.com/stevieyu/fund-indicators.git
cd fund-indicators

# 安装依赖
npm install

# 运行测试
npm test

# 编译 TypeScript
npm run build
```

### 项目结构

```
fund-indicators/
├── src/
│   ├── index.ts          # 统一导出入口
│   ├── types.ts          # 完整类型定义（30+ 接口）
│   ├── technical.ts      # 技术指标（均线/MACD/RSI/KDJ/布林带/通道）
│   ├── risk.ts           # 风险与绩效（波动率/回撤/VaR/夏普/Alpha/Beta）
│   ├── statistics.ts     # 统计特征（偏度/峰度/Hurst/GARCH/自相关）
│   ├── dca.ts            # 定投分析（模拟/IRR/智能定投/止盈止损）
│   ├── pattern.ts        # 形态识别（支撑阻力/双底双顶/头肩/缺口）
│   └── jstat.d.ts        # jstat 类型声明
├── scripts/
│   └── build-browser.mjs # 浏览器构建脚本（esbuild）
├── test/
│   └── index.test.ts     # 35 项验证测试
├── dist/
│   ├── *.js / *.d.ts     # Node.js 构建产物（CommonJS + 类型声明）
│   └── browser/          # 浏览器构建产物（IIFE + ESM）
├── .github/
│   └── workflows/
│       ├── ci.yml        # CI 持续集成（Node LTS）
│       └── publish.yml   # Release 时自动发布到 npm
├── package.json
├── tsconfig.json
├── .gitignore
├── LICENSE
└── README.md
```

---

## 依赖说明

| 依赖 | 用途 | 大小 |
|------|------|------|
| [technicalindicators](https://github.com/anandanand84/technicalindicators) | 经典技术指标计算（均线/MACD/RSI/布林带等） | ~150KB |
| [simple-statistics](https://github.com/simple-statistics/simple-statistics) | 统计函数（标准差/偏度/峰度/回归/分位数等） | ~50KB |
| [jstat](https://github.com/jstat/jstat) | 概率分布函数（正态/卡方/t分布，用于 VaR 计算） | ~30KB |

---

## 贡献指南

欢迎贡献代码！请遵循以下流程：

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 编写代码和对应的测试
4. 确保测试通过 (`npm test`) 和 TypeScript 编译无错误 (`npm run build`)
5. 提交代码 (`git commit -m 'feat: add amazing feature'`)
6. 推送分支 (`git push origin feature/amazing-feature`)
7. 创建 Pull Request

### 提交规范

本项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` Bug 修复
- `docs:` 文档变更
- `test:` 测试相关
- `refactor:` 重构
- `perf:` 性能优化
- `chore:` 构建/工具变更

---

## 常见问题

**Q: 基金净值没有成交量数据，ATR 和 OBV 等指标能用吗？**

A: 可以。基金净值没有日内高低点，本库将 high/low/close 均设为当日净值。ATR 退化为 EMA(|ΔNAV|)，仍可用于度量日常波动幅度。OBV 因缺少量数据而无意义，不建议使用。

**Q: 年化参数为什么是 242？**

A: A 股每年约 242 个交易日。如果你分析港股（约 250 天）或美股（约 252 天），可以 fork 后修改 `TRADING_DAYS_PER_YEAR` 常量。

**Q: 如何处理基金分红导致的净值跳变？**

A: 建议使用**复权净值**（累计净值或分红再投资净值）作为输入。如果使用单位净值，分红会导致净值突降，影响指标计算准确性。本库的 `detectGaps` 函数可以帮助识别这类异常跳变。

**Q: 为什么 Hurst 指数结果不稳定？**

A: Hurst 指数的 R/S 分析对数据长度敏感，建议至少使用 500 个数据点。数据过短时 R² 较低，结果不可靠。可以通过 `hurst.rSquared` 评估结果可信度（R² > 0.9 较好）。

---

## 许可证

[MIT](LICENSE)

---

## 致谢

本项目的技术指标计算基于 [technicalindicators](https://github.com/anandanand84/technicalindicators)，统计分析基于 [simple-statistics](https://github.com/simple-statistics/simple-statistics)，概率分布计算基于 [jstat](https://github.com/jstat/jstat)。感谢这些优秀的开源项目。
