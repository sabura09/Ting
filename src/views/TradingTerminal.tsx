"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Search, TrendingUp, TrendingDown, BarChart3, Activity,
    Zap, Brain, Target, AlertTriangle, ChevronDown,
    Minus, ArrowUpRight, ArrowDownRight, RefreshCw,
    Layers, Eye, EyeOff, CandlestickChart, LineChart,
    Bitcoin, DollarSign, Shield, Clock, Star, Bell,
    PanelLeft, Briefcase,
} from "lucide-react";
import { useGeminiStream } from "@/hooks/useGeminiStream";
import { systemPrompts } from "@/config/prompts";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import SymbolSearch from "@/components/trading/SymbolSearch";
import WatchlistPanel from "@/components/trading/WatchlistPanel";
import AlertsPanel from "@/components/trading/AlertsPanel";
import PortfolioPanel from "@/components/trading/PortfolioPanel";
import type { OHLCVBar, MarketType, TimeInterval, Quote } from "@/lib/market-data";

// Dynamic import for TradingChart (uses browser APIs)
const TradingChart = dynamic(() => import("@/components/trading/TradingChart"), {
    ssr: false,
    loading: () => (
        <div className="flex-1 flex items-center justify-center bg-card/30">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground font-mono">Loading chart...</span>
            </div>
        </div>
    ),
});

const TIMEFRAMES: { label: string; value: TimeInterval; shortcut: string }[] = [
    { label: "1m", value: "1m", shortcut: "1" },
    { label: "5m", value: "5m", shortcut: "2" },
    { label: "15m", value: "15m", shortcut: "3" },
    { label: "1H", value: "1h", shortcut: "4" },
    { label: "4H", value: "4h", shortcut: "5" },
    { label: "1D", value: "1d", shortcut: "6" },
    { label: "1W", value: "1w", shortcut: "7" },
    { label: "1M", value: "1M", shortcut: "8" },
];

const DEFAULT_INDICATORS = {
    sma20: false,
    sma50: false,
    sma200: false,
    ema9: true,
    ema21: true,
    bollinger: false,
    vwap: false,
    rsi: true,
    macd: false,
    volume: true,
};

interface Signal {
    direction: "BUY" | "SELL" | "HOLD";
    confidence: number;
    entryPrice: number;
    stopLoss: number;
    takeProfit: number;
    riskReward: string;
    reasoning: string[];
    strategy: string;
}

