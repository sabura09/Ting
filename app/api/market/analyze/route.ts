import { NextRequest, NextResponse } from 'next/server';
import { getHistory, getQuote } from '@/lib/market-data';
import { generateAnalysisSummary } from '@/lib/indicators';
import type { MarketType, TimeInterval } from '@/lib/market-data';

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

        // Fetch data
        const [bars, quote] = await Promise.all([
            getHistory(symbol, type, interval),
            getQuote(symbol, type).catch(() => null),
        ]);

        if (!bars || bars.length < 20) {
            return NextResponse.json(
                { error: 'Insufficient data for analysis. Try a longer timeframe.' },
                { status: 400 }
            );
        }

        // Generate analysis summary
        const analysis = generateAnalysisSummary(bars);

        // Build the AI prompt
        const analysisPrompt = buildAnalysisPrompt(symbol, type, interval, analysis, quote);

        return NextResponse.json({
            symbol,
            type,
            interval,
            analysis,
            prompt: analysisPrompt,
            quote,
        });
    } catch (error: any) {
        console.error('Analysis API error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to analyze' },
            { status: 500 }
        );
    }
}

function buildAnalysisPrompt(
    symbol: string,
    type: MarketType,
    interval: string,
    analysis: any,
    quote: any
): string {
    const fmt = (n: number | null, decimals: number = 2) => 
        n !== null && n !== undefined ? n.toFixed(decimals) : 'N/A';

    return `Analyze the following ${type.toUpperCase()} chart data for **${symbol}** on the **${interval}** timeframe:

## Current Price Data
- **Current Price**: $${fmt(analysis.currentPrice)}
- **24h Change**: ${fmt(analysis.priceChange24h)} (${fmt(analysis.priceChangePercent24h)}%)
- **52-Week High**: $${fmt(analysis.high52w)}
- **52-Week Low**: $${fmt(analysis.low52w)}
${quote ? `- **Volume**: ${quote.volume?.toLocaleString() || 'N/A'}
- **Market Cap**: $${quote.marketCap ? (quote.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}` : ''}

## Moving Averages
- **EMA 9**: $${fmt(analysis.ema9)} ${analysis.currentPrice > (analysis.ema9 || 0) ? '(Price ABOVE ↑)' : '(Price BELOW ↓)'}
- **EMA 21**: $${fmt(analysis.ema21)} ${analysis.currentPrice > (analysis.ema21 || 0) ? '(Price ABOVE ↑)' : '(Price BELOW ↓)'}
- **SMA 20**: $${fmt(analysis.sma20)} ${analysis.currentPrice > (analysis.sma20 || 0) ? '(Price ABOVE ↑)' : '(Price BELOW ↓)'}
- **SMA 50**: $${fmt(analysis.sma50)} ${analysis.currentPrice > (analysis.sma50 || 0) ? '(Price ABOVE ↑)' : '(Price BELOW ↓)'}
- **SMA 200**: $${fmt(analysis.sma200)} ${analysis.currentPrice > (analysis.sma200 || 0) ? '(Price ABOVE ↑)' : '(Price BELOW ↓)'}

## Momentum Indicators
- **RSI (14)**: ${fmt(analysis.rsi)} ${(analysis.rsi || 50) > 70 ? '⚠️ OVERBOUGHT' : (analysis.rsi || 50) < 30 ? '⚠️ OVERSOLD' : '(Neutral zone)'}
- **MACD Line**: ${fmt(analysis.macd?.macd, 4)}
- **MACD Signal**: ${fmt(analysis.macd?.signal, 4)}
- **MACD Histogram**: ${fmt(analysis.macd?.histogram, 4)} ${(analysis.macd?.histogram || 0) > 0 ? '(Bullish momentum)' : '(Bearish momentum)'}

## Volatility
- **Bollinger Upper**: $${fmt(analysis.bollingerBands?.upper)}
- **Bollinger Middle**: $${fmt(analysis.bollingerBands?.middle)}
- **Bollinger Lower**: $${fmt(analysis.bollingerBands?.lower)}
- **ATR (14)**: $${fmt(analysis.atr)}
- **VWAP**: $${fmt(analysis.vwap)}

## Volume Analysis
- **Latest Volume**: ${analysis.volumeLatest?.toLocaleString() || 'N/A'}
- **Average Volume**: ${Math.round(analysis.volumeAvg)?.toLocaleString() || 'N/A'}
- **Volume Ratio**: ${analysis.volumeAvg > 0 ? (analysis.volumeLatest / analysis.volumeAvg).toFixed(2) + 'x' : 'N/A'}

## Support & Resistance
- **Supports**: ${analysis.supportResistance?.supports?.map((s: number) => '$' + fmt(s)).join(', ') || 'None detected'}
- **Resistances**: ${analysis.supportResistance?.resistances?.map((r: number) => '$' + fmt(r)).join(', ') || 'None detected'}

## Fibonacci Retracement
- **0% (High)**: $${fmt(analysis.fibonacci?.level0)}
- **23.6%**: $${fmt(analysis.fibonacci?.level236)}
- **38.2%**: $${fmt(analysis.fibonacci?.level382)}
- **50%**: $${fmt(analysis.fibonacci?.level500)}
- **61.8%**: $${fmt(analysis.fibonacci?.level618)}
- **78.6%**: $${fmt(analysis.fibonacci?.level786)}

## Candlestick Patterns
${analysis.patterns?.length > 0
        ? analysis.patterns.map((p: any) => `- **${p.name}** (${p.type}, ${p.reliability} reliability)`).join('\n')
        : '- No significant patterns detected'}

Provide a comprehensive technical analysis covering all the points outlined in your system prompt.`;
}
