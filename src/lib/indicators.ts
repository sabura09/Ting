// =============================================================================
// Technical Indicators — Pure TypeScript calculations
// =============================================================================

import type { OHLCVBar } from './market-data';

// =============================================================================
// Moving Averages
// =============================================================================

export function calculateSMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            const slice = data.slice(i - period + 1, i + 1);
            result.push(slice.reduce((a, b) => a + b, 0) / period);
        }
    }
    return result;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
    const result: (number | null)[] = [];
    const multiplier = 2 / (period + 1);

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else if (i === period - 1) {
            // First EMA = SMA
            const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
            result.push(sma);
        } else {
            const prev = result[i - 1]!;
            result.push((data[i] - prev) * multiplier + prev);
        }
    }
    return result;
}

// =============================================================================
// RSI (Relative Strength Index)
// =============================================================================

export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
    const result: (number | null)[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i === 0) {
            result.push(null);
            continue;
        }

        const change = data[i] - data[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);

        if (i < period) {
            result.push(null);
        } else if (i === period) {
            const avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
            const avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
            if (avgLoss === 0) {
                result.push(100);
            } else {
                const rs = avgGain / avgLoss;
                result.push(100 - (100 / (1 + rs)));
            }
        } else {
            const prevRSI = result[i - 1];
            if (prevRSI === null) {
                result.push(null);
                continue;
            }
            const prevAvgGain = gains.slice(gains.length - period - 1, gains.length - 1).reduce((a, b) => a + b, 0) / period;
            const prevAvgLoss = losses.slice(losses.length - period - 1, losses.length - 1).reduce((a, b) => a + b, 0) / period;

            const currentGain = gains[gains.length - 1];
            const currentLoss = losses[losses.length - 1];

            const avgGain = (prevAvgGain * (period - 1) + currentGain) / period;
            const avgLoss = (prevAvgLoss * (period - 1) + currentLoss) / period;

            if (avgLoss === 0) {
                result.push(100);
            } else {
                const rs = avgGain / avgLoss;
                result.push(100 - (100 / (1 + rs)));
            }
        }
    }
    return result;
}

// =============================================================================
// MACD (Moving Average Convergence Divergence)
// =============================================================================

export interface MACDResult {
    macd: (number | null)[];
    signal: (number | null)[];
    histogram: (number | null)[];
}

export function calculateMACD(
    data: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
): MACDResult {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);

    const macdLine: (number | null)[] = fastEMA.map((f, i) => {
        const s = slowEMA[i];
        if (f === null || s === null) return null;
        return f - s;
    });

    const validMACD = macdLine.filter((v): v is number => v !== null);
    const signalEMA = calculateEMA(validMACD, signalPeriod);

    // Align signal line with MACD line
    const signal: (number | null)[] = [];
    let signalIdx = 0;
    for (let i = 0; i < macdLine.length; i++) {
        if (macdLine[i] === null) {
            signal.push(null);
        } else {
            signal.push(signalEMA[signalIdx] ?? null);
            signalIdx++;
        }
    }

    const histogram: (number | null)[] = macdLine.map((m, i) => {
        const s = signal[i];
        if (m === null || s === null) return null;
        return m - s;
    });

    return { macd: macdLine, signal, histogram };
}

// =============================================================================
// Bollinger Bands
// =============================================================================

export interface BollingerResult {
    upper: (number | null)[];
    middle: (number | null)[];
    lower: (number | null)[];
}

export function calculateBollingerBands(
    data: number[],
    period: number = 20,
    stdDevMultiplier: number = 2
): BollingerResult {
    const sma = calculateSMA(data, period);
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1 || sma[i] === null) {
            upper.push(null);
            lower.push(null);
        } else {
            const slice = data.slice(i - period + 1, i + 1);
            const mean = sma[i]!;
            const variance = slice.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
            const stdDev = Math.sqrt(variance);
            upper.push(mean + stdDevMultiplier * stdDev);
            lower.push(mean - stdDevMultiplier * stdDev);
        }
    }

    return { upper, middle: sma, lower };
}

