/**
 * 基金指标工具库 - 验证测试
 * 使用模拟净值数据验证所有指标的计算
 */

import * as indicators from '../src/index';

// ============================================================
// 生成模拟净值数据
// ============================================================

function generateMockNav(days: number = 500, startNav: number = 1.0, seed: number = 42): number[] {
  const nav: number[] = [startNav];
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  for (let i = 1; i < days; i++) {
    // 模拟一个有趋势和波动的净值序列
    const trend = 0.0003; // 日均涨幅 ~0.03%（年化约7%）
    const volatility = 0.015; // 日波动率 ~1.5%
    const r1 = random();
    const r2 = random();
    // Box-Muller 正态分布
    const z = Math.sqrt(-2 * Math.log(r1 || 0.001)) * Math.cos(2 * Math.PI * r2);
    const dailyReturn = trend + volatility * z;
    nav.push(nav[i - 1] * (1 + dailyReturn));
  }
  return nav;
}

function generateBenchmarkNav(days: number = 500): number[] {
  return generateMockNav(days, 1.0, 123);
}

// ============================================================
// 测试工具
// ============================================================

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

function section(name: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
}

// ============================================================
// 运行测试
// ============================================================

const nav = generateMockNav(500);
const benchmarkNav = generateBenchmarkNav(500);

console.log(`\n模拟数据: ${nav.length} 天净值`);
console.log(`起始净值: ${nav[0].toFixed(4)}, 最新净值: ${nav[nav.length - 1].toFixed(4)}`);
console.log(`累计收益: ${(indicators.totalReturn(nav) * 100).toFixed(2)}%\n`);

// ---- 技术指标 ----
section('技术指标 - 均线');

const sma20 = indicators.sma(nav, 20);
assert(sma20.values.length === nav.length, 'SMA 输出长度与输入一致');
assert(sma20.current != null, `SMA(20) 当前值: ${sma20.current?.toFixed(4)}`);
assert(sma20.values[0] === null, 'SMA 前 N-1 个为 null');

const ema20 = indicators.ema(nav, 20);
assert(ema20.current != null, `EMA(20) 当前值: ${ema20.current?.toFixed(4)}`);

const kama10 = indicators.kama(nav, 10);
assert(kama10.current != null, `KAMA(10) 当前值: ${kama10.current?.toFixed(4)}`);

const demaResult = indicators.dema(nav, 20);
assert(demaResult.current != null, `DEMA(20) 当前值: ${demaResult.current?.toFixed(4)}`);

// ---- MACD ----
section('技术指标 - MACD');

const macdResult = indicators.macd(nav);
assert(macdResult.currentDIF != null, `MACD DIF: ${macdResult.currentDIF?.toFixed(6)}`);
assert(macdResult.currentDEA != null, `MACD DEA: ${macdResult.currentDEA?.toFixed(6)}`);
assert(macdResult.currentHistogram != null, `MACD 柱状线: ${macdResult.currentHistogram?.toFixed(6)}`);

// ---- RSI ----
section('技术指标 - RSI');

const rsi14 = indicators.rsi(nav, 14);
assert(rsi14.current != null && rsi14.current >= 0 && rsi14.current <= 100,
  `RSI(14): ${rsi14.current?.toFixed(2)}（范围 0-100）`);

// ---- KDJ ----
section('技术指标 - KDJ');

const kdjResult = indicators.kdj(nav);
assert(kdjResult.currentK != null, `KDJ K: ${kdjResult.currentK?.toFixed(2)}`);
assert(kdjResult.currentD != null, `KDJ D: ${kdjResult.currentD?.toFixed(2)}`);
assert(kdjResult.currentJ != null, `KDJ J: ${kdjResult.currentJ?.toFixed(2)}`);

// ---- 布林带 ----
section('技术指标 - 布林带');

const bb = indicators.bollingerBands(nav);
assert(bb.middle[nav.length - 1] != null, '布林带中轨有值');
assert(bb.upper[nav.length - 1] != null && bb.lower[nav.length - 1] != null,
  `布林带: 上轨=${bb.upper[nav.length - 1]?.toFixed(4)}, 下轨=${bb.lower[nav.length - 1]?.toFixed(4)}`);

