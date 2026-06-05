/**
 * 技术指标模块 - 趋势、动量、震荡、通道类指标
 * 基于 technicalindicators 库，所有函数接收净值序列作为输入
 */

import {
  SMA as TI_SMA,
  EMA as TI_EMA,
  WMA as TI_WMA,
  MACD as TI_MACD,
  RSI as TI_RSI,
  Stochastic as TI_Stochastic,
  BollingerBands as TI_BB,
  ADX as TI_ADX,
  CCI as TI_CCI,
  ROC as TI_ROC,
  WilliamsR as TI_WR,
  StochasticRSI as TI_StochRSI,
  ATR as TI_ATR,
  PSAR as TI_SAR,
  VWAP as TI_VWAP,
} from 'technicalindicators';

import {
  NavSeries,
  MAResult,
  MACDResult,
  BollingerResult,
  ChannelResult,
  RSIResult,
  KDJResult,
  ADXResult,
  SARResult,
  MACrossSignal,
  MAAlignmentResult,
} from './types';

// ============================================================
// 辅助函数
// ============================================================

/** 将净值序列转为 high/low/close 格式（基金净值没有日内高低，三者相同） */
function navToHLC(nav: NavSeries) {
  return nav.map((v) => ({ high: v, low: v, close: v }));
}

/** 对齐数组长度：前补 null 使其与输入等长 */
function padLeft(arr: (number | undefined)[], totalLen: number): (number | null)[] {
  const padLen = totalLen - arr.length;
  const result: (number | null)[] = new Array(padLen).fill(null);
  for (const v of arr) {
    result.push(v ?? null);
  }
  return result;
}

/** 安全取数组最后一个非 null 值 */
function lastNonNull(arr: (number | null | undefined)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i]!;
  }
  return null;
}

// ============================================================
// 移动均线
// ============================================================

/** 简单移动平均线 (SMA) */
export function sma(nav: NavSeries, period: number): MAResult {
  const raw = TI_SMA.calculate({ values: nav, period });
  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

/** 指数移动平均线 (EMA) */
export function ema(nav: NavSeries, period: number): MAResult {
  const raw = TI_EMA.calculate({ values: nav, period });
  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period, type: 'EMA' };
}

/** 加权移动平均线 (WMA) */
export function wma(nav: NavSeries, period: number): MAResult {
  const raw = TI_WMA.calculate({ values: nav, period });
  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period, type: 'WMA' };
}

/** 双重指数移动平均线 (DEMA) */
export function dema(nav: NavSeries, period: number): MAResult {
  // DEMA = 2*EMA - EMA(EMA)
  const ema1 = TI_EMA.calculate({ values: nav, period });
  const ema1Padded = padLeft(ema1, nav.length);

  // 取非null部分做第二次EMA
  const ema1Values = ema1.filter((v): v is number => v !== undefined);
  const ema2 = TI_EMA.calculate({ values: ema1Values, period });

  const values: (number | null)[] = new Array(nav.length).fill(null);
  const offset = nav.length - ema1Values.length;
  for (let i = 0; i < ema2.length; i++) {
    const idx = offset + i;
    if (idx < nav.length && ema2[i] != null && ema1Padded[idx] != null) {
      values[idx] = 2 * ema1Padded[idx]! - ema2[i]!;
    }
  }
  return { values, current: lastNonNull(values), period, type: 'DEMA' };
}

/** 三重指数移动平均线 (TEMA) */
export function tema(nav: NavSeries, period: number): MAResult {
  const ema1Raw = TI_EMA.calculate({ values: nav, period });
  const ema1Vals = ema1Raw.filter((v): v is number => v !== undefined);
  const ema2Raw = TI_EMA.calculate({ values: ema1Vals, period });
  const ema2Vals = ema2Raw.filter((v): v is number => v !== undefined);
  const ema3Raw = TI_EMA.calculate({ values: ema2Vals, period });

  // 将三层 EMA 全部填充到与 nav 等长
  const ema1Padded = padLeft(ema1Raw, nav.length);
  // ema2 的起始位置相对 ema1 又偏移了一截
  const offset2 = nav.length - ema1Vals.length;
  const ema2Full: (number | null)[] = new Array(nav.length).fill(null);
  for (let i = 0; i < ema2Raw.length; i++) {
    const idx = offset2 + i;
    if (idx < nav.length) ema2Full[idx] = ema2Raw[i] ?? null;
  }
  // ema3 的起始位置相对 ema2 又偏移了一截
  const offset3 = offset2 + (ema1Vals.length - ema2Vals.length);
  const ema3Full: (number | null)[] = new Array(nav.length).fill(null);
  for (let i = 0; i < ema3Raw.length; i++) {
    const idx = offset3 + i;
    if (idx < nav.length) ema3Full[idx] = ema3Raw[i] ?? null;
  }

  // TEMA = 3*EMA1 - 3*EMA2 + EMA3
  const values: (number | null)[] = new Array(nav.length).fill(null);
  for (let i = 0; i < nav.length; i++) {
    const v1 = ema1Padded[i];
    const v2 = ema2Full[i];
    const v3 = ema3Full[i];
    if (v1 != null && v2 != null && v3 != null) {
      values[i] = 3 * v1 - 3 * v2 + v3;
    }
  }
  return { values, current: lastNonNull(values), period, type: 'TEMA' };
}

