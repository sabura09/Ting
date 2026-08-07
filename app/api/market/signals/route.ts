import { NextRequest, NextResponse } from 'next/server';
import { getHistory, getQuote } from '@/lib/market-data';
import { generateAnalysisSummary, calculateATR } from '@/lib/indicators';
import type { MarketType, TimeInterval } from '@/lib/market-data';

export interface TradingSignal {
    symbol: string;
    marketType: MarketType;
    direction: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: string;
    timeframe: string;
    strategy: string;
    reasoning: string[];
    timestamp: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { symbol, type = 'stock', interval = '1d' } = body as {
            symbol: string;
            type: MarketType;
            interval: TimeInterval;
        };

        if (!symbol) {
            return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
        }

        const bars = await getHistory(symbol, type, interval);

        if (!bars || bars.length < 50) {
            return NextResponse.json(
                { error: 'Insufficient data for signal generation. Need at least 50 bars.' },
                { status: 400 }
            );
        }

        const analysis = generateAnalysisSummary(bars);
        const signal = generateSignal(symbol, type, interval, analysis, bars);

        // Build AI validation prompt for the signal
        const validationPrompt = buildSignalValidationPrompt(symbol, type, interval, signal, analysis);

        return NextResponse.json({
            signal,
            prompt: validationPrompt,
            analysis,
        });
    } catch (error: any) {
        console.error('Signal API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate signal' },
            { status: 500 }
        );
    }
}

