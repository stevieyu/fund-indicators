/**
 * 形态识别模块
 * 包含：支撑/阻力位、双底/双顶、缺口识别、趋势强度等
 */

import { NavSeries, SupportResistanceResult, DoubleBottomTopResult, GapResult } from './types';

// ============================================================
// 支撑位 / 阻力位
// ============================================================

/**
 * 基于净值密集区识别支撑位和阻力位
 * 使用核密度估计（KDE）思想，找到净值频繁出现的价位
 *
 * @param nav 净值序列
 * @param tolerance 价格容差比例（如 0.02 = 2%以内的视为同一价位）
 * @param minTouches 最少触及次数（默认3）
 */
export function supportResistance(
  nav: NavSeries,
  tolerance: number = 0.02,
  minTouches: number = 3
): SupportResistanceResult {
  if (nav.length < 10) {
    return { supports: [], resistances: [] };
  }

  const current = nav[nav.length - 1];

  // 统计每个价位附近的触及次数
  const levelMap = new Map<number, number>();

  for (let i = 0; i < nav.length; i++) {
    // 寻找局部极值（局部最高点和最低点）
    const isLocalHigh = (i > 0 && i < nav.length - 1) &&
      nav[i] >= nav[i - 1] && nav[i] >= nav[i + 1];
    const isLocalLow = (i > 0 && i < nav.length - 1) &&
      nav[i] <= nav[i - 1] && nav[i] <= nav[i + 1];

    if (isLocalHigh || isLocalLow) {
      // 合并相近价位
      let merged = false;
      for (const [level, count] of levelMap.entries()) {
        if (Math.abs(nav[i] - level) / level < tolerance) {
          levelMap.set(level, count + 1);
          merged = true;
          break;
        }
      }
      if (!merged) {
        levelMap.set(nav[i], 1);
      }
    }
  }

  // 也考虑净值序列中出现频率高的价位
  for (const price of nav) {
    let merged = false;
    for (const [level, count] of levelMap.entries()) {
      if (Math.abs(price - level) / level < tolerance) {
        levelMap.set(level, count + 1);
        merged = true;
        break;
      }
    }
    if (!merged) {
      levelMap.set(price, 1);
    }
  }

  // 过滤并排序
  const validLevels = Array.from(levelMap.entries())
    .filter(([, touches]) => touches >= minTouches)
    .map(([level, touches]) => ({
      level,
      touches,
      strength: touches / nav.length,
    }))
    .sort((a, b) => b.strength - a.strength);

  // 分为支撑位（低于当前价）和阻力位（高于当前价）
  const supports = validLevels
    .filter((l) => l.level < current)
    .sort((a, b) => b.level - a.level); // 最近的支撑位排前面

  const resistances = validLevels
    .filter((l) => l.level > current)
    .sort((a, b) => a.level - b.level); // 最近的阻力位排前面

  return { supports, resistances };
}

// ============================================================
// 双底 (W底) / 双顶 (M头) 识别
// ============================================================

/**
 * 双底/双顶形态识别
 * @param nav 净值序列
 * @param lookback 回看天数（默认60）
 * @param tolerance 两底/顶之间的价格容差比例（默认0.03 = 3%）
 * @param minDistance 两个底/顶之间的最小间隔天数（默认10）
 */