// =============================================================================
// Stochastic RSI
// =============================================================================

export interface StochRSIResult {
    k: (number | null)[];
    d: (number | null)[];
}

export function calculateStochasticRSI(
    data: number[],
    rsiPeriod: number = 14,
    stochPeriod: number = 14,
    kSmooth: number = 3,
    dSmooth: number = 3
): StochRSIResult {
    const rsi = calculateRSI(data, rsiPeriod);
    const validRSI = rsi.filter((v): v is number => v !== null);

    const stochK: (number | null)[] = [];

    for (let i = 0; i < validRSI.length; i++) {
        if (i < stochPeriod - 1) {
            stochK.push(null);
        } else {
            const slice = validRSI.slice(i - stochPeriod + 1, i + 1);
            const min = Math.min(...slice);
            const max = Math.max(...slice);
            if (max === min) {
                stochK.push(50);
            } else {
                stochK.push(((validRSI[i] - min) / (max - min)) * 100);
            }
        }
    }

    const validK = stochK.filter((v): v is number => v !== null);
    const smoothedK = calculateSMA(validK, kSmooth);
    const smoothedD = calculateSMA(
        smoothedK.filter((v): v is number => v !== null),
        dSmooth
    );

    // Pad back to original length
    const offset = data.length - validRSI.length;
    const kOffset = offset + stochPeriod - 1;
    const dOffset = kOffset + kSmooth - 1 + dSmooth - 1;

    const k: (number | null)[] = Array(data.length).fill(null);
    const d: (number | null)[] = Array(data.length).fill(null);

    smoothedK.forEach((v, i) => {
        if (v !== null && kOffset + i < data.length) k[kOffset + i] = v;
    });

    smoothedD.forEach((v, i) => {
        if (v !== null && dOffset + i < data.length) d[dOffset + i] = v;
    });

    return { k, d };
}

// =============================================================================
// ATR (Average True Range)
// =============================================================================

export function calculateATR(bars: OHLCVBar[], period: number = 14): (number | null)[] {
    const trueRanges: number[] = [];
    const result: (number | null)[] = [];

    for (let i = 0; i < bars.length; i++) {
        if (i === 0) {
            trueRanges.push(bars[i].high - bars[i].low);
            result.push(null);
        } else {
            const tr = Math.max(
                bars[i].high - bars[i].low,
                Math.abs(bars[i].high - bars[i - 1].close),
                Math.abs(bars[i].low - bars[i - 1].close)
            );
            trueRanges.push(tr);

            if (i < period) {
                result.push(null);
            } else if (i === period) {
                result.push(trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period);
            } else {
                const prevATR = result[i - 1]!;
                result.push((prevATR * (period - 1) + tr) / period);
            }
        }
    }

    return result;
}

// =============================================================================
// VWAP (Volume Weighted Average Price)
// =============================================================================

export function calculateVWAP(bars: OHLCVBar[]): (number | null)[] {
    let cumulativeTPV = 0;
    let cumulativeVolume = 0;

    return bars.map(bar => {
        if (bar.volume === 0) return null;
        const typicalPrice = (bar.high + bar.low + bar.close) / 3;
        cumulativeTPV += typicalPrice * bar.volume;
        cumulativeVolume += bar.volume;
        return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : null;
    });
}

// =============================================================================
// Fibonacci Retracement Levels
// =============================================================================

export interface FibonacciLevels {
    level0: number;    // 0% (High)
    level236: number;  // 23.6%
    level382: number;  // 38.2%
    level500: number;  // 50%
    level618: number;  // 61.8%
    level786: number;  // 78.6%
    level1000: number; // 100% (Low)
}

export function calculateFibonacciLevels(high: number, low: number): FibonacciLevels {
    const diff = high - low;
    return {
        level0: high,
        level236: high - diff * 0.236,
        level382: high - diff * 0.382,
        level500: high - diff * 0.5,
        level618: high - diff * 0.618,
        level786: high - diff * 0.786,
        level1000: low,
    };
}

