/**
 * 定投与盈亏分析模块
 * 包含：定投模拟、平均成本、IRR 计算、止盈止损信号、安全边际等
 */

import { NavSeries, DateSeries, DCAConfig, DCAResult, TakeProfitStopLossSignal } from './types';

// ============================================================
// 定投模拟
// ============================================================

/**
 * 定投策略模拟
 * @param nav 净值序列
 * @param config 定投配置
 * @param dates 可选日期序列
 */
export function simulateDCA(nav: NavSeries, config: DCAConfig, dates?: DateSeries): DCAResult {
  const { amount, interval = 1, startIndex = 0 } = config;

  let totalInvested = 0;
  let totalShares = 0;
  const investmentDates: number[] = [];
  const valueHistory: number[] = [];

  for (let i = startIndex; i < nav.length; i += interval) {
    const navPrice = nav[i];
    if (navPrice <= 0) continue;

    const shares = amount / navPrice;
    totalShares += shares;
    totalInvested += amount;
    investmentDates.push(i);

    // 当前持仓市值
    const currentValue = totalShares * navPrice;
    valueHistory.push(currentValue);
  }

  if (totalInvested === 0 || totalShares === 0) {
    return {
      totalInvestments: 0,
      totalInvested: 0,
      currentValue: 0,
      totalShares: 0,
      averageCost: 0,
      currentNav: 0,
      returnRate: 0,
      profitLoss: 0,
      irr: null,
      investmentDates,
      valueHistory,
    };
  }

  const currentNav = nav[nav.length - 1];
  const currentValue = totalShares * currentNav;
  const averageCost = totalInvested / totalShares;
  const returnRate = (currentValue - totalInvested) / totalInvested;
  const profitLoss = currentValue - totalInvested;

  // 计算 IRR
  const irr = calculateIRR(nav, investmentDates, amount, totalShares, currentNav);

  return {
    totalInvestments: investmentDates.length,
    totalInvested,
    currentValue,
    totalShares,
    averageCost,
    currentNav,
    returnRate,
    profitLoss,
    irr,
    investmentDates,
    valueHistory,
  };
}

// ============================================================
// IRR 计算（内部收益率）
// ============================================================

/**
 * 计算定投的内部收益率 (IRR)
 * 使用牛顿迭代法求解
 */
function calculateIRR(
  nav: NavSeries,
  investmentDates: number[],
  amount: number,
  totalShares: number,
  currentNav: number
): number | null {
  if (investmentDates.length < 2) return null;

  // 构建现金流：每次定投为负现金流，最后赎回为正现金流
  // 以第一个定投日为基准日 (day 0)
  const baseDay = investmentDates[0];
  const cashFlows: { day: number; amount: number }[] = [];

  for (const d of investmentDates) {
    cashFlows.push({ day: d - baseDay, amount: -amount });
  }
  // 最终赎回（假设全部赎回）
  const lastDay = nav.length - 1 - baseDay;
  cashFlows.push({ day: lastDay, amount: totalShares * currentNav });

  // NPV 函数：NPV(r) = Σ CFi / (1+r)^(ti/T)
  // T = 一年的交易日数
  const T = 242;

  function npv(r: number): number {
    let sum = 0;
    for (const cf of cashFlows) {
      const t = cf.day / T;
      if (t === 0) sum += cf.amount;
      else sum += cf.amount / Math.pow(1 + r, t);
    }
    return sum;
  }

  // NPV 的导数
  function npvDerivative(r: number): number {
    let sum = 0;
    for (const cf of cashFlows) {
      const t = cf.day / T;
      if (t <= 0) continue;
      sum -= (t * cf.amount) / Math.pow(1 + r, t + 1);
    }
    return sum;
  }

  // 牛顿迭代法求 IRR
  let r = 0.1; // 初始猜测 10%
  const maxIterations = 100;
  const tolerance = 1e-8;

  for (let i = 0; i < maxIterations; i++) {
    const f = npv(r);
    const fPrime = npvDerivative(r);

    if (Math.abs(fPrime) < 1e-12) break;

    const newR = r - f / fPrime;

    if (Math.abs(newR - r) < tolerance) {
      return newR;
    }

    r = newR;

    // 防止发散
    if (r < -0.99) r = -0.99;
    if (r > 10) r = 10;
  }

  // 如果牛顿法不收敛，尝试二分法
  return bisectionIRR(npv);
}