const lastBB_U = bb.upper[nav.length - 1]!;
const lastBB_L = bb.lower[nav.length - 1]!;
const lastBB_M = bb.middle[nav.length - 1]!;
assert(lastBB_U > lastBB_M && lastBB_M > lastBB_L, '上轨 > 中轨 > 下轨');

// ---- 通道 ----
section('技术指标 - 通道');

const dc = indicators.donchianChannel(nav, 20);
assert(dc.upper[nav.length - 1] != null, `唐奇安通道上轨: ${dc.upper[nav.length - 1]?.toFixed(4)}`);

const kc = indicators.keltnerChannel(nav);
assert(kc.upper[nav.length - 1] != null, `肯特纳通道上轨: ${kc.upper[nav.length - 1]?.toFixed(4)}`);

// ---- 其他技术指标 ----
section('技术指标 - 其他');

const adxResult = indicators.adx(nav);
assert(adxResult.currentADX != null, `ADX: ${adxResult.currentADX?.toFixed(2)}`);

const cciResult = indicators.cci(nav);
assert(cciResult.current != null, `CCI: ${cciResult.current?.toFixed(2)}`);

const rocResult = indicators.roc(nav, 12);
assert(rocResult.current != null, `ROC(12): ${rocResult.current?.toFixed(4)}`);

const momResult = indicators.momentum(nav, 10);
assert(momResult.current != null, `Momentum(10): ${momResult.current?.toFixed(4)}`);

const biasResult = indicators.bias(nav, 20);
assert(biasResult.current != null, `BIAS(20): ${biasResult.current?.toFixed(4)}%`);

const trixResult = indicators.trix(nav, 12);
assert(trixResult.current != null, `TRIX(12): ${trixResult.current?.toFixed(4)}`);

const pctile = indicators.navPercentile(nav);
assert(pctile >= 0 && pctile <= 100, `净值百分位: ${pctile.toFixed(2)}%`);

// ---- 均线交叉 ----
section('均线交叉信号');

const crossSignal = indicators.detectCrossSignal(sma20, ema20);
console.log(`  最近交叉信号: ${crossSignal.type} (index: ${crossSignal.index})`);

const alignment = indicators.detectMAAlignment([
  indicators.sma(nav, 5),
  indicators.sma(nav, 10),
  indicators.sma(nav, 20),
  indicators.sma(nav, 60),
]);
console.log(`  均线排列: ${alignment.alignment}, 发散度: ${alignment.divergence.toFixed(6)}`);

// ---- 风险指标 ----
section('风险与波动指标');

const returns = indicators.navToReturns(nav);
assert(returns.length === nav.length - 1, `收益率序列长度: ${returns.length}`);

const annVol = indicators.annualizedVolatility(returns);
assert(annVol > 0, `年化波动率: ${(annVol * 100).toFixed(2)}%`);

const ddVol = indicators.downsideVolatility(returns);
assert(ddVol > 0, `下行波动率: ${(ddVol * 100).toFixed(2)}%`);

const dd = indicators.maxDrawdown(nav);
assert(dd.maxDrawdown < 0, `最大回撤: ${(dd.maxDrawdown * 100).toFixed(2)}%`);
assert(dd.durationDays >= 0, `回撤持续天数: ${dd.durationDays}`);

const var95 = indicators.calculateVaR(returns, 0.95);
assert(var95 < 0, `VaR(95%): ${(var95 * 100).toFixed(4)}%`);

const cvar95 = indicators.calculateCVaR(returns, 0.95);
assert(cvar95 <= var95, `CVaR(95%): ${(cvar95 * 100).toFixed(4)}%`);

const rm = indicators.riskMetrics(nav);
assert(rm.var99 < rm.var95, `VaR(99%) < VaR(95%): ${(rm.var99 * 100).toFixed(4)}% < ${(rm.var95 * 100).toFixed(4)}%`);

// ---- 绩效指标 ----
section('绩效评价指标');