/** 考夫曼自适应均线 (KAMA) - 手动实现 */
export function kama(nav: NavSeries, period: number = 10, fast: number = 2, slow: number = 30): MAResult {
  const fastSC = 2 / (fast + 1);
  const slowSC = 2 / (slow + 1);
  const values: (number | null)[] = new Array(nav.length).fill(null);

  if (nav.length <= period) return { values, current: null, period, type: 'KAMA' };

  values[period] = nav[period];

  for (let i = period + 1; i < nav.length; i++) {
    // direction: 当前值与period前的值的绝对差
    const direction = Math.abs(nav[i] - nav[i - period]);
    // volatility: period内相邻差值绝对值之和
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) {
      volatility += Math.abs(nav[j] - nav[j - 1]);
    }
    // efficiency ratio
    const er = volatility === 0 ? 0 : direction / volatility;
    // smoothing constant
    const sc = Math.pow(er * (fastSC - slowSC) + slowSC, 2);
    // KAMA
    const prevKama = values[i - 1]!;
    values[i] = prevKama + sc * (nav[i] - prevKama);
  }

  return { values, current: lastNonNull(values), period, type: 'KAMA' };
}

// ============================================================
// MACD
// ============================================================

/**
 * MACD 指标（DIF / DEA / 柱状线）
 * @param nav 净值序列
 * @param fastPeriod 快线周期（默认12）
 * @param slowPeriod 慢线周期（默认26）
 * @param signalPeriod 信号线周期（默认9）
 */
export function macd(
  nav: NavSeries,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const raw = TI_MACD.calculate({
    values: nav,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const dif = padLeft(raw.map((r) => r.MACD), nav.length);
  const dea = padLeft(raw.map((r) => r.signal), nav.length);
  const histogram = padLeft(raw.map((r) => r.histogram), nav.length);

  return {
    dif,
    dea,
    histogram,
    currentDIF: lastNonNull(dif),
    currentDEA: lastNonNull(dea),
    currentHistogram: lastNonNull(histogram),
  };
}

// ============================================================
// RSI
// ============================================================

/** RSI（相对强弱指标） */
export function rsi(nav: NavSeries, period: number = 14): RSIResult {
  const raw = TI_RSI.calculate({ values: nav, period });
  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period };
}

// ============================================================
// KDJ（随机指标，含 J 值）
// ============================================================

/**
 * KDJ 指标
 * @param nav 净值序列
 * @param kPeriod K 周期（默认9）
 * @param kSmooth K 平滑因子（默认3）
 * @param dPeriod D 周期（默认3）
 */
export function kdj(nav: NavSeries, kPeriod: number = 9, kSmooth: number = 3, dPeriod: number = 3): KDJResult {
  const hlc = navToHLC(nav);
  const raw = TI_Stochastic.calculate({
    high: hlc.map((h) => h.high),
    low: hlc.map((h) => h.low),
    close: hlc.map((h) => h.close),
    period: kPeriod,
    signalPeriod: dPeriod,
  });

  const kArr = padLeft(raw.map((r) => r.k), nav.length);
  const dArr = padLeft(raw.map((r) => r.d), nav.length);

  // J = 3K - 2D
  const jArr: (number | null)[] = kArr.map((kVal, i) => {
    const dVal = dArr[i];
    if (kVal != null && dVal != null) return 3 * kVal - 2 * dVal;
    return null;
  });

  return {
    k: kArr,
    d: dArr,
    j: jArr,
    currentK: lastNonNull(kArr),
    currentD: lastNonNull(dArr),
    currentJ: lastNonNull(jArr),
  };
}

// ============================================================
// 布林带
// ============================================================

/**
 * 布林带 (Bollinger Bands)
 * @param nav 净值序列
 * @param period 均线周期（默认20）
 * @param stdDev 标准差倍数（默认2）
 */
export function bollingerBands(nav: NavSeries, period: number = 20, stdDev: number = 2): BollingerResult {
  const raw = TI_BB.calculate({ values: nav, period, stdDev });

  const middle = padLeft(raw.map((r) => r.middle), nav.length);
  const upper = padLeft(raw.map((r) => r.upper), nav.length);
  const lower = padLeft(raw.map((r) => r.lower), nav.length);

  // 计算带宽和 %B
  const bandwidth: (number | null)[] = [];
  const percentB: (number | null)[] = [];

  for (let i = 0; i < nav.length; i++) {
    const m = middle[i];
    const u = upper[i];
    const l = lower[i];
    if (m != null && u != null && l != null) {
      bandwidth.push((u - l) / m);
      percentB.push(u === l ? 0.5 : (nav[i] - l) / (u - l));
    } else {
      bandwidth.push(null);
      percentB.push(null);
    }
  }

  return { middle, upper, lower, bandwidth, percentB };
}

// ============================================================
// 唐奇安通道 (Donchian Channel)
// ============================================================

/**
 * 唐奇安通道
 * @param nav 净值序列
 * @param period 回看周期（默认20）
 */
export function donchianChannel(nav: NavSeries, period: number = 20): ChannelResult {
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const middle: (number | null)[] = [];

  for (let i = 0; i < nav.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      middle.push(null);
      continue;
    }
    const slice = nav.slice(i - period + 1, i + 1);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    upper.push(high);
    lower.push(low);
    middle.push((high + low) / 2);
  }

  return { upper, lower, middle };
}

