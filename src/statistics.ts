/**
 * 统计特征模块
 * 包含：偏度、峰度、赫斯特指数、自相关、Jarque-Bera 检验等
 */

import * as ss from 'simple-statistics';
import { NavSeries, ReturnSeries, StatisticalFeatures, HurstResult, AutocorrelationResult } from './types';
import { navToReturns } from './risk';

// ============================================================
// 统计特征汇总
// ============================================================

/**
 * 计算收益率的完整统计特征
 * @param nav 净值序列（自动转换为收益率）
 */
export function statisticalFeatures(nav: NavSeries): StatisticalFeatures {
  const returns = navToReturns(nav);
  if (returns.length < 4) {
    return {
      mean: 0, median: 0, stdDev: 0, skewness: 0, kurtosis: 0,
      min: 0, max: 0, range: 0, coefficientOfVariation: 0, jarqueBera: 0,
    };
  }

  const mean = ss.mean(returns);
  const median = ss.median(returns);
  const stdDev = ss.standardDeviation(returns);
  const skewness = ss.sampleSkewness(returns);
  const kurtosis = ss.sampleKurtosis(returns);
  const min = ss.min(returns);
  const max = ss.max(returns);
  const range = max - min;
  const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;

  // Jarque-Bera 检验 = n/6 * (S² + K²/4)
  const n = returns.length;
  const jarqueBera = (n / 6) * (skewness * skewness + (kurtosis * kurtosis) / 4);

  return {
    mean, median, stdDev, skewness, kurtosis,
    min, max, range, coefficientOfVariation, jarqueBera,
  };
}

/**
 * 计算净值序列（而非收益率）的统计特征
 * @param nav 净值序列
 */
export function navStatisticalFeatures(nav: NavSeries): StatisticalFeatures {
  if (nav.length < 4) {
    return {
      mean: 0, median: 0, stdDev: 0, skewness: 0, kurtosis: 0,
      min: 0, max: 0, range: 0, coefficientOfVariation: 0, jarqueBera: 0,
    };
  }

  const mean = ss.mean(nav);
  const median = ss.median(nav);
  const stdDev = ss.standardDeviation(nav);
  const skewness = ss.sampleSkewness(nav);
  const kurtosis = ss.sampleKurtosis(nav);
  const min = ss.min(nav);
  const max = ss.max(nav);
  const range = max - min;
  const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 0;
  const n = nav.length;
  const jarqueBera = (n / 6) * (skewness * skewness + (kurtosis * kurtosis) / 4);

  return {
    mean, median, stdDev, skewness, kurtosis,
    min, max, range, coefficientOfVariation, jarqueBera,
  };
}

// ============================================================
// 赫斯特指数 (R/S Analysis)
// ============================================================

/**
 * 赫斯特指数 - 通过 R/S 分析（重极差分析）计算
 *
 * 结果解读：
 * - H > 0.5：趋势性（persistent），过去涨未来大概率继续涨
 * - H < 0.5：均值回归（anti-persistent），过去涨未来大概率回落
 * - H ≈ 0.5：随机游走，无可预测性
 *
 * @param nav 净值序列
 * @param minWindowSize 最小窗口大小（默认16）
 * @param maxWindowSize 最大窗口大小（默认为序列长度的1/2）
 * @param numPoints 采样点数（默认10）
 */