export function doubleBottomTop(
  nav: NavSeries,
  lookback: number = 60,
  tolerance: number = 0.03,
  minDistance: number = 10
): DoubleBottomTopResult {
  const noResult: DoubleBottomTopResult = {
    type: 'none',
    firstPointIndex: null,
    secondPointIndex: null,
    necklineIndex: null,
    necklinePrice: null,
    breakout: false,
    confidence: 0,
  };

  if (nav.length < lookback || lookback < minDistance * 2) return noResult;

  const window = nav.slice(-lookback);
  const offset = nav.length - lookback;

  // 寻找局部极值
  const localMins: { index: number; value: number }[] = [];
  const localMaxs: { index: number; value: number }[] = [];

  for (let i = 2; i < window.length - 2; i++) {
    if (window[i] <= window[i - 1] && window[i] <= window[i + 1] &&
      window[i] <= window[i - 2] && window[i] <= window[i + 2]) {
      localMins.push({ index: i, value: window[i] });
    }
    if (window[i] >= window[i - 1] && window[i] >= window[i + 1] &&
      window[i] >= window[i - 2] && window[i] >= window[i + 2]) {
      localMaxs.push({ index: i, value: window[i] });
    }
  }

  // 检测双底（W底）
  for (let i = 0; i < localMins.length; i++) {
    for (let j = i + 1; j < localMins.length; j++) {
      const first = localMins[i];
      const second = localMins[j];
      const distance = second.index - first.index;

      if (distance < minDistance) continue;

      const priceDiff = Math.abs(first.value - second.value) / first.value;
      if (priceDiff > tolerance) continue;

      // 找两底之间的颈线（最高点）
      const between = window.slice(first.index, second.index + 1);
      const neckValue = Math.max(...between);
      const neckIdx = first.index + between.indexOf(neckValue);

      // 检查是否突破颈线
      const currentPrice = window[window.length - 1];
      const breakout = currentPrice > neckValue;

      // 计算信号强度
      const similarity = 1 - priceDiff / tolerance;
      const distanceFactor = Math.min(1, distance / lookback * 2);
      const confidence = (similarity * 0.6 + distanceFactor * 0.4) * (breakout ? 1 : 0.7);

      return {
        type: 'double_bottom',
        firstPointIndex: offset + first.index,
        secondPointIndex: offset + second.index,
        necklineIndex: offset + neckIdx,
        necklinePrice: neckValue,
        breakout,
        confidence,
      };
    }
  }

  // 检测双顶（M头）
  for (let i = 0; i < localMaxs.length; i++) {
    for (let j = i + 1; j < localMaxs.length; j++) {
      const first = localMaxs[i];
      const second = localMaxs[j];
      const distance = second.index - first.index;

      if (distance < minDistance) continue;

      const priceDiff = Math.abs(first.value - second.value) / first.value;
      if (priceDiff > tolerance) continue;

      // 找两顶之间的颈线（最低点）
      const between = window.slice(first.index, second.index + 1);
      const neckValue = Math.min(...between);
      const neckIdx = first.index + between.indexOf(neckValue);

      // 检查是否跌破颈线
      const currentPrice = window[window.length - 1];
      const breakout = currentPrice < neckValue;

      const similarity = 1 - priceDiff / tolerance;
      const distanceFactor = Math.min(1, distance / lookback * 2);
      const confidence = (similarity * 0.6 + distanceFactor * 0.4) * (breakout ? 1 : 0.7);

      return {
        type: 'double_top',
        firstPointIndex: offset + first.index,
        secondPointIndex: offset + second.index,
        necklineIndex: offset + neckIdx,
        necklinePrice: neckValue,
        breakout,
        confidence,
      };
    }
  }

  return noResult;
}

// ============================================================
// 缺口识别
// ============================================================

/**
 * 净值缺口识别（分红、估值调整等导致的净值跳变）
 * @param nav 净值序列
 * @param threshold 缺口阈值百分比（默认0.02 = 2%）
 */
export function detectGaps(nav: NavSeries, threshold: number = 0.02): GapResult[] {
  const gaps: GapResult[] = [];

  for (let i = 1; i < nav.length; i++) {
    const change = (nav[i] - nav[i - 1]) / nav[i - 1];
    const absChange = Math.abs(change);

    if (absChange >= threshold) {
      const isGapUp = change > 0;
      const gapTop = isGapUp ? nav[i] : nav[i - 1];
      const gapBottom = isGapUp ? nav[i - 1] : nav[i];

      // 检查缺口是否已回补
      let filled = false;
      let filledIndex: number | null = null;

      if (isGapUp) {
        // 向上缺口：后续净值跌回缺口下沿即为回补
        for (let j = i + 1; j < nav.length; j++) {
          if (nav[j] <= gapBottom) {
            filled = true;
            filledIndex = j;
            break;
          }
        }
      } else {
        // 向下缺口：后续净值涨回缺口上沿即为回补
        for (let j = i + 1; j < nav.length; j++) {
          if (nav[j] >= gapTop) {
            filled = true;
            filledIndex = j;
            break;
          }
        }
      }

      gaps.push({
        type: isGapUp ? 'gap_up' : 'gap_down',
        startIndex: i - 1,
        endIndex: i,
        gapTop,
        gapBottom,
        gapSize: absChange,
        filled,
        filledIndex,
      });
    }
  }

  return gaps;
}

// ============================================================
// 趋势强度评估
// ============================================================

/**
 * 趋势强度评分（0-100）
 * 综合多个维度评估当前趋势的强弱
 *
 * @param nav 净值序列
 * @param period 评估周期（默认20天）
 */
export function trendStrength(nav: NavSeries, period: number = 20): number {
  if (nav.length < period + 10) return 50;

  const recent = nav.slice(-period);
  const returns: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    returns.push((recent[i] - recent[i - 1]) / recent[i - 1]);
  }

  // 1. 方向一致性（正收益天数占比）
  const positiveDays = returns.filter((r) => r > 0).length;
  const directionScore = (positiveDays / returns.length) * 100;

  // 2. 线性回归拟合度 (R²)
  const indices = returns.map((_, i) => i);
  const meanY = returns.reduce((a, b) => a + b, 0) / returns.length;
  const meanX = indices.reduce((a, b) => a + b, 0) / indices.length;

  let ssXY = 0, ssXX = 0, ssYY = 0;
  for (let i = 0; i < returns.length; i++) {
    ssXY += (indices[i] - meanX) * (returns[i] - meanY);
    ssXX += (indices[i] - meanX) ** 2;
    ssYY += (returns[i] - meanY) ** 2;
  }
  const rSquared = ssXX > 0 && ssYY > 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 0;
  const fitScore = rSquared * 100;

  // 3. 连续上涨/下跌天数
  let maxStreak = 0;
  let currentStreak = 0;
  for (const r of returns) {
    if (r > 0) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
    else currentStreak = 0;
  }
  const streakScore = Math.min(100, (maxStreak / returns.length) * 200);

  // 综合评分（加权）
  return directionScore * 0.4 + fitScore * 0.35 + streakScore * 0.25;
}