function generateSignal(
    symbol: string,
    type: MarketType,
    interval: string,
    analysis: any,
    bars: any[]
): TradingSignal {
    const { currentPrice, rsi, macd, ema9, ema21, sma50, sma200, bollingerBands, atr } = analysis;

    let bullishScore = 0;
    let bearishScore = 0;
    const reasons: string[] = [];

    // === Strategy 1: Moving Average Alignment ===
    if (ema9 && ema21) {
        if (ema9 > ema21) {
            bullishScore += 15;
            reasons.push('EMA 9 above EMA 21 (bullish crossover)');
        } else {
            bearishScore += 15;
            reasons.push('EMA 9 below EMA 21 (bearish crossover)');
        }
    }

    if (sma50 && sma200) {
        if (sma50 > sma200) {
            bullishScore += 10;
            reasons.push('Golden Cross: SMA 50 > SMA 200');
        } else {
            bearishScore += 10;
            reasons.push('Death Cross: SMA 50 < SMA 200');
        }
    }

    // Price relative to key MAs
    if (currentPrice > (sma50 || 0)) {
        bullishScore += 5;
    } else {
        bearishScore += 5;
    }

    // === Strategy 2: RSI Momentum ===
    if (rsi !== null) {
        if (rsi < 30) {
            bullishScore += 20;
            reasons.push(`RSI oversold at ${rsi.toFixed(1)} — potential reversal up`);
        } else if (rsi > 70) {
            bearishScore += 20;
            reasons.push(`RSI overbought at ${rsi.toFixed(1)} — potential reversal down`);
        } else if (rsi > 50) {
            bullishScore += 5;
            reasons.push(`RSI at ${rsi.toFixed(1)} — bullish momentum`);
        } else {
            bearishScore += 5;
            reasons.push(`RSI at ${rsi.toFixed(1)} — bearish momentum`);
        }
    }

    // === Strategy 3: MACD Momentum ===
    if (macd.histogram !== null) {
        if (macd.histogram > 0) {
            bullishScore += 15;
            if (macd.macd > macd.signal) {
                reasons.push('MACD bullish crossover confirmed');
            }
        } else {
            bearishScore += 15;
            if (macd.macd < macd.signal) {
                reasons.push('MACD bearish crossover confirmed');
            }
        }
    }

    // === Strategy 4: Bollinger Band Position ===
    if (bollingerBands.upper && bollingerBands.lower) {
        const bbWidth = bollingerBands.upper - bollingerBands.lower;
        const bbPosition = (currentPrice - bollingerBands.lower) / bbWidth;

        if (bbPosition < 0.2) {
            bullishScore += 15;
            reasons.push('Price near lower Bollinger Band — potential bounce');
        } else if (bbPosition > 0.8) {
            bearishScore += 15;
            reasons.push('Price near upper Bollinger Band — potential pullback');
        }
    }

    // === Strategy 5: Volume Confirmation ===
    if (analysis.volumeLatest > analysis.volumeAvg * 1.5) {
        const extra = 10;
        if (bullishScore > bearishScore) {
            bullishScore += extra;
            reasons.push('High volume confirms bullish momentum');
        } else {
            bearishScore += extra;
            reasons.push('High volume confirms bearish momentum');
        }
    }

    // === Strategy 6: Candlestick Patterns ===
    if (analysis.patterns?.length > 0) {
        for (const pattern of analysis.patterns) {
            if (pattern.type === 'bullish' && pattern.reliability === 'high') {
                bullishScore += 10;
                reasons.push(`Bullish pattern: ${pattern.name}`);
            } else if (pattern.type === 'bearish' && pattern.reliability === 'high') {
                bearishScore += 10;
                reasons.push(`Bearish pattern: ${pattern.name}`);
            }
        }
    }

    // Determine direction
    const totalScore = bullishScore + bearishScore;
    let direction: 'BUY' | 'SELL' | 'HOLD';
    let confidence: number;

    if (totalScore === 0) {
        direction = 'HOLD';
        confidence = 50;
    } else {
        const bullishRatio = bullishScore / totalScore;
        if (bullishRatio > 0.6) {
            direction = 'BUY';
            confidence = Math.min(95, Math.round(bullishRatio * 100));
        } else if (bullishRatio < 0.4) {
            direction = 'SELL';
            confidence = Math.min(95, Math.round((1 - bullishRatio) * 100));
        } else {
            direction = 'HOLD';
            confidence = Math.round(50 + Math.abs(bullishRatio - 0.5) * 100);
        }
    }

    // Calculate SL/TP using ATR
    const atrValue = atr || currentPrice * 0.02; // Fallback to 2%
    const stopLoss = direction === 'BUY'
        ? currentPrice - atrValue * 1.5
        : currentPrice + atrValue * 1.5;
    const takeProfit = direction === 'BUY'
        ? currentPrice + atrValue * 3
        : currentPrice - atrValue * 3;

    const risk = Math.abs(currentPrice - stopLoss);
    const reward = Math.abs(takeProfit - currentPrice);
    const riskReward = risk > 0 ? `1:${(reward / risk).toFixed(1)}` : '1:2';

    return {
        symbol,
        marketType: type,
        direction,
        confidence,
        entryPrice: currentPrice,
        stopLoss: Math.round(stopLoss * 100) / 100,
        takeProfit: Math.round(takeProfit * 100) / 100,
        riskReward,
        timeframe: interval,
        strategy: 'Multi-Indicator Confluence',
        reasoning: reasons,
        timestamp: Date.now(),
    };
}

function buildSignalValidationPrompt(
    symbol: string,
    type: MarketType,
    interval: string,
    signal: TradingSignal,
    analysis: any
): string {
    return `Validate and provide additional context for the following trading signal:

## Signal Details
- **Symbol**: ${symbol} (${type.toUpperCase()})
- **Direction**: ${signal.direction}
- **Confidence**: ${signal.confidence}%
- **Entry Price**: $${signal.entryPrice.toFixed(2)}
- **Stop Loss**: $${signal.stopLoss.toFixed(2)}
- **Take Profit**: $${signal.takeProfit.toFixed(2)}
- **Risk/Reward**: ${signal.riskReward}
- **Timeframe**: ${interval}

## Signal Reasoning
${signal.reasoning.map(r => `- ${r}`).join('\n')}

## Current Technical State
- **RSI**: ${analysis.rsi?.toFixed(1) || 'N/A'}
- **MACD Histogram**: ${analysis.macd?.histogram?.toFixed(4) || 'N/A'}
- **Price vs SMA 200**: ${analysis.currentPrice > (analysis.sma200 || 0) ? 'ABOVE' : 'BELOW'}

Validate this signal: assess if the entry, stop-loss, and take-profit levels are appropriate. 
Identify any conflicting signals or risks. Rate the overall signal quality.
Include a disclaimer that this is for educational purposes only and not financial advice.`;
}
