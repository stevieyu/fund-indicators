/**
 * 风险与绩效指标模块
 * 包含：波动率、最大回撤、VaR、CVaR、夏普比率、索提诺、卡尔玛、特雷诺、Omega 等
 */

import * as ss from 'simple-statistics';
import { jStat } from 'jstat';
import {
  NavSeries,
  ReturnSeries,
  DateSeries,
  DrawdownResult,
  RiskMetrics,
  PerformanceMetrics,
  BenchmarkMetrics,
} from './types';

// ============================================================
// 辅助函数
// ============================================================

const TRADING_DAYS_PER_YEAR = 242; // A股年交易日数

/** 净值序列 → 日收益率序列 */
export function navToReturns(nav: NavSeries): ReturnSeries {
  const returns: ReturnSeries = [];
  for (let i = 1; i < nav.length; i++) {
    returns.push((nav[i] - nav[i - 1]) / nav[i - 1]);
  }
  return returns;
}

/** 日收益率 → 年化收益率（几何平均） */
export function annualizeReturn(dailyReturns: ReturnSeries): number {
  if (dailyReturns.length === 0) return 0;
  // 几何年化 = (1 + 累计收益) ^ (242/n) - 1
  const cumulative = dailyReturns.reduce((acc, r) => acc * (1 + r), 1);
  const years = dailyReturns.length / TRADING_DAYS_PER_YEAR;
  if (years <= 0 || cumulative <= 0) return 0;
  return Math.pow(cumulative, 1 / years) - 1;
}

/** 累计收益率 */
export function totalReturn(nav: NavSeries): number {
  if (nav.length < 2) return 0;
  return (nav[nav.length - 1] - nav[0]) / nav[0];
}

// ============================================================
// 波动率
// ============================================================

/** 年化波动率 */
export function annualizedVolatility(returns: ReturnSeries): number {
  if (returns.length < 2) return 0;
  return ss.standardDeviation(returns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/** 下行波动率（年化），只计算负收益 */
export function downsideVolatility(returns: ReturnSeries, riskFreeRate: number = 0): number {
  const downsideReturns = returns.filter((r) => r < riskFreeRate / TRADING_DAYS_PER_YEAR);
  if (downsideReturns.length < 2) return 0;
  // 对低于无风险利率的收益计算标准差
  const deviations = downsideReturns.map((r) => Math.pow(r - riskFreeRate / TRADING_DAYS_PER_YEAR, 2));
  const meanSqDev = deviations.reduce((a, b) => a + b, 0) / returns.length; // 注意分母用总天数
  return Math.sqrt(meanSqDev) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * 滚动波动率
 * @param returns 日收益率
 * @param window 滚动窗口大小
 */
export function rollingVolatility(returns: ReturnSeries, window: number = 20): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < window - 1) {
      result.push(null);
    } else {
      const slice = returns.slice(i - window + 1, i + 1);
      result.push(ss.standardDeviation(slice) * Math.sqrt(TRADING_DAYS_PER_YEAR));
    }
  }
  return result;
}

/**
 * 波动率锥 - 不同时间窗口的波动率分位数分布
 * @param returns 日收益率
 * @param windows 要分析的时间窗口列表
 * @param quantiles 要计算的分位数列表
 */
export function volatilityCone(
  returns: ReturnSeries,
  windows: number[] = [5, 10, 20, 60, 120],
  quantiles: number[] = [0.1, 0.25, 0.5, 0.75, 0.9]
): Map<number, Map<number, number>> {
  const cone = new Map<number, Map<number, number>>();

  for (const w of windows) {
    const vols: number[] = [];
    for (let i = w - 1; i < returns.length; i++) {
      const slice = returns.slice(i - w + 1, i + 1);
      vols.push(ss.standardDeviation(slice) * Math.sqrt(TRADING_DAYS_PER_YEAR));
    }
    const sorted = [...vols].sort((a, b) => a - b);
    const qMap = new Map<number, number>();
    for (const q of quantiles) {
      qMap.set(q, ss.quantileSorted(sorted, q));
    }
    cone.set(w, qMap);
  }

  return cone;
}

// ============================================================
// 最大回撤
// ============================================================

/**
 * 最大回撤分析
 * @param nav 净值序列
 * @param dates 可选日期序列
 */
