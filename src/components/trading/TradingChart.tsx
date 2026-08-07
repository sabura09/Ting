"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
    createChart,
    type IChartApi,
    type ISeriesApi,
    type CandlestickData,
    type LineData,
    type HistogramData,
    type Time,
    ColorType,
    CrosshairMode,
    LineStyle,
    CandlestickSeries,
    HistogramSeries,
    LineSeries,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import type { OHLCVBar, TimeInterval } from "@/lib/market-data";
import {
    calculateSMA,
    calculateEMA,
    calculateRSI,
    calculateMACD,
    calculateBollingerBands,
    calculateVWAP,
} from "@/lib/indicators";

interface TradingChartProps {
    bars: OHLCVBar[];
    symbol: string;
    interval: TimeInterval;
    indicators?: {
        sma20?: boolean;
        sma50?: boolean;
        sma200?: boolean;
        ema9?: boolean;
        ema21?: boolean;
        bollinger?: boolean;
        vwap?: boolean;
        rsi?: boolean;
        macd?: boolean;
        volume?: boolean;
    };
    signalLevels?: {
        entry?: number;
        stopLoss?: number;
        takeProfit?: number;
    };
    onCrosshairMove?: (price: number | null, time: Time | null) => void;
}

const CHART_COLORS = {
    dark: {
        bg: "transparent",
        text: "#9ca3af",
        grid: "rgba(55, 65, 81, 0.3)",
        border: "rgba(55, 65, 81, 0.5)",
        upColor: "#22c55e",
        downColor: "#ef4444",
        upWick: "#22c55e",
        downWick: "#ef4444",
        volumeUp: "rgba(34, 197, 94, 0.25)",
        volumeDown: "rgba(239, 68, 68, 0.25)",
        crosshair: "#6b7280",
        sma20: "#f59e0b",
        sma50: "#3b82f6",
        sma200: "#a855f7",
        ema9: "#06b6d4",
        ema21: "#ec4899",
        bbUpper: "rgba(168, 85, 247, 0.4)",
        bbLower: "rgba(168, 85, 247, 0.4)",
        bbMiddle: "rgba(168, 85, 247, 0.6)",
        vwap: "#f97316",
        rsiLine: "#06b6d4",
        macdLine: "#3b82f6",
        macdSignal: "#ef4444",
        macdHistUp: "rgba(34, 197, 94, 0.6)",
        macdHistDown: "rgba(239, 68, 68, 0.6)",
        entryLine: "#22c55e",
        slLine: "#ef4444",
        tpLine: "#06b6d4",
    },
    light: {
        bg: "transparent",
        text: "#4b5563",
        grid: "rgba(209, 213, 219, 0.5)",
        border: "rgba(209, 213, 219, 0.8)",
        upColor: "#16a34a",
        downColor: "#dc2626",
        upWick: "#16a34a",
        downWick: "#dc2626",
        volumeUp: "rgba(22, 163, 74, 0.2)",
        volumeDown: "rgba(220, 38, 38, 0.2)",
        crosshair: "#9ca3af",
        sma20: "#d97706",
        sma50: "#2563eb",
        sma200: "#9333ea",
        ema9: "#0891b2",
        ema21: "#db2777",
        bbUpper: "rgba(147, 51, 234, 0.3)",
        bbLower: "rgba(147, 51, 234, 0.3)",
        bbMiddle: "rgba(147, 51, 234, 0.5)",
        vwap: "#ea580c",
        rsiLine: "#0891b2",
        macdLine: "#2563eb",
        macdSignal: "#dc2626",
        macdHistUp: "rgba(22, 163, 74, 0.5)",
        macdHistDown: "rgba(220, 38, 38, 0.5)",
        entryLine: "#16a34a",
        slLine: "#dc2626",
        tpLine: "#0891b2",
    },
};

