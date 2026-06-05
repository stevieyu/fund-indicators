/**
 * 基金自动化交易指标计算工具库 - 类型定义
 * Fund Automated Trading Indicators Library - Type Definitions
 */

// ============================================================
// 基础类型
// ============================================================

/** 净值序列（按时间顺序排列的每日净值） */
export type NavSeries = number[];

/** 收益率序列（百分比形式，如 0.02 表示 +2%） */
export type ReturnSeries = number[];

/** 日期数组（与净值序列一一对应） */
export type DateSeries = string[];

// ============================================================
// 技术指标结果类型
// ============================================================

/** 均线结果 */
export interface MAResult {
  /** 均线数值数组（与输入等长，前 N-1 个为 null） */
  values: (number | null)[];
  /** 当前（最后一个）均线值 */
  current: number | null;
  /** 使用的周期 */
  period: number;
  /** 均线类型 */
  type: 'SMA' | 'EMA' | 'WMA' | 'DEMA' | 'TEMA' | 'TRIMA' | 'KAMA';
}

/** MACD 结果 */
export interface MACDResult {
  /** DIF 线（快线） */
  dif: (number | null)[];
  /** DEA 线（慢线） */
  dea: (number | null)[];
  /** 柱状线（MACD柱 = DIF - DEA） */
  histogram: (number | null)[];
  /** 当前 DIF */
  currentDIF: number | null;
  /** 当前 DEA */
  currentDEA: number | null;
  /** 当前柱状值 */
  currentHistogram: number | null;
}

/** 布林带结果 */
export interface BollingerResult {
  /** 中轨（移动均线） */
  middle: (number | null)[];
  /** 上轨 */
  upper: (number | null)[];
  /** 下轨 */
  lower: (number | null)[];
  /** 带宽百分比 */
  bandwidth: (number | null)[];
  /** %B 指标（价格在带中的位置，0=下轨，1=上轨） */
  percentB: (number | null)[];
}

/** 通道结果（唐奇安、肯特纳） */
export interface ChannelResult {
  upper: (number | null)[];
  lower: (number | null)[];
  middle: (number | null)[];
}

/** RSI 结果 */
export interface RSIResult {
  values: (number | null)[];
  current: number | null;
  period: number;
}

/** KDJ 结果 */
export interface KDJResult {
  k: (number | null)[];
  d: (number | null)[];
  j: (number | null)[];
  currentK: number | null;
  currentD: number | null;
  currentJ: number | null;
}

/** ADX 结果 */
export interface ADXResult {
  adx: (number | null)[];
  plusDI: (number | null)[];
  minusDI: (number | null)[];
  currentADX: number | null;
}

/** SAR 结果 */
export interface SARResult {
  values: (number | null)[];
  current: number | null;
}

// ============================================================
// 风险与绩效指标类型
// ============================================================

/** 回撤分析结果 */
export interface DrawdownResult {
  /** 最大回撤（负数，如 -0.25 表示 -25%） */
  maxDrawdown: number;
  /** 最大回撤开始时的净值索引 */
  peakIndex: number;
  /** 最大回撤谷底时的净值索引 */
  troughIndex: number;
  /** 回撤开始日期（如有日期序列） */
  peakDate: string | null;
  /** 回撤谷底日期 */
  troughDate: string | null;
  /** 回撤恢复日期（如已恢复） */
  recoveryDate: string | null;
  /** 回撤持续天数 */
  durationDays: number;
  /** 恢复天数（从谷底到恢复前高） */
  recoveryDays: number | null;
  /** 完整回撤序列 */
  drawdownSeries: number[];
}

/** 风险指标汇总 */
export interface RiskMetrics {
  /** 年化波动率 */
  annualizedVolatility: number;
  /** 下行波动率（年化） */
  downsideVolatility: number;
  /** 最大回撤 */
  maxDrawdown: number;
  /** 最大回撤持续天数 */
  maxDrawdownDuration: number;
  /** VaR（在险价值） */
  var95: number;
  var99: number;
  /** CVaR（条件在险价值 / 预期亏损） */
  cvar95: number;
  cvar99: number;
}

/** 绩效指标汇总 */
export interface PerformanceMetrics {
  /** 累计收益率 */
  totalReturn: number;
  /** 年化收益率 */
  annualizedReturn: number;
  /** 夏普比率 */
  sharpeRatio: number;
  /** 索提诺比率 */
  sortinoRatio: number;
  /** 卡尔玛比率 */
  calmarRatio: number;
  /** 特雷诺比率（需要 Beta） */
  treynorRatio: number | null;
  /** Omega 比率 */
  omegaRatio: number;
  /** 胜率 */
  winRate: number;
  /** 盈亏比 */
  profitLossRatio: number;
  /** 利润因子 */
  profitFactor: number;
  /** 最大连续盈利天数 */
  maxConsecutiveWins: number;
  /** 最大连续亏损天数 */
  maxConsecutiveLosses: number;
}