/** 二分法求 IRR（备用） */
function bisectionIRR(npv: (r: number) => number): number | null {
  let low = -0.99;
  let high = 10;
  const tolerance = 1e-6;
  const maxIterations = 200;

  let fLow = npv(low);
  let fHigh = npv(high);

  // 检查是否有根
  if (fLow * fHigh > 0) return null;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);

    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid;
    }

    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return (low + high) / 2;
}

// ============================================================
// 止盈止损信号
// ============================================================

/**
 * 止盈止损信号检测
 * @param nav 净值序列
 * @param costPrice 持仓成本价
 * @param takeProfitThreshold 止盈阈值（如 0.30 = 盈利 30% 止盈）
 * @param stopLossThreshold 止损阈值（如 -0.15 = 亏损 15% 止损）
 */
export function takeProfitStopLoss(
  nav: NavSeries,
  costPrice: number,
  takeProfitThreshold: number = 0.3,
  stopLossThreshold: number = -0.15
): TakeProfitStopLossSignal {
  const currentNav = nav[nav.length - 1];
  const currentPnL = (currentNav - costPrice) / costPrice;

  return {
    takeProfitTriggered: currentPnL >= takeProfitThreshold,
    stopLossTriggered: currentPnL <= stopLossThreshold,
    currentPnL,
    distanceToTakeProfit: takeProfitThreshold - currentPnL,
    distanceToStopLoss: currentPnL - stopLossThreshold,
  };
}

/**
 * 动态止盈止损（跟踪止盈）
 * 当净值创新高后回撤一定比例时触发止盈
 * @param nav 净值序列
 * @param trailPercent 跟踪止盈比例（如 0.10 = 从最高点回撤 10% 触发）
 * @param costPrice 持仓成本价
 */
export function trailingStop(
  nav: NavSeries,
  trailPercent: number = 0.1,
  costPrice?: number
): {
  triggered: boolean;
  peakNav: number;
  currentNav: number;
  drawdownFromPeak: number;
  profitFromCost: number;
} {
  let peakNav = nav[0];
  for (const v of nav) {
    if (v > peakNav) peakNav = v;
  }

  const currentNav = nav[nav.length - 1];
  const drawdownFromPeak = (peakNav - currentNav) / peakNav;
  const profitFromCost = costPrice ? (currentNav - costPrice) / costPrice : 0;

  return {
    triggered: drawdownFromPeak >= trailPercent && currentNav > (costPrice ?? 0),
    peakNav,
    currentNav,
    drawdownFromPeak,
    profitFromCost,
  };
}

// ============================================================
// 安全边际与估值分析
// ============================================================

/**
 * 安全边际 - 当前净值相对历史最高点的回撤幅度
 * @param nav 净值序列
 * @returns 回撤比例（0-1，如 0.25 = 回撤 25%）
 */
export function safetyMargin(nav: NavSeries): number {
  const peak = Math.max(...nav);
  const current = nav[nav.length - 1];
  return (peak - current) / peak;
}

/**
 * 当前净值相对历史最高点和最低点的位置
 * @param nav 净值序列
 * @returns 0-1 之间的位置值（0 = 历史最低，1 = 历史最高）
 */
export function pricePosition(nav: NavSeries): number {
  const peak = Math.max(...nav);
  const trough = Math.min(...nav);
  const current = nav[nav.length - 1];
  if (peak === trough) return 0.5;
  return (current - trough) / (peak - trough);
}

/**
 * 智能定投调整系数
 * 根据当前净值相对均线的位置，调整定投金额
 * @param nav 净值序列
 * @param maPeriod 参考均线周期（默认 250 日）
 * @param maxMultiplier 最大倍数（默认 2.0）
 * @param minMultiplier 最小倍数（默认 0.5）
 * @returns 定投调整倍数（1.0 = 标准金额）
 */