const sharpe = indicators.sharpeRatio(nav);
console.log(`  夏普比率: ${sharpe.toFixed(4)}`);

const sortino = indicators.sortinoRatio(nav);
console.log(`  索提诺比率: ${sortino.toFixed(4)}`);

const calmar = indicators.calmarRatio(nav);
console.log(`  卡尔玛比率: ${calmar.toFixed(4)}`);

const omega = indicators.omegaRatio(nav);
console.log(`  Omega 比率: ${omega.toFixed(4)}`);

const wr = indicators.winRate(returns);
console.log(`  胜率: ${(wr * 100).toFixed(2)}%`);

const plr = indicators.profitLossRatio(returns);
console.log(`  盈亏比: ${plr.toFixed(4)}`);

const pf = indicators.profitFactor(returns);
console.log(`  利润因子: ${pf.toFixed(4)}`);

const consec = indicators.consecutiveWinLoss(returns);
console.log(`  最大连续盈利: ${consec.maxWins} 天, 最大连续亏损: ${consec.maxLosses} 天`);

const pm = indicators.performanceMetrics(nav);
assert(pm.sharpeRatio !== 0 || pm.annualizedReturn === 0, '绩效指标汇总计算成功');

// ---- 基准对比 ----
section('基准对比指标（Alpha/Beta/跟踪误差）');

const bm = indicators.benchmarkMetrics(nav, benchmarkNav);
console.log(`  Alpha: ${(bm.alpha * 100).toFixed(2)}%`);
console.log(`  Beta: ${bm.beta.toFixed(4)}`);
console.log(`  跟踪误差: ${(bm.trackingError * 100).toFixed(2)}%`);
console.log(`  信息比率: ${bm.informationRatio.toFixed(4)}`);
console.log(`  相关系数: ${bm.correlation.toFixed(4)}`);
console.log(`  R²: ${bm.rSquared.toFixed(4)}`);

// ---- 统计特征 ----
section('统计特征');

const stats = indicators.statisticalFeatures(nav);
console.log(`  均值: ${(stats.mean * 100).toFixed(4)}%`);
console.log(`  标准差: ${(stats.stdDev * 100).toFixed(4)}%`);
console.log(`  偏度: ${stats.skewness.toFixed(4)}`);
console.log(`  峰度: ${stats.kurtosis.toFixed(4)}`);
console.log(`  Jarque-Bera: ${stats.jarqueBera.toFixed(2)}`);

// ---- Hurst 指数 ----
section('赫斯特指数');

const hurst = indicators.hurstExponent(nav);
console.log(`  Hurst 指数: ${hurst.hurstExponent.toFixed(4)}`);
console.log(`  解读: ${hurst.interpretation}`);
console.log(`  R²: ${hurst.rSquared.toFixed(4)}`);
assert(hurst.hurstExponent >= 0 && hurst.hurstExponent <= 1, 'Hurst 指数在 [0,1] 范围内');

// ---- 自相关 ----
section('自相关分析');

const acf = indicators.autocorrelation(nav, 10);
console.log(`  Lag-0: ${acf.coefficients[0].toFixed(4)}`);
console.log(`  Lag-1: ${acf.coefficients[1]?.toFixed(4) ?? 'N/A'}`);
console.log(`  解读: ${acf.interpretation}`);

const lb = indicators.ljungBoxTest(returns, 10);
console.log(`  Ljung-Box Q: ${lb.qStatistic.toFixed(4)}, p-value: ${lb.approximatePValue.toFixed(4)}`);

// ---- GARCH ----
section('GARCH(1,1) 波动率预测');

const garch = indicators.garch11(returns);
console.log(`  omega: ${garch.omega.toFixed(8)}`);
console.log(`  alpha: ${garch.alpha.toFixed(4)}`);
console.log(`  beta: ${garch.beta.toFixed(4)}`);
console.log(`  下期波动率预测: ${(Math.sqrt(garch.nextPeriodForecast) * Math.sqrt(242) * 100).toFixed(2)}% (年化)`);

// ---- 定投分析 ----
section('定投模拟');