/** 相对基准指标 */
export interface BenchmarkMetrics {
  /** Alpha（超额收益） */
  alpha: number;
  /** Beta 系数 */
  beta: number;
  /** 跟踪误差 */
  trackingError: number;
  /** 信息比率 */
  informationRatio: number;
  /** 相关系数 */
  correlation: number;
  /** R 方（拟合优度） */
  rSquared: number;
}

// ============================================================
// 定投相关类型
// ============================================================

/** 定投计划配置 */
export interface DCAConfig {
  /** 每次定投金额 */
  amount: number;
  /** 定投周期（天数），默认 1（每个交易日） */
  interval?: number;
  /** 起始索引 */
  startIndex?: number;
}

/** 定投分析结果 */
export interface DCAResult {
  /** 定投次数 */
  totalInvestments: number;
  /** 总投入金额 */
  totalInvested: number;
  /** 当前持仓市值 */
  currentValue: number;
  /** 持仓份额 */
  totalShares: number;
  /** 平均成本 */
  averageCost: number;
  /** 当前净值 */
  currentNav: number;
  /** 收益率 */
  returnRate: number;
  /** 盈亏金额 */
  profitLoss: number;
  /** 内部收益率 IRR（年化） */
  irr: number | null;
  /** 定投日收益率序列 */
  investmentDates: number[];
  /** 每期投入后的市值 */
  valueHistory: number[];
}

/** 止盈止损信号 */
export interface TakeProfitStopLossSignal {
  /** 是否触发止盈 */
  takeProfitTriggered: boolean;
  /** 是否触发止损 */
  stopLossTriggered: boolean;
  /** 当前盈亏比例 */
  currentPnL: number;
  /** 距离止盈线的百分比 */
  distanceToTakeProfit: number;
  /** 距离止损线的百分比 */
  distanceToStopLoss: number;
}

// ============================================================
// 统计特征类型
// ============================================================

/** 统计特征汇总 */
export interface StatisticalFeatures {
  /** 均值 */
  mean: number;
  /** 中位数 */
  median: number;
  /** 标准差 */
  stdDev: number;
  /** 偏度 */
  skewness: number;
  /** 峰度 */
  kurtosis: number;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 极差 */
  range: number;
  /** 变异系数 */
  coefficientOfVariation: number;
  /** Jarque-Bera 检验统计量 */
  jarqueBera: number;
}

/** 赫斯特指数结果 */
export interface HurstResult {
  /** 赫斯特指数值（>0.5 趋势性，<0.5 均值回归，≈0.5 随机） */
  hurstExponent: number;
  /** 判断结果 */
  interpretation: 'trending' | 'mean_reverting' | 'random_walk';
  /** R/S 分析中的 log(n) 与 log(R/S) 数据点 */
  dataPoints: { logN: number; logRS: number }[];
  /** 线性回归 R² */
  rSquared: number;
}

/** 自相关结果 */
export interface AutocorrelationResult {
  /** 各滞后期的自相关系数 */
  coefficients: number[];
  /** 最大滞后阶数 */
  maxLag: number;
  /** 趋势持续性判断 */
  interpretation: 'persistent' | 'anti_persistent' | 'no_correlation';
}

// ============================================================
// 形态识别类型
// ============================================================

/** 支撑/阻力位 */
export interface SupportResistanceResult {
  /** 支撑位（从强到弱排序） */
  supports: { level: number; strength: number; touches: number }[];
  /** 阻力位（从强到弱排序） */
  resistances: { level: number; strength: number; touches: number }[];
}

/** 双底/双顶信号 */
export interface DoubleBottomTopResult {
  /** 信号类型 */
  type: 'double_bottom' | 'double_top' | 'none';
  /** 第一个底/顶的索引 */
  firstPointIndex: number | null;
  /** 第二个底/顶的索引 */
  secondPointIndex: number | null;
  /** 颈线位置索引 */
  necklineIndex: number | null;
  /** 颈线价格 */
  necklinePrice: number | null;
  /** 是否突破颈线 */
  breakout: boolean;
  /** 信号强度（0-1） */
  confidence: number;
}

/** 缺口 */
export interface GapResult {
  /** 缺口类型 */
  type: 'gap_up' | 'gap_down';
  /** 缺口起始索引 */
  startIndex: number;
  /** 缺口结束索引 */
  endIndex: number;
  /** 缺口上沿 */
  gapTop: number;
  /** 缺口下沿 */
  gapBottom: number;
  /** 缺口大小（百分比） */
  gapSize: number;
  /** 是否已回补 */
  filled: boolean;
  /** 回补日期索引 */
  filledIndex: number | null;
}

// ============================================================
// 均线系统信号类型
// ============================================================

/** 均线交叉信号 */
export interface MACrossSignal {
  /** 信号类型 */
  type: 'golden_cross' | 'death_cross' | 'none';
  /** 发生位置索引 */
  index: number;
  /** 快线值 */
  fastValue: number;
  /** 慢线值 */
  slowValue: number;
}

/** 均线排列状态 */
export interface MAAlignmentResult {
  /** 排列状态 */
  alignment: 'bullish' | 'bearish' | 'neutral';
  /** 均线值（从短期到长期） */
  maValues: number[];
  /** 发散度（标准差） */
  divergence: number;
}