// ============================================================
// 肯特纳通道 (Keltner Channel)
// ============================================================

/**
 * 肯特纳通道
 * @param nav 净值序列
 * @param emaPeriod EMA 周期（默认20）
 * @param atrPeriod ATR 周期（默认10）
 * @param multiplier ATR 倍数（默认2）
 */
export function keltnerChannel(
  nav: NavSeries,
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  multiplier: number = 2
): ChannelResult {
  const emaResult = ema(nav, emaPeriod);
  const atrResult = atr(nav, atrPeriod);

  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < nav.length; i++) {
    const e = emaResult.values[i];
    const a = atrResult.values[i];
    if (e != null && a != null) {
      upper.push(e + multiplier * a);
      lower.push(e - multiplier * a);
    } else {
      upper.push(null);
      lower.push(null);
    }
  }

  return { upper, lower, middle: emaResult.values };
}

// ============================================================
// ADX（平均趋向指标）
// ============================================================

/** ADX + DI */
export function adx(nav: NavSeries, period: number = 14): ADXResult {
  const hlc = navToHLC(nav);
  const raw = TI_ADX.calculate({
    high: hlc.map((h) => h.high),
    low: hlc.map((h) => h.low),
    close: hlc.map((h) => h.close),
    period,
  });

  const adxArr = padLeft(raw.map((r) => r.adx), nav.length);
  const plusDI = padLeft(raw.map((r) => r.pdi), nav.length);
  const minusDI = padLeft(raw.map((r) => r.mdi), nav.length);

  return {
    adx: adxArr,
    plusDI,
    minusDI,
    currentADX: lastNonNull(adxArr),
  };
}

// ============================================================
// ATR（平均真实波幅 - 基于净值近似）
// ============================================================