export function hurstExponent(
  nav: NavSeries,
  minWindowSize: number = 16,
  maxWindowSize?: number,
  numPoints: number = 10
): HurstResult {
  const returns = navToReturns(nav);
  const n = returns.length;

  if (n < minWindowSize * 2) {
    return {
      hurstExponent: 0.5,
      interpretation: 'random_walk',
      dataPoints: [],
      rSquared: 0,
    };
  }

  const maxWin = maxWindowSize ?? Math.floor(n / 2);
  const dataPoints: { logN: number; logRS: number }[] = [];

  // 生成不同窗口大小（对数等间距）
  const logMin = Math.log(minWindowSize);
  const logMax = Math.log(maxWin);

  for (let p = 0; p < numPoints; p++) {
    const logWindowSize = logMin + (p / (numPoints - 1)) * (logMax - logMin);
    const windowSize = Math.floor(Math.exp(logWindowSize));

    if (windowSize < 2 || windowSize > n) continue;

    // 将数据分为多个大小为 windowSize 的子区间
    const numSubPeriods = Math.floor(n / windowSize);
    if (numSubPeriods < 1) continue;

    let totalRS = 0;
    let validCount = 0;

    for (let s = 0; s < numSubPeriods; s++) {
      const start = s * windowSize;
      const subPeriod = returns.slice(start, start + windowSize);

      const mean = ss.mean(subPeriod);
      const std = ss.standardDeviation(subPeriod);

      if (std === 0) continue;

      // 计算累积偏差序列
      const cumDeviations: number[] = [];
      let cumDev = 0;
      for (const r of subPeriod) {
        cumDev += r - mean;
        cumDeviations.push(cumDev);
      }

      // R = max(cumDev) - min(cumDev)
      const range = Math.max(...cumDeviations) - Math.min(...cumDeviations);
      // S = 标准差
      const rs = range / std;
      totalRS += rs;
      validCount++;
    }

    if (validCount > 0) {
      const avgRS = totalRS / validCount;
      dataPoints.push({ logN: Math.log(windowSize), logRS: Math.log(avgRS) });
    }
  }

  if (dataPoints.length < 3) {
    return {
      hurstExponent: 0.5,
      interpretation: 'random_walk',
      dataPoints,
      rSquared: 0,
    };
  }

  // 对 log(N) 和 log(R/S) 做线性回归，斜率即为 Hurst 指数
  const regressionData = dataPoints.map((d) => [d.logN, d.logRS] as [number, number]);
  const regression = ss.linearRegression(regressionData);
  const H = regression.m;

  // 计算 R²
  const predicted = dataPoints.map((d) => regression.m * d.logN + regression.b);
  const actual = dataPoints.map((d) => d.logRS);
  const meanActual = ss.mean(actual);
  const ssTotal = actual.reduce((sum, v) => sum + (v - meanActual) ** 2, 0);
  const ssResidual = actual.reduce((sum, v, i) => sum + (v - predicted[i]) ** 2, 0);
  const rSquared = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  // 判断结果
  let interpretation: HurstResult['interpretation'];
  if (H > 0.55) interpretation = 'trending';
  else if (H < 0.45) interpretation = 'mean_reverting';
  else interpretation = 'random_walk';

  return {
    hurstExponent: Math.max(0, Math.min(1, H)), // 限制在 [0, 1]
    interpretation,
    dataPoints,
    rSquared,
  };
}

// ============================================================
// 自相关分析
// ============================================================

/**
 * 计算收益率序列的自相关系数（ACF）
 * @param nav 净值序列
 * @param maxLag 最大滞后阶数（默认20）
 */
export function autocorrelation(nav: NavSeries, maxLag: number = 20): AutocorrelationResult {
  const returns = navToReturns(nav);
  const n = returns.length;

  if (n < maxLag + 2) {
    maxLag = Math.max(1, n - 2);
  }

  const mean = ss.mean(returns);
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / n;

  const coefficients: number[] = [];

  for (let lag = 0; lag <= maxLag; lag++) {
    if (variance === 0) {
      coefficients.push(lag === 0 ? 1 : 0);
      continue;
    }
    let cov = 0;
    for (let i = 0; i < n - lag; i++) {
      cov += (returns[i] - mean) * (returns[i + lag] - mean);
    }
    cov /= n;
    coefficients.push(cov / variance);
  }

  // 判断趋势持续性（基于 lag=1 的自相关系数）
  let interpretation: AutocorrelationResult['interpretation'];
  const lag1 = coefficients.length > 1 ? coefficients[1] : 0;
  if (lag1 > 0.05) interpretation = 'persistent';
  else if (lag1 < -0.05) interpretation = 'anti_persistent';
  else interpretation = 'no_correlation';

  return { coefficients, maxLag, interpretation };
}

/**
 * Ljung-Box 检验 - 检测自相关的统计显著性
 * @param returns 收益率序列
 * @param maxLag 最大滞后阶数
 * @returns Q 统计量和 p 值近似
 */
export function ljungBoxTest(returns: ReturnSeries, maxLag: number = 10): { qStatistic: number; approximatePValue: number } {
  const n = returns.length;
  const mean = ss.mean(returns);
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / n;

  if (variance === 0) return { qStatistic: 0, approximatePValue: 1 };

  // 计算各滞后期的自相关系数
  const acf: number[] = [];
  for (let k = 1; k <= maxLag; k++) {
    let cov = 0;
    for (let i = 0; i < n - k; i++) {
      cov += (returns[i] - mean) * (returns[i + k] - mean);
    }
    cov /= n;
    acf.push(cov / variance);
  }

  // Q = n(n+2) * Σ(ρk² / (n-k))
  let q = 0;
  for (let k = 0; k < maxLag; k++) {
    q += (acf[k] * acf[k]) / (n - k - 1);
  }
  q *= n * (n + 2);

  // p-value 近似（卡方分布，自由度=maxLag）
  // 使用简化的正态近似
  const df = maxLag;
  const z = Math.pow(q / df, 1 / 3) - (1 - 2 / (9 * df));
  const se = Math.sqrt(2 / (9 * df));
  const zScore = z / se;

  // 近似 p-value（使用正态分布近似卡方分布的立方根变换）
  const pValue = 1 - normalCDF(zScore);

  return { qStatistic: q, approximatePValue: Math.max(0, Math.min(1, pValue)) };
}