// =============================================================================
// Support & Resistance Detection (Pivot Points)
// =============================================================================

export interface SupportResistance {
    supports: number[];
    resistances: number[];
}

export function identifySupportResistance(bars: OHLCVBar[], lookback: number = 20): SupportResistance {
    const supports: number[] = [];
    const resistances: number[] = [];

    for (let i = lookback; i < bars.length - lookback; i++) {
        let isSupport = true;
        let isResistance = true;

        for (let j = 1; j <= lookback; j++) {
            if (bars[i].low >= bars[i - j].low || bars[i].low >= bars[i + j]?.low) {
                isSupport = false;
            }
            if (bars[i].high <= bars[i - j].high || bars[i].high <= bars[i + j]?.high) {
                isResistance = false;
            }
        }

        if (isSupport) supports.push(bars[i].low);
        if (isResistance) resistances.push(bars[i].high);
    }

    // Cluster nearby levels (within 1%)
    const clusterLevels = (levels: number[]): number[] => {
        if (levels.length === 0) return [];
        const sorted = [...levels].sort((a, b) => a - b);
        const clustered: number[] = [];
        let cluster: number[] = [sorted[0]];

        for (let i = 1; i < sorted.length; i++) {
            if ((sorted[i] - sorted[i - 1]) / sorted[i - 1] < 0.01) {
                cluster.push(sorted[i]);
            } else {
                clustered.push(cluster.reduce((a, b) => a + b) / cluster.length);
                cluster = [sorted[i]];
            }
        }
        clustered.push(cluster.reduce((a, b) => a + b) / cluster.length);
        return clustered;
    };

    return {
        supports: clusterLevels(supports).slice(-5),        // Last 5 support levels
        resistances: clusterLevels(resistances).slice(-5),   // Last 5 resistance levels
    };
}

// =============================================================================
// Candlestick Pattern Recognition
// =============================================================================

export interface CandlePattern {
    index: number;
    name: string;
    type: 'bullish' | 'bearish' | 'neutral';
    reliability: 'low' | 'medium' | 'high';
}

export function identifyCandlePatterns(bars: OHLCVBar[]): CandlePattern[] {
    const patterns: CandlePattern[] = [];

    for (let i = 1; i < bars.length; i++) {
        const curr = bars[i];
        const prev = bars[i - 1];
        const body = Math.abs(curr.close - curr.open);
        const range = curr.high - curr.low;
        const upperWick = curr.high - Math.max(curr.open, curr.close);
        const lowerWick = Math.min(curr.open, curr.close) - curr.low;
        const isBullish = curr.close > curr.open;

        // Doji: very small body relative to range
        if (range > 0 && body / range < 0.1) {
            patterns.push({ index: i, name: 'Doji', type: 'neutral', reliability: 'medium' });
        }

        // Hammer: small body at top, long lower wick (bullish reversal)
        if (lowerWick > body * 2 && upperWick < body * 0.5 && isBullish) {
            patterns.push({ index: i, name: 'Hammer', type: 'bullish', reliability: 'high' });
        }

        // Shooting Star: small body at bottom, long upper wick (bearish reversal)
        if (upperWick > body * 2 && lowerWick < body * 0.5 && !isBullish) {
            patterns.push({ index: i, name: 'Shooting Star', type: 'bearish', reliability: 'high' });
        }

        // Bullish Engulfing
        if (i > 0) {
            const prevBody = Math.abs(prev.close - prev.open);
            if (prev.close < prev.open && isBullish && body > prevBody * 1.5 &&
                curr.open <= prev.close && curr.close >= prev.open) {
                patterns.push({ index: i, name: 'Bullish Engulfing', type: 'bullish', reliability: 'high' });
            }

            // Bearish Engulfing
            if (prev.close > prev.open && !isBullish && body > prevBody * 1.5 &&
                curr.open >= prev.close && curr.close <= prev.open) {
                patterns.push({ index: i, name: 'Bearish Engulfing', type: 'bearish', reliability: 'high' });
            }
        }

        // Morning Star (3-candle pattern)
        if (i >= 2) {
            const twoPrev = bars[i - 2];
            const prevBody2 = Math.abs(prev.close - prev.open);
            const twoPrevBody = Math.abs(twoPrev.close - twoPrev.open);

            if (twoPrev.close < twoPrev.open && twoPrevBody > range * 0.3 &&
                prevBody2 < twoPrevBody * 0.3 &&
                isBullish && body > twoPrevBody * 0.5) {
                patterns.push({ index: i, name: 'Morning Star', type: 'bullish', reliability: 'high' });
            }

            // Evening Star
            if (twoPrev.close > twoPrev.open && twoPrevBody > range * 0.3 &&
                prevBody2 < twoPrevBody * 0.3 &&
                !isBullish && body > twoPrevBody * 0.5) {
                patterns.push({ index: i, name: 'Evening Star', type: 'bearish', reliability: 'high' });
            }
        }
    }

    // Return only recent patterns (last 20 candles)
    return patterns.filter(p => p.index >= bars.length - 20);
}