/** ATR 近似值（基金净值无日内高低，用日涨跌幅绝对值近似） */
export function atr(nav: NavSeries, period: number = 14): MAResult {
  const hlc = navToHLC(nav);
  const raw = TI_ATR.calculate({
    high: hlc.map((h) => h.high),
    low: hlc.map((h) => h.low),
    close: hlc.map((h) => h.close),
    period,
  });

  // 由于净值无日内波动，ATR 退化为 EMA(|ΔP|)
  // 这里直接用技术库输出
  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// CCI（商品通道指数）
// ============================================================

/** CCI */
export function cci(nav: NavSeries, period: number = 20): MAResult {
  const hlc = navToHLC(nav);
  const raw = TI_CCI.calculate({
    high: hlc.map((h) => h.high),
    low: hlc.map((h) => h.low),
    close: hlc.map((h) => h.close),
    period,
  });

  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// ROC（变动率）
// ============================================================

/** ROC */
export function roc(nav: NavSeries, period: number = 12): MAResult {
  const raw = TI_ROC.calculate({ values: nav, period });
  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// 动量指标 (Momentum)
// ============================================================

/** 动量指标 = 当前净值 - N日前净值 */
export function momentum(nav: NavSeries, period: number = 10): MAResult {
  const values: (number | null)[] = [];
  for (let i = 0; i < nav.length; i++) {
    if (i < period) {
      values.push(null);
    } else {
      values.push(nav[i] - nav[i - period]);
    }
  }
  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// Williams %R（威廉指标）
// ============================================================

/** Williams %R */
export function williamsR(nav: NavSeries, period: number = 14): MAResult {
  const hlc = navToHLC(nav);
  const raw = TI_WR.calculate({
    high: hlc.map((h) => h.high),
    low: hlc.map((h) => h.low),
    close: hlc.map((h) => h.close),
    period,
  });

  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// Stochastic RSI
// ============================================================

/** 随机 RSI */
export function stochasticRSI(
  nav: NavSeries,
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kPeriod: number = 3,
  dPeriod: number = 3
): KDJResult {
  const raw = TI_StochRSI.calculate({
    values: nav,
    rsiPeriod,
    stochasticPeriod: stochPeriod,
    kPeriod,
    dPeriod,
  });

  const k = padLeft(raw.map((r) => r.k), nav.length);
  const d = padLeft(raw.map((r) => r.d), nav.length);
  const j: (number | null)[] = k.map((kVal, i) => {
    const dVal = d[i];
    return kVal != null && dVal != null ? 3 * kVal - 2 * dVal : null;
  });

  return { k, d, j, currentK: lastNonNull(k), currentD: lastNonNull(d), currentJ: lastNonNull(j) };
}

// ============================================================
// SAR（抛物线转向）
// ============================================================

/**
 * SAR 抛物线转向
 * @param nav 净值序列
 * @param step 加速因子步长（默认0.02）
 * @param max 最大加速因子（默认0.2）
 */
export function sar(nav: NavSeries, step: number = 0.02, max: number = 0.2): SARResult {
  const hlc = navToHLC(nav);
  const raw = TI_SAR.calculate({
    high: hlc.map((h) => h.high),
    low: hlc.map((h) => h.low),
    step,
    max,
  });

  const values = padLeft(raw, nav.length);
  return { values, current: lastNonNull(values) };
}

// ============================================================
// TRIX（三重平滑指数）
// ============================================================

/** TRIX = 三重 EMA 的变化率 */
export function trix(nav: NavSeries, period: number = 12): MAResult {
  const ema1 = TI_EMA.calculate({ values: nav, period });
  const ema1Vals = ema1.filter((v): v is number => v !== undefined);
  const ema2 = TI_EMA.calculate({ values: ema1Vals, period });
  const ema2Vals = ema2.filter((v): v is number => v !== undefined);
  const ema3 = TI_EMA.calculate({ values: ema2Vals, period });

  const values: (number | null)[] = new Array(nav.length).fill(null);
  const offset = nav.length - ema3.length;

  for (let i = 1; i < ema3.length; i++) {
    const prev = ema3[i - 1];
    const curr = ema3[i];
    if (prev != null && curr != null && prev !== 0) {
      values[offset + i] = ((curr - prev) / prev) * 100;
    }
  }

  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// DPO（去趋势价格震荡器）
// ============================================================

/** DPO = 净值 - N/2+1 日前的 SMA */
export function dpo(nav: NavSeries, period: number = 20): MAResult {
  const smaResult = sma(nav, period);
  const shift = Math.floor(period / 2) + 1;
  const values: (number | null)[] = [];

  for (let i = 0; i < nav.length; i++) {
    const smaIdx = i + shift;
    if (smaIdx < nav.length && smaResult.values[smaIdx] != null) {
      values.push(nav[i] - smaResult.values[smaIdx]!);
    } else {
      values.push(null);
    }
  }

  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// 均线偏离度 (BIAS / 乖离率)
// ============================================================

/** 乖离率 = (净值 - MA) / MA * 100 */
export function bias(nav: NavSeries, period: number = 20): MAResult {
  const maResult = sma(nav, period);
  const values: (number | null)[] = [];

  for (let i = 0; i < nav.length; i++) {
    const m = maResult.values[i];
    if (m != null && m !== 0) {
      values.push(((nav[i] - m) / m) * 100);
    } else {
      values.push(null);
    }
  }

  return { values, current: lastNonNull(values), period, type: 'SMA' };
}

// ============================================================
// 净值百分位
// ============================================================

/**
 * 净值百分位 - 当前净值在历史区间中所处的百分位
 * @param nav 净值序列
 * @param lookback 回看窗口（默认全部历史）
 * @returns 0-100 的百分位值
 */
export function navPercentile(nav: NavSeries, lookback?: number): number {
  const window = lookback ? nav.slice(-lookback) : nav;
  const current = nav[nav.length - 1];
  const sorted = [...window].sort((a, b) => a - b);
  let rank = 0;
  for (const v of sorted) {
    if (v < current) rank++;
    else if (v === current) rank += 0.5;
  }
  return (rank / sorted.length) * 100;
}

// ============================================================
// 均线交叉信号检测
// ============================================================

/** 检测短期均线与长期均线的交叉信号 */
export function detectCrossSignal(
  fastMA: MAResult,
  slowMA: MAResult,
  lookback: number = 5
): MACrossSignal {
  const fVals = fastMA.values;
  const sVals = slowMA.values;
  const len = Math.min(fVals.length, sVals.length);

  for (let i = len - 1; i >= Math.max(1, len - lookback); i--) {
    const fCurr = fVals[i];
    const fPrev = fVals[i - 1];
    const sCurr = sVals[i];
    const sPrev = sVals[i - 1];
    if (fCurr == null || fPrev == null || sCurr == null || sPrev == null) continue;

    // 金叉：快线从下方穿越慢线
    if (fPrev <= sPrev && fCurr > sCurr) {
      return { type: 'golden_cross', index: i, fastValue: fCurr, slowValue: sCurr };
    }
    // 死叉：快线从上方穿越慢线
    if (fPrev >= sPrev && fCurr < sCurr) {
      return { type: 'death_cross', index: i, fastValue: fCurr, slowValue: sCurr };
    }
  }

  return { type: 'none', index: -1, fastValue: 0, slowValue: 0 };
}

// ============================================================
// 均线排列状态
// ============================================================

/**
 * 检测均线多空排列
 * @param maList 从短期到长期排列的均线结果列表
 */
export function detectMAAlignment(maList: MAResult[]): MAAlignmentResult {
  const maValues = maList.map((m) => m.current ?? 0);
  const allValid = maList.every((m) => m.current != null);

  if (!allValid) {
    return { alignment: 'neutral', maValues, divergence: 0 };
  }

  // 多头排列：短期 > 长期（递减）
  let isBullish = true;
  let isBearish = true;
  for (let i = 1; i < maValues.length; i++) {
    if (maValues[i] >= maValues[i - 1]) isBullish = false;
    if (maValues[i] <= maValues[i - 1]) isBearish = false;
  }

  // 计算发散度（标准差）
  const mean = maValues.reduce((a, b) => a + b, 0) / maValues.length;
  const variance = maValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / maValues.length;
  const divergence = Math.sqrt(variance);

  const alignment = isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral';
  return { alignment, maValues, divergence };
}

// ============================================================
// Mass Index（质量指数）
// ============================================================

/**
 * Mass Index - 基于 EMA 的波动范围比率累积，用于识别变盘点
 * @param nav 净值序列
 * @param emaPeriod EMA 周期（默认9）
 * @param sumPeriod 累积周期（默认25）
 */
export function massIndex(nav: NavSeries, emaPeriod: number = 9, sumPeriod: number = 25): MAResult {
  // 由于净值没有 high/low，使用 EMA 的变化幅度近似
  const ema1 = TI_EMA.calculate({ values: nav, period: emaPeriod });
  const ema1Vals = ema1.filter((v): v is number => v !== undefined);
  const ema2 = TI_EMA.calculate({ values: ema1Vals, period: emaPeriod });

  const ratios: number[] = [];
  for (let i = 0; i < ema2.length; i++) {
    const e1 = ema1Vals[i + (ema1Vals.length - ema2.length)];
    const e2 = ema2[i];
    if (e1 != null && e2 != null && e2 !== 0) {
      ratios.push(e1 / e2);
    } else {
      ratios.push(1);
    }
  }

  const values: (number | null)[] = new Array(nav.length).fill(null);
  const offset = nav.length - ratios.length;

  for (let i = sumPeriod - 1; i < ratios.length; i++) {
    let sum = 0;
    for (let j = i - sumPeriod + 1; j <= i; j++) {
      sum += ratios[j];
    }
    values[offset + i] = sum;
  }

  return { values, current: lastNonNull(values), period: sumPeriod, type: 'SMA' };
}