/** 标准正态分布 CDF 近似 */
function normalCDF(x: number): number {
  // Abramowitz and Stegun approximation
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
}

// ============================================================
// 收益率分布特征
// ============================================================

/**
 * 收益率分位数分析
 * @param nav 净值序列
 * @param quantiles 要计算的分位数列表
 */
export function returnQuantiles(
  nav: NavSeries,
  quantiles: number[] = [0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]
): Map<number, number> {
  const returns = navToReturns(nav);
  const sorted = [...returns].sort((a, b) => a - b);
  const result = new Map<number, number>();
  for (const q of quantiles) {
    result.set(q, ss.quantileSorted(sorted, q));
  }
  return result;
}

/**
 * 偏度的滚动计算
 * @param returns 收益率序列
 * @param window 滚动窗口
 */
export function rollingSkewness(returns: ReturnSeries, window: number = 60): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < window - 1) {
      result.push(null);
    } else {
      const slice = returns.slice(i - window + 1, i + 1);
      result.push(ss.sampleSkewness(slice));
    }
  }
  return result;
}

/**
 * 峰度的滚动计算
 * @param returns 收益率序列
 * @param window 滚动窗口
 */
export function rollingKurtosis(returns: ReturnSeries, window: number = 60): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < window - 1) {
      result.push(null);
    } else {
      const slice = returns.slice(i - window + 1, i + 1);
      result.push(ss.sampleKurtosis(slice));
    }
  }
  return result;
}

// ============================================================
// GARCH(1,1) 波动率预测（简化实现）
// ============================================================

/**
 * GARCH(1,1) 波动率预测 - 简化版
 * 使用矩估计法近似参数，非最大似然估计
 *
 * @param returns 收益率序列
 * @returns 条件方差序列和预测的下一期方差
 */
export function garch11(returns: ReturnSeries): {
  conditionalVariance: number[];
  nextPeriodForecast: number;
  omega: number;
  alpha: number;
  beta: number;
} {
  const n = returns.length;
  if (n < 30) {
    const v = ss.variance(returns);
    return {
      conditionalVariance: new Array(n).fill(v),
      nextPeriodForecast: v,
      omega: v * 0.1,
      alpha: 0.1,
      beta: 0.8,
    };
  }

  // 简化参数估计（矩估计法）
  const unconditionalVar = ss.variance(returns);

  // 用收益率平方的自相关来估计 alpha + beta
  const squaredReturns = returns.map((r) => r * r);
  const meanSquared = ss.mean(squaredReturns);

  // 估计一阶自相关
  let autocov = 0;
  for (let i = 0; i < n - 1; i++) {
    autocov += (squaredReturns[i] - meanSquared) * (squaredReturns[i + 1] - meanSquared);
  }
  autocov /= n;
  const autoCorr = meanSquared > 0 ? autocov / (ss.variance(squaredReturns)) : 0;

  // 简化的参数估计
  const alphaBeta = Math.max(0.5, Math.min(0.99, autoCorr + 0.8));
  const alpha = Math.max(0.01, Math.min(0.3, (1 - alphaBeta) * 2));
  const beta = alphaBeta - alpha;
  const omega = unconditionalVar * (1 - alpha - beta);

  // 递归计算条件方差
  const conditionalVariance: number[] = [unconditionalVar];
  for (let i = 1; i < n; i++) {
    const prevVar = conditionalVariance[i - 1];
    const newVar = omega + alpha * returns[i - 1] * returns[i - 1] + beta * prevVar;
    conditionalVariance.push(Math.max(newVar, 1e-10));
  }

  // 预测下一期
  const lastVar = conditionalVariance[n - 1];
  const lastReturn = returns[n - 1];
  const nextPeriodForecast = omega + alpha * lastReturn * lastReturn + beta * lastVar;

  return { conditionalVariance, nextPeriodForecast, omega, alpha, beta };
}