export function maxDrawdown(nav: NavSeries, dates?: DateSeries): DrawdownResult {
  if (nav.length < 2) {
    return {
      maxDrawdown: 0, peakIndex: 0, troughIndex: 0,
      peakDate: null, troughDate: null, recoveryDate: null,
      durationDays: 0, recoveryDays: null, drawdownSeries: [],
    };
  }

  const drawdownSeries: number[] = [];
  let peak = nav[0];
  let peakIdx = 0;
  let maxDD = 0;
  let maxPeakIdx = 0;
  let maxTroughIdx = 0;

  for (let i = 0; i < nav.length; i++) {
    if (nav[i] > peak) {
      peak = nav[i];
      peakIdx = i;
    }
    const dd = (nav[i] - peak) / peak;
    drawdownSeries.push(dd);
    if (dd < maxDD) {
      maxDD = dd;
      maxPeakIdx = peakIdx;
      maxTroughIdx = i;
    }
  }

  // 寻找恢复点
  let recoveryIdx: number | null = null;
  const peakValue = nav[maxPeakIdx];
  for (let i = maxTroughIdx + 1; i < nav.length; i++) {
    if (nav[i] >= peakValue) {
      recoveryIdx = i;
      break;
    }
  }

  return {
    maxDrawdown: maxDD,
    peakIndex: maxPeakIdx,
    troughIndex: maxTroughIdx,
    peakDate: dates ? dates[maxPeakIdx] ?? null : null,
    troughDate: dates ? dates[maxTroughIdx] ?? null : null,
    recoveryDate: recoveryIdx != null && dates ? dates[recoveryIdx] ?? null : null,
    durationDays: maxTroughIdx - maxPeakIdx,
    recoveryDays: recoveryIdx != null ? recoveryIdx - maxTroughIdx : null,
    drawdownSeries,
  };
}

/**
 * 最大回撤持续天数（从峰顶到下一次创新高）
 */
export function maxDrawdownDuration(nav: NavSeries): number {
  let maxDuration = 0;
  let currentDuration = 0;
  let peak = nav[0];

  for (let i = 0; i < nav.length; i++) {
    if (nav[i] >= peak) {
      peak = nav[i];
      currentDuration = 0;
    } else {
      currentDuration++;
      maxDuration = Math.max(maxDuration, currentDuration);
    }
  }
  return maxDuration;
}

// ============================================================
// VaR / CVaR
// ============================================================

/**
 * VaR（在险价值）
 * @param returns 日收益率
 * @param confidence 置信度（默认 0.95）
 * @param method 计算方法：'historical'（历史模拟）| 'parametric'（参数法/正态假设）
 */
export function calculateVaR(
  returns: ReturnSeries,
  confidence: number = 0.95,
  method: 'historical' | 'parametric' = 'historical'
): number {
  if (returns.length < 2) return 0;

  if (method === 'historical') {
    const sorted = [...returns].sort((a, b) => a - b);
    return ss.quantileSorted(sorted, 1 - confidence);
  } else {
    // 参数法（正态分布假设）
    const mean = ss.mean(returns);
    const std = ss.standardDeviation(returns);
    const z = jStat.normal.inv(1 - confidence, 0, 1);
    return mean + z * std;
  }
}

/**
 * CVaR / Expected Shortfall（条件在险价值 / 预期亏损）
 * @param returns 日收益率
 * @param confidence 置信度（默认 0.95）
 */
export function calculateCVaR(returns: ReturnSeries, confidence: number = 0.95): number {
  if (returns.length < 2) return 0;
  const varValue = calculateVaR(returns, confidence, 'historical');
  const tailReturns = returns.filter((r) => r <= varValue);
  if (tailReturns.length === 0) return varValue;
  return ss.mean(tailReturns);
}

// ============================================================
// 风险指标汇总
// ============================================================

/**
 * 一次性计算所有风险指标
 * @param nav 净值序列
 * @param riskFreeRate 年化无风险利率（默认 0.025 = 2.5%）
 */
export function riskMetrics(nav: NavSeries, riskFreeRate: number = 0.025): RiskMetrics {
  const returns = navToReturns(nav);
  const dd = maxDrawdown(nav);

  return {
    annualizedVolatility: annualizedVolatility(returns),
    downsideVolatility: downsideVolatility(returns, riskFreeRate),
    maxDrawdown: dd.maxDrawdown,
    maxDrawdownDuration: maxDrawdownDuration(nav),
    var95: calculateVaR(returns, 0.95),
    var99: calculateVaR(returns, 0.99),
    cvar95: calculateCVaR(returns, 0.95),
    cvar99: calculateCVaR(returns, 0.99),
  };
}

// ============================================================
// 绩效指标
// ============================================================

/**
 * 夏普比率 = (年化收益 - 无风险利率) / 年化波动率
 */