// ============================================================
// 头肩形态识别
// ============================================================

/**
 * 头肩形态识别（简化版）
 * @param nav 净值序列
 * @param lookback 回看天数
 * @returns 头肩顶/底形态信息
 */
export function headAndShoulders(
  nav: NavSeries,
  lookback: number = 90
): {
  type: 'head_and_shoulders_top' | 'head_and_shoulders_bottom' | 'none';
  leftShoulder: { index: number; value: number } | null;
  head: { index: number; value: number } | null;
  rightShoulder: { index: number; value: number } | null;
  neckline: number | null;
  confidence: number;
} {
  const noResult = {
    type: 'none' as const,
    leftShoulder: null,
    head: null,
    rightShoulder: null,
    neckline: null,
    confidence: 0,
  };

  if (nav.length < lookback) return noResult;
  const window = nav.slice(-lookback);

  // 寻找局部极值
  const peaks: { index: number; value: number }[] = [];
  const troughs: { index: number; value: number }[] = [];

  for (let i = 3; i < window.length - 3; i++) {
    const isPeak = window[i] > window[i - 1] && window[i] > window[i + 1] &&
      window[i] > window[i - 2] && window[i] > window[i + 2] &&
      window[i] > window[i - 3] && window[i] > window[i + 3];
    const isTrough = window[i] < window[i - 1] && window[i] < window[i + 1] &&
      window[i] < window[i - 2] && window[i] < window[i + 2] &&
      window[i] < window[i - 3] && window[i] < window[i + 3];

    if (isPeak) peaks.push({ index: i, value: window[i] });
    if (isTrough) troughs.push({ index: i, value: window[i] });
  }

  // 检查头肩顶：三个峰，中间最高，两侧相近
  if (peaks.length >= 3) {
    for (let i = 0; i < peaks.length - 2; i++) {
      const left = peaks[i];
      const head = peaks[i + 1];
      const right = peaks[i + 2];

      // 头部必须高于两肩
      if (head.value <= left.value || head.value <= right.value) continue;

      // 两肩高度相近（容差5%）
      const shoulderDiff = Math.abs(left.value - right.value) / left.value;
      if (shoulderDiff > 0.05) continue;

      // 头部高于肩部至少3%
      const headPremium = (head.value - (left.value + right.value) / 2) / ((left.value + right.value) / 2);
      if (headPremium < 0.03) continue;

      // 颈线 = 两肩之间的最低点
      const between = window.slice(left.index, right.index + 1);
      const neckline = Math.min(...between);

      const confidence = Math.min(1, (1 - shoulderDiff / 0.05) * 0.5 + Math.min(headPremium / 0.1, 1) * 0.5);

      return {
        type: 'head_and_shoulders_top',
        leftShoulder: { index: nav.length - lookback + left.index, value: left.value },
        head: { index: nav.length - lookback + head.index, value: head.value },
        rightShoulder: { index: nav.length - lookback + right.index, value: right.value },
        neckline,
        confidence,
      };
    }
  }

  // 检查头肩底（反转头肩）
  if (troughs.length >= 3) {
    for (let i = 0; i < troughs.length - 2; i++) {
      const left = troughs[i];
      const head = troughs[i + 1];
      const right = troughs[i + 2];

      if (head.value >= left.value || head.value >= right.value) continue;

      const shoulderDiff = Math.abs(left.value - right.value) / left.value;
      if (shoulderDiff > 0.05) continue;

      const headDiscount = ((left.value + right.value) / 2 - head.value) / ((left.value + right.value) / 2);
      if (headDiscount < 0.03) continue;

      const between = window.slice(left.index, right.index + 1);
      const neckline = Math.max(...between);

      const confidence = Math.min(1, (1 - shoulderDiff / 0.05) * 0.5 + Math.min(headDiscount / 0.1, 1) * 0.5);

      return {
        type: 'head_and_shoulders_bottom',
        leftShoulder: { index: nav.length - lookback + left.index, value: left.value },
        head: { index: nav.length - lookback + head.index, value: head.value },
        rightShoulder: { index: nav.length - lookback + right.index, value: right.value },
        neckline,
        confidence,
      };
    }
  }

  return noResult;
}
