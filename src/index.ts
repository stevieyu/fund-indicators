/**
 * 基金自动化交易指标计算工具库
 * Fund Automated Trading Indicators Library
 *
 * 基于历史净值数据计算全部技术指标，包括：
 * - 技术指标（均线、MACD、RSI、KDJ、布林带、通道等）
 * - 风险与绩效指标（波动率、回撤、VaR、夏普比率、索提诺等）
 * - 统计特征（偏度、峰度、赫斯特指数、GARCH 等）
 * - 定投分析（模拟定投、IRR、智能定投、止盈止损等）
 * - 形态识别（支撑阻力、双底双顶、头肩形态、缺口等）
 */

// 类型定义
export * from './types';

// ============================================================
// 技术指标（趋势、动量、震荡、通道）
// ============================================================
export {
  // 均线
  sma,
  ema,
  wma,
  dema,
  tema,
  kama,
  // MACD
  macd,
  // 动量/震荡
  rsi,
  kdj,
  roc,
  momentum,
  williamsR,
  stochasticRSI,
  cci,
  trix,
  dpo,
  massIndex,
  // 通道/波动
  bollingerBands,
  donchianChannel,
  keltnerChannel,
  adx,
  atr,
  sar,
  // 衍生指标
  bias,
  navPercentile,
  detectCrossSignal,
  detectMAAlignment,
} from './technical';

// ============================================================
// 风险与绩效指标
// ============================================================
export {
  // 基础转换
  navToReturns,
  annualizeReturn,
  totalReturn,
  // 波动率
  annualizedVolatility,
  downsideVolatility,
  rollingVolatility,
  volatilityCone,
  // 回撤
  maxDrawdown,
  maxDrawdownDuration,
  // VaR / CVaR
  calculateVaR,
  calculateCVaR,
  // 风险汇总
  riskMetrics,
  // 绩效指标
  sharpeRatio,
  sortinoRatio,
  calmarRatio,
  treynorRatio,
  omegaRatio,
  winRate,
  profitLossRatio,
  profitFactor,
  consecutiveWinLoss,
  performanceMetrics,
  // 基准对比
  calculateBeta,
  calculateAlpha,
  trackingError,
  informationRatio,
  benchmarkMetrics,
} from './risk';

// ============================================================
// 统计特征
// ============================================================
export {
  statisticalFeatures,
  navStatisticalFeatures,
  hurstExponent,
  autocorrelation,
  ljungBoxTest,
  returnQuantiles,
  rollingSkewness,
  rollingKurtosis,
  garch11,
} from './statistics';

// ============================================================
// 定投与盈亏分析
// ============================================================
export {
  simulateDCA,
  takeProfitStopLoss,
  trailingStop,
  safetyMargin,
  pricePosition,
  smartDCAMultiplier,
  tieredBuySignal,
  tieredSellSignal,
  positionPnL,
} from './dca';

// ============================================================
// 形态识别
// ============================================================
export {
  supportResistance,
  doubleBottomTop,
  detectGaps,
  trendStrength,
  headAndShoulders,
} from './pattern';