export function sharpeRatio(nav: NavSeries, riskFreeRate: number = 0.025): number {
  const returns = navToReturns(nav);
  const annReturn = annualizeReturn(returns);
  const annVol = annualizedVolatility(returns);
  if (annVol === 0) return 0;
  return (annReturn - riskFreeRate) / annVol;
}

/**
 * 索提诺比率 = (年化收益 - 无风险利率) / 下行波动率
 */
export function sortinoRatio(nav: NavSeries, riskFreeRate: number = 0.025): number {
  const returns = navToReturns(nav);
  const annReturn = annualizeReturn(returns);
  const dv = downsideVolatility(returns, riskFreeRate);
  if (dv === 0) return 0;
  return (annReturn - riskFreeRate) / dv;
}

/**
 * 卡尔玛比率 = 年化收益 / |最大回撤|
 */
export function calmarRatio(nav: NavSeries): number {
  const returns = navToReturns(nav);
  const annReturn = annualizeReturn(returns);
  const dd = maxDrawdown(nav);
  if (dd.maxDrawdown === 0) return 0;
  return annReturn / Math.abs(dd.maxDrawdown);
}

/**
 * 特雷诺比率 = (年化收益 - 无风险利率) / Beta
 * @param nav 基金净值
 * @param benchmarkNav 基准净值
 * @param riskFreeRate 无风险利率
 */
export function treynorRatio(
  nav: NavSeries,
  benchmarkNav: NavSeries,
  riskFreeRate: number = 0.025
): number | null {
  const fundReturns = navToReturns(nav);
  const benchReturns = navToReturns(benchmarkNav);
  const minLen = Math.min(fundReturns.length, benchReturns.length);
  const fRet = fundReturns.slice(-minLen);
  const bRet = benchReturns.slice(-minLen);

  const beta = calculateBeta(fRet, bRet);
  if (beta === 0) return null;

  const annReturn = annualizeReturn(fRet);
  return (annReturn - riskFreeRate) / beta;
}

/**
 * Omega 比率 = 加权上行收益 / 加权下行亏损
 * @param nav 净值序列
 * @param threshold 阈值（默认 0）
 */
export function omegaRatio(nav: NavSeries, threshold: number = 0): number {
  const returns = navToReturns(nav);
  const dailyThreshold = threshold / TRADING_DAYS_PER_YEAR;

  let gains = 0;
  let losses = 0;
  for (const r of returns) {
    if (r > dailyThreshold) gains += r - dailyThreshold;
    else losses += dailyThreshold - r;
  }

  if (losses === 0) return gains > 0 ? Infinity : 0;
  return gains / losses;
}

/** 胜率 = 正收益天数 / 总天数 */
export function winRate(returns: ReturnSeries): number {
  if (returns.length === 0) return 0;
  const wins = returns.filter((r) => r > 0).length;
  return wins / returns.length;
}

/** 盈亏比 = 平均盈利 / 平均亏损的绝对值 */
export function profitLossRatio(returns: ReturnSeries): number {
  const wins = returns.filter((r) => r > 0);
  const losses = returns.filter((r) => r < 0);
  if (losses.length === 0) return wins.length > 0 ? Infinity : 0;
  const avgWin = wins.length > 0 ? ss.mean(wins) : 0;
  const avgLoss = Math.abs(ss.mean(losses));
  if (avgLoss === 0) return 0;
  return avgWin / avgLoss;
}

/** 利润因子 = 总盈利 / 总亏损 */
export function profitFactor(returns: ReturnSeries): number {
  const totalWins = returns.filter((r) => r > 0).reduce((a, b) => a + b, 0);
  const totalLosses = Math.abs(returns.filter((r) => r < 0).reduce((a, b) => a + b, 0));
  if (totalLosses === 0) return totalWins > 0 ? Infinity : 0;
  return totalWins / totalLosses;
}

/** 最大连续盈利/亏损天数 */
export function consecutiveWinLoss(returns: ReturnSeries): { maxWins: number; maxLosses: number } {
  let maxWins = 0, maxLosses = 0;
  let curWins = 0, curLosses = 0;

  for (const r of returns) {
    if (r > 0) {
      curWins++;
      curLosses = 0;
      maxWins = Math.max(maxWins, curWins);
    } else if (r < 0) {
      curLosses++;
      curWins = 0;
      maxLosses = Math.max(maxLosses, curLosses);
    } else {
      curWins = 0;
      curLosses = 0;
    }
  }

  return { maxWins, maxLosses };
}

/**
 * 一次性计算所有绩效指标
 * @param nav 净值序列
 * @param riskFreeRate 年化无风险利率
 */