// =============================================================================
// Full Analysis Summary (for AI prompt building)
// =============================================================================

export interface AnalysisSummary {
    currentPrice: number;
    sma20: number | null;
    sma50: number | null;
    sma200: number | null;
    ema9: number | null;
    ema21: number | null;
    rsi: number | null;
    macd: { macd: number | null; signal: number | null; histogram: number | null };
    bollingerBands: { upper: number | null; middle: number | null; lower: number | null };
    atr: number | null;
    vwap: number | null;
    supportResistance: SupportResistance;
    patterns: CandlePattern[];
    fibonacci: FibonacciLevels;
    volumeAvg: number;
    volumeLatest: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    high52w: number;
    low52w: number;
}

export function generateAnalysisSummary(bars: OHLCVBar[]): AnalysisSummary {
    const closes = bars.map(b => b.close);
    const lastIdx = closes.length - 1;
    const currentPrice = closes[lastIdx];

    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const sma200 = calculateSMA(closes, 200);
    const ema9 = calculateEMA(closes, 9);
    const ema21 = calculateEMA(closes, 21);
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes);
    const atr = calculateATR(bars);
    const vwap = calculateVWAP(bars);
    const sr = identifySupportResistance(bars, 5);
    const patterns = identifyCandlePatterns(bars);

    const highs = bars.map(b => b.high);
    const lows = bars.map(b => b.low);
    const volumes = bars.map(b => b.volume);
    const fib = calculateFibonacciLevels(Math.max(...highs), Math.min(...lows));

    const prevClose = bars.length > 1 ? bars[lastIdx - 1].close : currentPrice;
    const change = currentPrice - prevClose;

    return {
        currentPrice,
        sma20: sma20[lastIdx],
        sma50: sma50[lastIdx],
        sma200: sma200[lastIdx],
        ema9: ema9[lastIdx],
        ema21: ema21[lastIdx],
        rsi: rsi[lastIdx],
        macd: {
            macd: macd.macd[lastIdx],
            signal: macd.signal[lastIdx],
            histogram: macd.histogram[lastIdx],
        },
        bollingerBands: {
            upper: bb.upper[lastIdx],
            middle: bb.middle[lastIdx],
            lower: bb.lower[lastIdx],
        },
        atr: atr[lastIdx],
        vwap: vwap[lastIdx],
        supportResistance: sr,
        patterns,
        fibonacci: fib,
        volumeAvg: volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : 0,
        volumeLatest: volumes[lastIdx] || 0,
        priceChange24h: change,
        priceChangePercent24h: prevClose ? (change / prevClose) * 100 : 0,
        high52w: Math.max(...highs),
        low52w: Math.min(...lows),
    };
}