export default function TradingChart({
    bars,
    symbol,
    interval,
    indicators = {},
    signalLevels,
    onCrosshairMove,
}: TradingChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const overlaySeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
    const rsiChartRef = useRef<IChartApi | null>(null);
    const macdChartRef = useRef<IChartApi | null>(null);
    const rsiContainerRef = useRef<HTMLDivElement>(null);
    const macdContainerRef = useRef<HTMLDivElement>(null);
    const { resolvedTheme } = useTheme();
    const [crosshairData, setCrosshairData] = useState<{
        time: string;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    } | null>(null);

    // Refs for sub-chart series and price lines to enable in-place updates
    const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdSignalSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const macdHistSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const priceLinesRef = useRef<any[]>([]);
    const lastFitKeyRef = useRef<string>("");

    // Refs to avoid stale closures in chart event listeners
    const barsRef = useRef<OHLCVBar[]>([]);
    const onCrosshairMoveRef = useRef(onCrosshairMove);

    useEffect(() => {
        barsRef.current = bars;
    }, [bars]);

    useEffect(() => {
        onCrosshairMoveRef.current = onCrosshairMove;
    }, [onCrosshairMove]);

    const colors = resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;

    // Format bars for lightweight-charts
    const formatBars = useCallback(
        (data: OHLCVBar[]): CandlestickData[] => {
            return data.map((bar) => ({
                time: bar.time as Time,
                open: bar.open,
                high: bar.high,
                low: bar.low,
                close: bar.close,
            }));
        },
        []
    );

    // 1. MAIN CHART CREATION (Runs on mount, theme change, or timeframe type change)
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Clean up existing chart
        if (chartRef.current) {
            chartRef.current.remove();
        }
        chartContainerRef.current.innerHTML = '';
        overlaySeriesRef.current.clear();

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors.bg },
                textColor: colors.text,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 11,
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: colors.crosshair, width: 1, style: LineStyle.Dashed, labelVisible: true },
                horzLine: { color: colors.crosshair, width: 1, style: LineStyle.Dashed, labelVisible: true },
            },
            rightPriceScale: {
                borderColor: colors.border,
                scaleMargins: { top: 0.05, bottom: indicators.volume ? 0.2 : 0.05 },
            },
            timeScale: {
                borderColor: colors.border,
                timeVisible: ["1m", "5m", "15m", "1h", "4h"].includes(interval),
                secondsVisible: false,
            },
            handleScroll: { vertTouchDrag: false },
        });

        chartRef.current = chart;

        // Candlestick series
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: colors.upColor,
            downColor: colors.downColor,
            wickUpColor: colors.upWick,
            wickDownColor: colors.downWick,
            borderVisible: false,
        });

        candleSeriesRef.current = candleSeries;

        // Crosshair move subscription (reads from ref to avoid stale closed-over bars data)
        chart.subscribeCrosshairMove((param) => {
            if (param.time) {
                const data = param.seriesData.get(candleSeries) as CandlestickData | undefined;
                if (data) {
                    const currentBars = barsRef.current;
                    const barIdx = currentBars.findIndex((b) => b.time === (param.time as number));
                    const bar = barIdx >= 0 ? currentBars[barIdx] : null;
                    setCrosshairData({
                        time: new Date((param.time as number) * 1000).toLocaleString(),
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        close: data.close,
                        volume: bar?.volume || 0,
                    });
                }
                onCrosshairMoveRef.current?.(data?.close ?? null, param.time);
            } else {
                setCrosshairData(null);
            }
        });

        // Responsive resize
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                chart.applyOptions({ width, height });
            }
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
        };
    }, [colors, interval]);

    // 2. RSI CHART CREATION (Runs on mount, theme change, or indicator toggle)
    useEffect(() => {
        if (!indicators.rsi || !rsiContainerRef.current || bars.length === 0) {
            if (rsiChartRef.current) {
                rsiChartRef.current.remove();
                rsiChartRef.current = null;
                rsiSeriesRef.current = null;
            }
            return;
        }

        if (rsiChartRef.current) {
            rsiChartRef.current.remove();
        }
        rsiContainerRef.current.innerHTML = '';

        const chart = createChart(rsiContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors.bg },
                textColor: colors.text,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 10,
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid },
            },
            rightPriceScale: { borderColor: colors.border },
            timeScale: { borderColor: colors.border, visible: false },
            handleScroll: { vertTouchDrag: false },
            height: 100,
        });

        rsiChartRef.current = chart;

        const rsiSeries = chart.addSeries(LineSeries, {
            color: colors.rsiLine,
            lineWidth: 2,
            priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(1) },
        });
        rsiSeriesRef.current = rsiSeries;

        // Overbought / Oversold lines
        addPriceLine(rsiSeries, 70, "rgba(239, 68, 68, 0.4)", "70");
        addPriceLine(rsiSeries, 30, "rgba(34, 197, 94, 0.4)", "30");
        addPriceLine(rsiSeries, 50, "rgba(107, 114, 128, 0.3)", "50");

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                chart.applyOptions({ width: entry.contentRect.width });
            }
        });
        resizeObserver.observe(rsiContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            rsiChartRef.current = null;
            rsiSeriesRef.current = null;
        };
    }, [indicators.rsi, colors]);

    // 3. MACD CHART CREATION (Runs on mount, theme change, or indicator toggle)
    useEffect(() => {
        if (!indicators.macd || !macdContainerRef.current || bars.length === 0) {
            if (macdChartRef.current) {
                macdChartRef.current.remove();
                macdChartRef.current = null;
                macdLineSeriesRef.current = null;
                macdSignalSeriesRef.current = null;
                macdHistSeriesRef.current = null;
            }
            return;
        }

        if (macdChartRef.current) {
            macdChartRef.current.remove();
        }
        macdContainerRef.current.innerHTML = '';

        const chart = createChart(macdContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors.bg },
                textColor: colors.text,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 10,
            },
            grid: {
                vertLines: { color: colors.grid },
                horzLines: { color: colors.grid },
            },
            rightPriceScale: { borderColor: colors.border },
            timeScale: { borderColor: colors.border, visible: false },
            handleScroll: { vertTouchDrag: false },
            height: 100,
        });

        macdChartRef.current = chart;

        // MACD Line
        macdLineSeriesRef.current = chart.addSeries(LineSeries, {
            color: colors.macdLine,
            lineWidth: 2,
            priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(4) },
        });

        // Signal Line
        macdSignalSeriesRef.current = chart.addSeries(LineSeries, {
            color: colors.macdSignal,
            lineWidth: 1,
            priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(4) },
        });

        // Histogram
        macdHistSeriesRef.current = chart.addSeries(HistogramSeries, {
            priceFormat: { type: "custom", formatter: (v: number) => v.toFixed(4) },
        });

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                chart.applyOptions({ width: entry.contentRect.width });
            }
        });
        resizeObserver.observe(macdContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            macdChartRef.current = null;
            macdLineSeriesRef.current = null;
            macdSignalSeriesRef.current = null;
            macdHistSeriesRef.current = null;
        };
    }, [indicators.macd, colors]);

    // 4. SUB-CHARTS SCALE SYNCHRONIZATION WITH MAIN CHART
    useEffect(() => {
        const mainChart = chartRef.current;
        if (!mainChart) return;

        const handleRangeChange = (range: any) => {
            if (!range) return;
            if (rsiChartRef.current) rsiChartRef.current.timeScale().setVisibleLogicalRange(range);
            if (macdChartRef.current) macdChartRef.current.timeScale().setVisibleLogicalRange(range);
        };

        mainChart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
        return () => {
            mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
        };
    }, [bars, indicators.rsi, indicators.macd]);

    // 5. SERIES DATA UPDATE AND DYNAMIC OVERLAY UPDATES
    useEffect(() => {
        const chart = chartRef.current;
        const candleSeries = candleSeriesRef.current;
        if (!chart || !candleSeries || bars.length === 0) return;

        // 5.1. Update main candlestick data
        candleSeries.setData(formatBars(bars));

        // 5.2. Fit timescale content ONLY when the symbol or interval changes, preserving zoom on live updates
        const symbolIntervalKey = `${symbol}-${interval}`;
        if (lastFitKeyRef.current !== symbolIntervalKey) {
            chart.timeScale().fitContent();
            lastFitKeyRef.current = symbolIntervalKey;
        }

        // 5.3. Recreate and update overlays and volume histogram
        overlaySeriesRef.current.forEach((series) => {
            try {
                chart.removeSeries(series);
            } catch (err) {}
        });
        overlaySeriesRef.current.clear();

        const closes = bars.map((b) => b.close);

        if (indicators.sma20) {
            const smaData = calculateSMA(closes, 20);
            const series = addLineSeries(chart, "sma20", bars, smaData, colors.sma20, 1);
            overlaySeriesRef.current.set("sma20", series);
        }
        if (indicators.sma50) {
            const smaData = calculateSMA(closes, 50);
            const series = addLineSeries(chart, "sma50", bars, smaData, colors.sma50, 1);
            overlaySeriesRef.current.set("sma50", series);
        }
        if (indicators.sma200) {
            const smaData = calculateSMA(closes, 200);
            const series = addLineSeries(chart, "sma200", bars, smaData, colors.sma200, 1);
            overlaySeriesRef.current.set("sma200", series);
        }
        if (indicators.ema9) {
            const emaData = calculateEMA(closes, 9);
            const series = addLineSeries(chart, "ema9", bars, emaData, colors.ema9, 1);
            overlaySeriesRef.current.set("ema9", series);
        }
        if (indicators.ema21) {
            const emaData = calculateEMA(closes, 21);
            const series = addLineSeries(chart, "ema21", bars, emaData, colors.ema21, 1);
            overlaySeriesRef.current.set("ema21", series);
        }
        if (indicators.bollinger) {
            const bb = calculateBollingerBands(closes);
            const bbUpper = addLineSeries(chart, "bbUpper", bars, bb.upper, colors.bbUpper, 1);
            const bbMiddle = addLineSeries(chart, "bbMiddle", bars, bb.middle, colors.bbMiddle, 1);
            const bbLower = addLineSeries(chart, "bbLower", bars, bb.lower, colors.bbLower, 1);
            overlaySeriesRef.current.set("bbUpper", bbUpper);
            overlaySeriesRef.current.set("bbMiddle", bbMiddle);
            overlaySeriesRef.current.set("bbLower", bbLower);
        }
        if (indicators.vwap) {
            const vwapData = calculateVWAP(bars);
            const series = addLineSeries(chart, "vwap", bars, vwapData, colors.vwap, 2);
            overlaySeriesRef.current.set("vwap", series);
        }

        // Add volume as histogram overlay
        if (indicators.volume !== false) {
            const volumeSeries = chart.addSeries(HistogramSeries, {
                priceFormat: { type: "volume" },
                priceScaleId: "volume",
            });
            chart.priceScale("volume").applyOptions({
                scaleMargins: { top: 0.85, bottom: 0 },
            });
            volumeSeries.setData(
                bars.map((bar) => ({
                    time: bar.time as Time,
                    value: bar.volume,
                    color: bar.close >= bar.open ? colors.volumeUp : colors.volumeDown,
                }))
            );
            overlaySeriesRef.current.set("volume", volumeSeries);
        }

        // 5.4. Update signal price lines
        priceLinesRef.current.forEach((line) => {
            try {
                candleSeries.removePriceLine(line);
            } catch (err) {}
        });
        priceLinesRef.current = [];

        if (signalLevels) {
            if (signalLevels.entry) {
                const line = addPriceLine(candleSeries, signalLevels.entry, colors.entryLine, "Entry");
                priceLinesRef.current.push(line);
            }
            if (signalLevels.stopLoss) {
                const line = addPriceLine(candleSeries, signalLevels.stopLoss, colors.slLine, "SL");
                priceLinesRef.current.push(line);
            }
            if (signalLevels.takeProfit) {
                const line = addPriceLine(candleSeries, signalLevels.takeProfit, colors.tpLine, "TP");
                priceLinesRef.current.push(line);
            }
        }

        // 5.5. Update RSI series data
        if (indicators.rsi && rsiSeriesRef.current) {
            const rsiValues = calculateRSI(closes, 14);
            const rsiData: LineData[] = rsiValues
                .map((v, i) => (v !== null ? { time: bars[i].time as Time, value: v } : null))
                .filter(Boolean) as LineData[];
            rsiSeriesRef.current.setData(rsiData);
        }

        // 5.6. Update MACD series data
        if (indicators.macd && macdLineSeriesRef.current && macdSignalSeriesRef.current && macdHistSeriesRef.current) {
            const macdResult = calculateMACD(closes);

            const macdData: LineData[] = macdResult.macd
                .map((v, i) => (v !== null ? { time: bars[i].time as Time, value: v } : null))
                .filter(Boolean) as LineData[];
            macdLineSeriesRef.current.setData(macdData);

            const signalData: LineData[] = macdResult.signal
                .map((v, i) => (v !== null ? { time: bars[i].time as Time, value: v } : null))
                .filter(Boolean) as LineData[];
            macdSignalSeriesRef.current.setData(signalData);

            const histData: HistogramData[] = macdResult.histogram
                .map((v, i) =>
                    v !== null
                        ? {
                              time: bars[i].time as Time,
                              value: v,
                              color: v >= 0 ? colors.macdHistUp : colors.macdHistDown,
                          }
                        : null
                )
                .filter(Boolean) as HistogramData[];
            macdHistSeriesRef.current.setData(histData);
        }
    }, [bars, indicators, signalLevels, colors, formatBars, symbol, interval]);

    return (
        <div className="flex flex-col w-full h-full min-w-0 overflow-hidden">
            {/* Crosshair OHLCV Display */}
            {crosshairData && (
                <div className="flex items-center gap-3 px-3 py-1 text-[11px] font-mono border-b border-border/30 flex-shrink-0 bg-background/50 backdrop-blur-sm">
                    <span className="text-muted-foreground">{crosshairData.time}</span>
                    <span>
                        O{" "}
                        <span className="text-foreground font-medium">
                            {crosshairData.open.toFixed(2)}
                        </span>
                    </span>
                    <span>
                        H{" "}
                        <span className="text-green-500 font-medium">
                            {crosshairData.high.toFixed(2)}
                        </span>
                    </span>
                    <span>
                        L{" "}
                        <span className="text-red-500 font-medium">
                            {crosshairData.low.toFixed(2)}
                        </span>
                    </span>
                    <span>
                        C{" "}
                        <span
                            className={`font-medium ${
                                crosshairData.close >= crosshairData.open
                                    ? "text-green-500"
                                    : "text-red-500"
                            }`}
                        >
                            {crosshairData.close.toFixed(2)}
                        </span>
                    </span>
                    {crosshairData.volume > 0 && (
                        <span>
                            Vol{" "}
                            <span className="text-muted-foreground">
                                {formatVolume(crosshairData.volume)}
                            </span>
                        </span>
                    )}
                </div>
            )}

            {/* Main Chart */}
            <div ref={chartContainerRef} className="flex-1 min-h-[200px] w-full relative overflow-hidden" />

            {/* RSI Sub-chart */}
            {indicators.rsi && (
                <div className="relative border-t border-border/30">
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-muted-foreground z-10">
                        RSI (14)
                    </span>
                    <div ref={rsiContainerRef} className="h-[100px]" />
                </div>
            )}

            {/* MACD Sub-chart */}
            {indicators.macd && (
                <div className="relative border-t border-border/30">
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-muted-foreground z-10">
                        MACD (12, 26, 9)
                    </span>
                    <div ref={macdContainerRef} className="h-[100px]" />
                </div>
            )}
        </div>
    );
}

// Helper: Add line series to chart
function addLineSeries(
    chart: IChartApi,
    id: string,
    bars: OHLCVBar[],
    values: (number | null)[],
    color: string,
    lineWidth: number
) {
    const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: lineWidth as any,
        crosshairMarkerVisible: false,
        lastValueVisible: false,
        priceLineVisible: false,
    });

    const data: LineData[] = values
        .map((v, i) => (v !== null ? { time: bars[i].time as Time, value: v } : null))
        .filter(Boolean) as LineData[];

    series.setData(data);
    return series;
}

// Helper: Add price line
function addPriceLine(series: ISeriesApi<any>, price: number, color: string, title: string) {
    return series.createPriceLine({
        price,
        color,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title,
    });
}

// Helper: Format volume
function formatVolume(vol: number): string {
    if (vol >= 1e9) return (vol / 1e9).toFixed(2) + "B";
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + "M";
    if (vol >= 1e3) return (vol / 1e3).toFixed(1) + "K";
    return vol.toString();
}