export function smartDCAMultiplier(
  nav: NavSeries,
  maPeriod: number = 250,
  maxMultiplier: number = 2.0,
  minMultiplier: number = 0.5
): number {
  if (nav.length < maPeriod) return 1.0;

  const recent = nav.slice(-maPeriod);
  const ma = recent.reduce((a, b) => a + b, 0) / maPeriod;
  const current = nav[nav.length - 1];
  const deviation = (current - ma) / ma; // 正数=高于均线，负数=低于均线

  // 低于均线时增加定投，高于均线时减少
  // deviation = -0.2 → multiplier = 1.4
  // deviation = +0.2 → multiplier = 0.6
  const multiplier = 1.0 - deviation * 4;

  return Math.max(minMultiplier, Math.min(maxMultiplier, multiplier));
}

// ============================================================
// 分批建仓/减仓策略
// ============================================================

/**
 * 分批建仓信号
 * 当净值跌到历史分位以下时分批买入
 * @param nav 净值序列
 * @param levels 分批买入的分位阈值列表（如 [0.3, 0.2, 0.1] = 30%、20%、10%分位各买一次）
 * @returns 当前触发的买入层级（0 = 不触发，1 = 第一层，2 = 第二层...）
 */
export function tieredBuySignal(nav: NavSeries, levels: number[] = [0.3, 0.2, 0.1]): number {
  const sorted = [...nav].sort((a, b) => a - b);
  const current = nav[nav.length - 1];

  // 计算当前净值的分位
  let rank = 0;
  for (const v of sorted) {
    if (v < current) rank++;
    else if (v === current) rank += 0.5;
  }
  const percentile = rank / sorted.length;

  // 从最激进到最保守检查
  for (let i = 0; i < levels.length; i++) {
    if (percentile <= levels[i]) return levels.length - i;
  }
  return 0;
}

/**
 * 分批止盈信号
 * 当净值涨到历史分位以上时分批卖出
 * @param nav 净值序列
 * @param levels 分批卖出的分位阈值列表（如 [0.7, 0.8, 0.9] = 70%、80%、90%分位各卖一次）
 * @returns 当前触发的卖出层级
 */
export function tieredSellSignal(nav: NavSeries, levels: number[] = [0.7, 0.8, 0.9]): number {
  const sorted = [...nav].sort((a, b) => a - b);
  const current = nav[nav.length - 1];

  let rank = 0;
  for (const v of sorted) {
    if (v < current) rank++;
    else if (v === current) rank += 0.5;
  }
  const percentile = rank / sorted.length;

  for (let i = levels.length - 1; i >= 0; i--) {
    if (percentile >= levels[i]) return i + 1;
  }
  return 0;
}

// ============================================================
// 回测辅助
// ============================================================

/**
 * 计算一段持仓的收益明细
 * @param nav 净值序列
 * @param buyIndex 买入日索引
 * @param sellIndex 卖出日索引（默认到最后一天）
 * @param amount 投入金额
 */
export function positionPnL(
  nav: NavSeries,
  buyIndex: number,
  sellIndex?: number,
  amount: number = 10000
): {
  buyNav: number;
  sellNav: number;
  shares: number;
  cost: number;
  value: number;
  pnl: number;
  returnRate: number;
  holdDays: number;
  annualizedReturn: number;
} {
  const sell = sellIndex ?? nav.length - 1;
  const buyNav = nav[buyIndex];
  const sellNav = nav[sell];
  const shares = amount / buyNav;
  const value = shares * sellNav;
  const pnl = value - amount;
  const returnRate = pnl / amount;
  const holdDays = sell - buyIndex;
  const annualizedReturn = holdDays > 0 ? Math.pow(1 + returnRate, 242 / holdDays) - 1 : 0;

  return {
    buyNav,
    sellNav,
    shares,
    cost: amount,
    value,
    pnl,
    returnRate,
    holdDays,
    annualizedReturn,
  };
}