const dcaResult = indicators.simulateDCA(nav, { amount: 1000, interval: 22 });
console.log(`  定投次数: ${dcaResult.totalInvestments}`);
console.log(`  总投入: ¥${dcaResult.totalInvested.toFixed(2)}`);
console.log(`  当前市值: ¥${dcaResult.currentValue.toFixed(2)}`);
console.log(`  平均成本: ${dcaResult.averageCost.toFixed(4)}`);
console.log(`  收益率: ${(dcaResult.returnRate * 100).toFixed(2)}%`);
console.log(`  IRR: ${dcaResult.irr != null ? (dcaResult.irr * 100).toFixed(2) + '%' : 'N/A'}`);

// ---- 止盈止损 ----
section('止盈止损信号');

const costPrice = nav[Math.floor(nav.length / 2)]; // 假设中间位置买入
const tpSl = indicators.takeProfitStopLoss(nav, costPrice, 0.3, -0.15);
console.log(`  成本价: ${costPrice.toFixed(4)}`);
console.log(`  当前盈亏: ${(tpSl.currentPnL * 100).toFixed(2)}%`);
console.log(`  触发止盈: ${tpSl.takeProfitTriggered}`);
console.log(`  触发止损: ${tpSl.stopLossTriggered}`);

const trail = indicators.trailingStop(nav, 0.1, costPrice);
console.log(`  跟踪止盈触发: ${trail.triggered}`);
console.log(`  最高点回撤: ${(trail.drawdownFromPeak * 100).toFixed(2)}%`);

// ---- 智能定投 ----
section('智能定投');

const sm = indicators.safetyMargin(nav);
console.log(`  安全边际(距历史高点回撤): ${(sm * 100).toFixed(2)}%`);

const pp = indicators.pricePosition(nav);
console.log(`  历史价格位置: ${(pp * 100).toFixed(2)}%`);

const smartMult = indicators.smartDCAMultiplier(nav);
console.log(`  智能定投倍数: ${smartMult.toFixed(2)}x`);

const buyLevel = indicators.tieredBuySignal(nav);
console.log(`  分批买入层级: ${buyLevel}`);

const sellLevel = indicators.tieredSellSignal(nav);
console.log(`  分批卖出层级: ${sellLevel}`);

// ---- 形态识别 ----
section('形态识别');

const sr = indicators.supportResistance(nav);
console.log(`  支撑位数量: ${sr.supports.length}`);
if (sr.supports.length > 0) {
  console.log(`  最近支撑: ${sr.supports[0].level.toFixed(4)} (强度: ${sr.supports[0].strength.toFixed(4)})`);
}
console.log(`  阻力位数量: ${sr.resistances.length}`);
if (sr.resistances.length > 0) {
  console.log(`  最近阻力: ${sr.resistances[0].level.toFixed(4)} (强度: ${sr.resistances[0].strength.toFixed(4)})`);
}

const dbt = indicators.doubleBottomTop(nav, 60);
console.log(`  双底/双顶: ${dbt.type} (confidence: ${dbt.confidence.toFixed(2)})`);

const gaps = indicators.detectGaps(nav, 0.02);
console.log(`  缺口数量: ${gaps.length}`);
for (const g of gaps.slice(0, 3)) {
  console.log(`    ${g.type} @ index ${g.startIndex}, 大小: ${(g.gapSize * 100).toFixed(2)}%, 已回补: ${g.filled}`);
}

const ts = indicators.trendStrength(nav, 20);
console.log(`  趋势强度评分: ${ts.toFixed(2)}/100`);

const hs = indicators.headAndShoulders(nav, 90);
console.log(`  头肩形态: ${hs.type} (confidence: ${hs.confidence.toFixed(2)})`);

// ---- 汇总 ----
section('测试结果汇总');
console.log(`\n  通过: ${passed}`);
console.log(`  失败: ${failed}`);
console.log(`  总计: ${passed + failed}`);
console.log(`  结果: ${failed === 0 ? 'ALL PASSED' : 'SOME FAILED'}\n`);

process.exit(failed > 0 ? 1 : 0);