export default function TradingTerminal() {
    // State
    const [symbol, setSymbol] = useState("BTC");
    const [marketType, setMarketType] = useState<MarketType>("crypto");
    const [interval, setInterval] = useState<TimeInterval>("1d");
    const [bars, setBars] = useState<OHLCVBar[]>([]);
    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [indicators, setIndicators] = useState(DEFAULT_INDICATORS);
    const [showIndicatorPanel, setShowIndicatorPanel] = useState(false);
    const [rightPanel, setRightPanel] = useState<"analysis" | "signals" | "portfolio">("analysis");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarTab, setSidebarTab] = useState<"watchlist" | "alerts">("watchlist");
    const [signal, setSignal] = useState<Signal | null>(null);
    const [signalLoading, setSignalLoading] = useState(false);
    const [analysisData, setAnalysisData] = useState<any>(null);

    // AI Streaming
    const { generateStream, isStreaming, streamedText } = useGeminiStream();
    const [aiAnalysis, setAiAnalysis] = useState("");

    // Fetch chart data
    const fetchData = useCallback(async (sym: string, type: MarketType, tf: TimeInterval, isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [histRes, quoteRes] = await Promise.allSettled([
                fetch(`/api/market/history?symbol=${encodeURIComponent(sym)}&type=${type}&interval=${tf}`),
                fetch(`/api/market/quote?symbol=${encodeURIComponent(sym)}&type=${type}`),
            ]);

            if (histRes.status === "fulfilled" && histRes.value.ok) {
                const data = await histRes.value.json();
                setBars(data.bars || []);
            }

            if (quoteRes.status === "fulfilled" && quoteRes.value.ok) {
                const data = await quoteRes.value.json();
                setQuote(data);
            }
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, []);

    // Initial load and live background polling (every 10 seconds)
    useEffect(() => {
        fetchData(symbol, marketType, interval, false);

        const pollInterval = window.setInterval(() => {
            fetchData(symbol, marketType, interval, true);
        }, 10000);

        return () => window.clearInterval(pollInterval);
    }, [symbol, marketType, interval, fetchData]);

    // Keyboard shortcuts
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setSearchOpen(true);
            }

            // Timeframe shortcuts
            const tfIndex = parseInt(e.key) - 1;
            if (tfIndex >= 0 && tfIndex < TIMEFRAMES.length && !e.metaKey && !e.ctrlKey) {
                setInterval(TIMEFRAMES[tfIndex].value);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Symbol select handler
    const handleSymbolSelect = (sym: string, type: MarketType) => {
        setBars([]); // Clear bars to show loading state
        setSymbol(sym);
        setMarketType(type);
        setAiAnalysis("");
        setSignal(null);
    };

    // AI Analysis
    const runAnalysis = async () => {
        setAiAnalysis("");
        try {
            const analyzeRes = await fetch("/api/market/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol, type: marketType, interval }),
            });
            const data = await analyzeRes.json();
            setAnalysisData(data.analysis);

            // Stream AI analysis
            const response = await generateStream(
                systemPrompts["trading-analysis"] || systemPrompts.finance,
                data.prompt,
                undefined,
                undefined,
                "trading-terminal"
            );
            setAiAnalysis(response.text);
        } catch (err) {
            console.error("Analysis failed:", err);
        }
    };

    // Generate Signal
    const generateSignal = async () => {
        setSignalLoading(true);
        try {
            const res = await fetch("/api/market/signals", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol, type: marketType, interval }),
            });
            const data = await res.json();
            if (data.signal) {
                setSignal(data.signal);
            }
        } catch (err) {
            console.error("Signal generation failed:", err);
        } finally {
            setSignalLoading(false);
        }
    };

    const toggleIndicator = (key: keyof typeof indicators) => {
        setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const priceChange = quote?.change || 0;
    const priceChangePercent = quote?.changePercent || 0;
    const isPositive = priceChange >= 0;

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-background via-background to-background">
            {/* ═══════ TOP BAR ═══════ */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-card/30 backdrop-blur-sm flex-shrink-0">
                {/* Sidebar Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="h-8 w-8 p-0"
                >
                    <PanelLeft className={`w-4 h-4 transition-transform ${sidebarOpen ? "text-primary" : "text-muted-foreground"}`} />
                </Button>

                {/* Symbol Info */}
                <button
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                    <div className="flex items-center gap-1.5">
                        {marketType === "crypto" && <Bitcoin className="w-4 h-4 text-amber-400" />}
                        {marketType === "stock" && <TrendingUp className="w-4 h-4 text-blue-400" />}
                        {marketType === "forex" && <DollarSign className="w-4 h-4 text-emerald-400" />}
                        <span className="font-bold text-base tracking-tight">{symbol}</span>
                        <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 h-4 opacity-60"
                        >
                            {marketType}
                        </Badge>
                    </div>
                    <Search className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Price Display */}
                {quote && (
                    <div className="flex items-center gap-3 px-3 border-l border-border/30">
                        <span className="text-lg font-bold font-mono tracking-tight">
                            ${quote.price?.toFixed(quote.price > 100 ? 2 : quote.price > 1 ? 4 : 6)}
                        </span>
                        <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? "text-green-500" : "text-red-500"}`}>
                            {isPositive ? (
                                <ArrowUpRight className="w-4 h-4" />
                            ) : (
                                <ArrowDownRight className="w-4 h-4" />
                            )}
                            <span>{isPositive ? "+" : ""}{priceChange.toFixed(2)}</span>
                            <span className="text-xs">({isPositive ? "+" : ""}{priceChangePercent.toFixed(2)}%)</span>
                        </div>
                    </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Timeframe Selector */}
                <div className="flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5">
                    {TIMEFRAMES.map((tf) => (
                        <button
                            key={tf.value}
                            onClick={() => {
                                setBars([]); // Clear bars on interval change
                                setInterval(tf.value);
                            }}
                            className={`px-2 py-1 text-[11px] font-mono rounded-md transition-all ${
                                interval === tf.value
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                <Separator orientation="vertical" className="h-5 mx-1" />

                {/* Indicator Toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIndicatorPanel(!showIndicatorPanel)}
                    className="h-7 px-2 text-xs gap-1"
                >
                    <Layers className="w-3.5 h-3.5" />
                    Indicators
                </Button>

                {/* Refresh */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchData(symbol, marketType, interval)}
                    disabled={loading}
                    className="h-7 w-7 p-0"
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>

                {/* Keyboard hint */}
                <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-mono text-muted-foreground/40 bg-muted/20 rounded border border-border/20">
                    ⌘K
                </kbd>
            </div>

            {/* ═══════ INDICATOR PANEL (Collapsible) ═══════ */}
            {showIndicatorPanel && (
                <div className="flex items-center gap-4 px-4 py-2 border-b border-border/30 bg-card/20 backdrop-blur-sm flex-shrink-0 overflow-x-auto">
                    {[
                        { key: "ema9", label: "EMA 9", color: "text-cyan-400" },
                        { key: "ema21", label: "EMA 21", color: "text-pink-400" },
                        { key: "sma20", label: "SMA 20", color: "text-amber-400" },
                        { key: "sma50", label: "SMA 50", color: "text-blue-400" },
                        { key: "sma200", label: "SMA 200", color: "text-purple-400" },
                        { key: "bollinger", label: "Bollinger", color: "text-purple-400" },
                        { key: "vwap", label: "VWAP", color: "text-orange-400" },
                        { key: "rsi", label: "RSI", color: "text-cyan-400" },
                        { key: "macd", label: "MACD", color: "text-blue-400" },
                        { key: "volume", label: "Volume", color: "text-gray-400" },
                    ].map(({ key, label, color }) => (
                        <div key={key} className="flex items-center gap-1.5 flex-shrink-0">
                            <Switch
                                id={`ind-${key}`}
                                checked={indicators[key as keyof typeof indicators]}
                                onCheckedChange={() => toggleIndicator(key as keyof typeof indicators)}
                                className="scale-75"
                            />
                            <Label
                                htmlFor={`ind-${key}`}
                                className={`text-[11px] font-mono cursor-pointer ${
                                    indicators[key as keyof typeof indicators] ? color : "text-muted-foreground/40"
                                }`}
                            >
                                {label}
                            </Label>
                        </div>
                    ))}
                </div>
            )}

            {/* ═══════ MAIN CONTENT ═══════ */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
                {/* ═══════ LEFT SIDEBAR ═══════ */}
                {sidebarOpen && (
                    <div className="w-[280px] border-r border-border/30 bg-card/20 backdrop-blur-sm flex-shrink-0 flex flex-col animate-in slide-in-from-left duration-200">
                        {/* Sidebar Tabs */}
                        <div className="flex items-center border-b border-border/30 flex-shrink-0">
                            <button
                                onClick={() => setSidebarTab("watchlist")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                                    sidebarTab === "watchlist"
                                        ? "text-primary border-b-2 border-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Star className="w-3.5 h-3.5" />
                                Watchlist
                            </button>
                            <button
                                onClick={() => setSidebarTab("alerts")}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                                    sidebarTab === "alerts"
                                        ? "text-primary border-b-2 border-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                <Bell className="w-3.5 h-3.5" />
                                Alerts
                            </button>
                        </div>
                        {/* Sidebar Content */}
                        <div className="flex-1 min-h-0">
                            {sidebarTab === "watchlist" ? (
                                <WatchlistPanel
                                    currentSymbol={symbol}
                                    currentType={marketType}
                                    onSelectSymbol={handleSymbolSelect}
                                />
                            ) : (
                                <AlertsPanel
                                    currentSymbol={symbol}
                                    currentType={marketType}
                                    currentPrice={quote?.price || (bars.length > 0 ? bars[bars.length - 1].close : 0)}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Chart Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {bars.length > 0 ? (
                        <TradingChart
                            key={`${symbol}-${interval}`}
                            bars={bars}
                            symbol={symbol}
                            interval={interval}
                            indicators={indicators}
                            signalLevels={signal ? {
                                entry: signal.entryPrice,
                                stopLoss: signal.stopLoss,
                                takeProfit: signal.takeProfit,
                            } : undefined}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            {loading ? (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <span className="text-sm text-muted-foreground font-mono">
                                        Loading {symbol} data...
                                    </span>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground">
                                    <CandlestickChart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No data available</p>
                                    <p className="text-xs mt-1">Try a different symbol or timeframe</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ═══════ RIGHT PANEL ═══════ */}
                <div className="w-[380px] border-l border-border/30 bg-card/20 backdrop-blur-sm flex-shrink-0 hidden lg:flex flex-col">
                    {/* Panel Tabs */}
                    <div className="flex items-center border-b border-border/30 flex-shrink-0">
                        <button
                            onClick={() => setRightPanel("analysis")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                                rightPanel === "analysis"
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Brain className="w-3.5 h-3.5" />
                            AI Analysis
                        </button>
                        <button
                            onClick={() => setRightPanel("signals")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                                rightPanel === "signals"
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5" />
                            Signals
                        </button>
                        <button
                            onClick={() => setRightPanel("portfolio")}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                                rightPanel === "portfolio"
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <Briefcase className="w-3.5 h-3.5" />
                            Portfolio
                        </button>
                    </div>

                    {/* Panel Content */}
                    <ScrollArea className="flex-1 trading-scroll-area">
                        {rightPanel === "analysis" && (
                            <div className="p-4 space-y-4">
                                <Button
                                    onClick={runAnalysis}
                                    disabled={isStreaming || bars.length === 0}
                                    className="w-full gap-2"
                                    size="sm"
                                >
                                    {isStreaming ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                            Analyzing...
                                        </>
                                    ) : (
                                        <>
                                            <Brain className="w-3.5 h-3.5" />
                                            Analyze {symbol}
                                        </>
                                    )}
                                </Button>

                                {(isStreaming ? streamedText : aiAnalysis) ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none break-words overflow-x-hidden">
                                        <MarkdownRenderer
                                            content={isStreaming ? streamedText : aiAnalysis}
                                        />
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Brain className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">AI Analysis</p>
                                        <p className="text-xs mt-1 max-w-[200px] mx-auto">
                                            Click "Analyze" to get AI-powered technical analysis
                                        </p>
                                    </div>
                                )}

                                {/* Disclaimer */}
                                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-[10px] text-amber-500/80 leading-relaxed">
                                            For educational purposes only. Not financial advice. 
                                            Always do your own research before making investment decisions.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {rightPanel === "signals" && (
                            <div className="p-4 space-y-4">
                                <Button
                                    onClick={generateSignal}
                                    disabled={signalLoading || bars.length === 0}
                                    className="w-full gap-2"
                                    size="sm"
                                    variant={signal?.direction === "BUY" ? "default" : signal?.direction === "SELL" ? "destructive" : "default"}
                                >
                                    {signalLoading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="w-3.5 h-3.5" />
                                            Generate Signal
                                        </>
                                    )}
                                </Button>

                                {signal ? (
                                    <div className="space-y-4">
                                        {/* Signal Card */}
                                        <Card className={`p-4 border-2 ${
                                            signal.direction === "BUY"
                                                ? "border-green-500/30 bg-green-500/5"
                                                : signal.direction === "SELL"
                                                ? "border-red-500/30 bg-red-500/5"
                                                : "border-yellow-500/30 bg-yellow-500/5"
                                        }`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <Badge className={`text-sm px-3 py-1 font-bold ${
                                                    signal.direction === "BUY"
                                                        ? "bg-green-500 text-white"
                                                        : signal.direction === "SELL"
                                                        ? "bg-red-500 text-white"
                                                        : "bg-yellow-500 text-black"
                                                }`}>
                                                    {signal.direction === "BUY" && <ArrowUpRight className="w-4 h-4 mr-1" />}
                                                    {signal.direction === "SELL" && <ArrowDownRight className="w-4 h-4 mr-1" />}
                                                    {signal.direction === "HOLD" && <Minus className="w-4 h-4 mr-1" />}
                                                    {signal.direction}
                                                </Badge>
                                                <div className="text-right">
                                                    <div className="text-xs text-muted-foreground">Confidence</div>
                                                    <div className={`text-lg font-bold font-mono ${
                                                        signal.confidence >= 70
                                                            ? "text-green-500"
                                                            : signal.confidence >= 50
                                                            ? "text-yellow-500"
                                                            : "text-red-500"
                                                    }`}>
                                                        {signal.confidence}%
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Confidence Bar */}
                                            <div className="w-full h-2 bg-muted rounded-full mb-4 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        signal.confidence >= 70
                                                            ? "bg-green-500"
                                                            : signal.confidence >= 50
                                                            ? "bg-yellow-500"
                                                            : "bg-red-500"
                                                    }`}
                                                    style={{ width: `${signal.confidence}%` }}
                                                />
                                            </div>

                                            {/* Price Levels */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50">
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                                        <Target className="w-3 h-3" /> Entry
                                                    </span>
                                                    <span className="text-sm font-mono font-medium">
                                                        ${signal.entryPrice.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 px-2 rounded bg-red-500/5">
                                                    <span className="text-xs text-red-500/80 flex items-center gap-1.5">
                                                        <Shield className="w-3 h-3" /> Stop Loss
                                                    </span>
                                                    <span className="text-sm font-mono font-medium text-red-500">
                                                        ${signal.stopLoss.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between py-1.5 px-2 rounded bg-green-500/5">
                                                    <span className="text-xs text-green-500/80 flex items-center gap-1.5">
                                                        <Star className="w-3 h-3" /> Take Profit
                                                    </span>
                                                    <span className="text-sm font-mono font-medium text-green-500">
                                                        ${signal.takeProfit.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                                                <span className="text-[10px] text-muted-foreground">Risk/Reward</span>
                                                <Badge variant="outline" className="text-[10px] font-mono">
                                                    {signal.riskReward}
                                                </Badge>
                                            </div>
                                        </Card>

                                        {/* Reasoning */}
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Signal Reasoning
                                            </h4>
                                            <div className="space-y-1.5">
                                                {signal.reasoning.map((reason, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-start gap-2 text-xs text-muted-foreground"
                                                    >
                                                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                                                            reason.toLowerCase().includes("bullish") || reason.toLowerCase().includes("above")
                                                                ? "bg-green-500"
                                                                : reason.toLowerCase().includes("bearish") || reason.toLowerCase().includes("below")
                                                                ? "bg-red-500"
                                                                : "bg-yellow-500"
                                                        }`} />
                                                        <span>{reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-muted-foreground/50 text-center mt-2">
                                            Strategy: {signal.strategy}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Signal Generator</p>
                                        <p className="text-xs mt-1 max-w-[200px] mx-auto">
                                            Generate AI-powered trading signals with entry, SL & TP levels
                                        </p>
                                    </div>
                                )}

                                {/* Disclaimer */}
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <p className="text-[10px] text-amber-500/80 leading-relaxed">
                                            Signals are algorithm-generated for educational purposes only. 
                                            Not financial advice. Past performance does not guarantee future results.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {rightPanel === "portfolio" && (
                            <div className="p-4">
                                <PortfolioPanel
                                    currentSymbol={symbol}
                                    currentType={marketType}
                                    currentPrice={quote?.price || (bars.length > 0 ? bars[bars.length - 1].close : 0)}
                                />
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>

            {/* Symbol Search Modal */}
            <SymbolSearch
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                onSelect={handleSymbolSelect}
            />
        </div>
    );
}