export function performanceMetrics(nav: NavSeries, riskFreeRate: number = 0.025): PerformanceMetrics {
  const returns = navToReturns(nav);
  const consec = consecutiveWinLoss(returns);
  const dd = maxDrawdown(nav);
  const annReturn = annualizeReturn(returns);
  const annVol = annualizedVolatility(returns);
  const dv = downsideVolatility(returns, riskFreeRate);

  return {
    totalReturn: totalReturn(nav),
    annualizedReturn: annReturn,
    sharpeRatio: annVol > 0 ? (annReturn - riskFreeRate) / annVol : 0,
    sortinoRatio: dv > 0 ? (annReturn - riskFreeRate) / dv : 0,
    calmarRatio: dd.maxDrawdown !== 0 ? annReturn / Math.abs(dd.maxDrawdown) : 0,
    treynorRatio: null, // 需要基准数据，单独计算
    omegaRatio: omegaRatio(nav),
    winRate: winRate(returns),
    profitLossRatio: profitLossRatio(returns),
    profitFactor: profitFactor(returns),
    maxConsecutiveWins: consec.maxWins,
    maxConsecutiveLosses: consec.maxLosses,
  };
}

// ============================================================
// 相对基准指标（Alpha / Beta / 跟踪误差 / 信息比率）
// ============================================================

/** Beta 系数 */
export function calculateBeta(fundReturns: ReturnSeries, benchmarkReturns: ReturnSeries): number {
  const minLen = Math.min(fundReturns.length, benchmarkReturns.length);
  const f = fundReturns.slice(-minLen);
  const b = benchmarkReturns.slice(-minLen);
  const cov = ss.sampleCovariance(f, b);
  const bVar = ss.variance(b);
  return bVar > 0 ? cov / bVar : 0;
}

/** Alpha（年化超额收益） */
export function calculateAlpha(
  fundReturns: ReturnSeries,
  benchmarkReturns: ReturnSeries,
  riskFreeRate: number = 0.025
): number {
  const minLen = Math.min(fundReturns.length, benchmarkReturns.length);
  const f = fundReturns.slice(-minLen);
  const b = benchmarkReturns.slice(-minLen);

  const fAnnReturn = annualizeReturn(f);
  const bAnnReturn = annualizeReturn(b);
  const beta = calculateBeta(f, b);

  return fAnnReturn - (riskFreeRate + beta * (bAnnReturn - riskFreeRate));
}

/** 跟踪误差（年化） */
export function trackingError(fundReturns: ReturnSeries, benchmarkReturns: ReturnSeries): number {
  const minLen = Math.min(fundReturns.length, benchmarkReturns.length);
  const f = fundReturns.slice(-minLen);
  const b = benchmarkReturns.slice(-minLen);

  const excessReturns = f.map((r, i) => r - b[i]);
  return ss.standardDeviation(excessReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/** 信息比率 = 超额收益 / 跟踪误差 */
export function informationRatio(
  fundReturns: ReturnSeries,
  benchmarkReturns: ReturnSeries
): number {
  const minLen = Math.min(fundReturns.length, benchmarkReturns.length);
  const f = fundReturns.slice(-minLen);
  const b = benchmarkReturns.slice(-minLen);

  const excessReturns = f.map((r, i) => r - b[i]);
  const meanExcess = ss.mean(excessReturns) * TRADING_DAYS_PER_YEAR;
  const te = ss.standardDeviation(excessReturns) * Math.sqrt(TRADING_DAYS_PER_YEAR);

  return te > 0 ? meanExcess / te : 0;
}

/**
 * 一次性计算所有相对基准指标
 * @param fundNav 基金净值序列
 * @param benchmarkNav 基准净值序列（如沪深300净值）
 * @param riskFreeRate 年化无风险利率
 */
export function benchmarkMetrics(
  fundNav: NavSeries,
  benchmarkNav: NavSeries,
  riskFreeRate: number = 0.025
): BenchmarkMetrics {
  const fundReturns = navToReturns(fundNav);
  const benchReturns = navToReturns(benchmarkNav);
  const minLen = Math.min(fundReturns.length, benchReturns.length);
  const f = fundReturns.slice(-minLen);
  const b = benchReturns.slice(-minLen);

  const beta = calculateBeta(f, b);
  const alpha = calculateAlpha(f, b, riskFreeRate);
  const te = trackingError(f, b);
  const ir = te > 0 ? informationRatio(f, b) : 0;
  const corr = ss.sampleCorrelation(f, b);

  // R² = correlation²
  const rSquared = corr * corr;

  return {
    alpha,
    beta,
    trackingError: te,
    informationRatio: ir,
    correlation: corr,
    rSquared,
  };
}
