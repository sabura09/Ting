"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpRight, ArrowDownRight, Briefcase, Plus, Minus, Loader2, DollarSign } from "lucide-react";
import type { MarketType, Quote } from "@/lib/market-data";

interface Holding {
    id: string;
    symbol: string;
    market_type: MarketType;
    quantity: string | number;
    avg_entry_price: string | number;
    created_at: string;
}

interface PortfolioPanelProps {
    currentSymbol: string;
    currentType: MarketType;
    currentPrice: number;
}

export default function PortfolioPanel({
    currentSymbol,
    currentType,
    currentPrice,
}: PortfolioPanelProps) {
    const [holdings, setHoldings] = useState<Holding[]>([]);
    const [quotes, setQuotes] = useState<Record<string, Quote>>({});
    const [loading, setLoading] = useState(true);
    const [tradeType, setTradeType] = useState<"BUY" | "SELL">("BUY");
    const [quantity, setQuantity] = useState("");
    const [trading, setTrading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchHoldings = useCallback(async () => {
        try {
            const res = await fetch("/api/market/portfolio");
            if (res.ok) {
                const data = await res.json();
                setHoldings(data.holdings || []);
            }
        } catch (err) {
            console.error("Failed to fetch portfolio:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuotes = useCallback(async (hList: Holding[]) => {
        if (hList.length === 0) return;
        try {
            const newQuotes: Record<string, Quote> = {};
            await Promise.all(
                hList.map(async (h) => {
                    if (newQuotes[h.symbol]) return;
                    try {
                        const res = await fetch(
                            `/api/market/quote?symbol=${encodeURIComponent(h.symbol)}&type=${h.market_type}`
                        );
                        if (res.ok) {
                            newQuotes[h.symbol] = await res.json();
                        }
                    } catch (e) {
                        console.error(e);
                    }
                })
            );
            setQuotes((prev) => ({ ...prev, ...newQuotes }));
        } catch (err) {
            console.error("Failed to fetch portfolio quotes:", err);
        }
    }, []);

    useEffect(() => {
        fetchHoldings();
    }, [fetchHoldings]);

    useEffect(() => {
        if (holdings.length > 0) {
            fetchQuotes(holdings);
        }
    }, [holdings, fetchQuotes]);

    const executeTrade = async (e: React.FormEvent) => {
        e.preventDefault();
        const qtyValue = parseFloat(quantity);
        if (isNaN(qtyValue) || qtyValue <= 0) return;

        setTrading(true);
        try {
            // If selling, we need to pass a negative quantity or use a sell action.
            // Our portfolio API accepts positive quantity and merges them, or allows closing.
            // Let's pass negative quantity if selling to reduce position.
            const targetQty = tradeType === "BUY" ? qtyValue : -qtyValue;

            const res = await fetch("/api/market/portfolio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add",
                    symbol: currentSymbol,
                    marketType: currentType,
                    quantity: targetQty,
                    entryPrice: currentPrice,
                }),
            });

            if (res.ok) {
                await fetchHoldings();
                setQuantity("");
            }
        } catch (err) {
            console.error("Trade failed:", err);
        } finally {
            setTrading(false);
        }
    };

    const closePosition = async (holdingId: string) => {
        setActionLoading(holdingId);
        try {
            const res = await fetch("/api/market/portfolio", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "close",
                    holdingId,
                }),
            });
            if (res.ok) {
                setHoldings((prev) => prev.filter((h) => h.id !== holdingId));
            }
        } catch (err) {
            console.error("Close position failed:", err);
        } finally {
            setActionLoading(null);
        }
    };

    // Calculations for portfolio summary
    let totalPortfolioValue = 0;
    let totalCostBasis = 0;

    holdings.forEach((h) => {
        const qty = parseFloat(h.quantity as string);
        const avgEntry = parseFloat(h.avg_entry_price as string);
        const curPrice = quotes[h.symbol]?.price || avgEntry;

        totalPortfolioValue += qty * curPrice;
        totalCostBasis += qty * avgEntry;
    });

    const totalPnL = totalPortfolioValue - totalCostBasis;
    const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;
    const isTotalPnLPositive = totalPnL >= 0;

    const currentHolding = holdings.find((h) => h.symbol === currentSymbol);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs font-mono">Loading portfolio...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Portfolio Summary Card */}
            <Card className="p-4 border border-border/30 bg-gradient-to-br from-card/30 to-card/5 select-none shadow-md">
                <div className="flex justify-between items-start">
                    <div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Briefcase className="w-3.5 h-3.5" /> Paper Portfolio Value
                        </span>
                        <div className="text-2xl font-bold font-mono tracking-tight mt-1 text-foreground">
                            ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-muted-foreground block">Total P&L</span>
                        <div className={`flex items-center justify-end text-sm font-semibold font-mono mt-1 ${
                            isTotalPnLPositive ? "text-green-500" : "text-red-500"
                        }`}>
                            {isTotalPnLPositive ? (
                                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                            ) : (
                                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                            )}
                            {isTotalPnLPositive ? "+" : ""}
                            ${Math.abs(totalPnL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-xs ml-1">
                                ({isTotalPnLPositive ? "+" : ""}
                                {totalPnLPercent.toFixed(2)}%)
                            </span>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Trading Form */}
            <Card className="p-3 border border-border/30 bg-card/10 space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Quick Trade: {currentSymbol}
                    </span>
                    {currentHolding && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                            Holding: {parseFloat(currentHolding.quantity as string).toFixed(4)}
                        </span>
                    )}
                </div>

                <form onSubmit={executeTrade} className="space-y-2.5">
                    {/* BUY / SELL Switch */}
                    <div className="grid grid-cols-2 gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/20">
                        <button
                            type="button"
                            onClick={() => setTradeType("BUY")}
                            className={`py-1 text-xs font-medium rounded transition-colors ${
                                tradeType === "BUY"
                                    ? "bg-green-500 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Buy
                        </button>
                        <button
                            type="button"
                            onClick={() => setTradeType("SELL")}
                            className={`py-1 text-xs font-medium rounded transition-colors ${
                                tradeType === "SELL"
                                    ? "bg-red-500 text-white shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            Sell
                        </button>
                    </div>

                    {/* Quantity & Price */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground block">Quantity</span>
                            <Input
                                type="number"
                                step="any"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                placeholder="0.00"
                                className="h-8 text-xs font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <span className="text-[10px] text-muted-foreground block">Price (Est.)</span>
                            <div className="h-8 flex items-center px-3 border border-border/40 bg-muted/20 rounded-lg text-xs font-mono text-foreground/80 w-full">
                                ${currentPrice.toFixed(currentPrice > 100 ? 2 : 4)}
                            </div>
                        </div>
                    </div>

                    {/* Trade Info */}
                    {quantity && parseFloat(quantity) > 0 && (
                        <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border/20 pt-2 font-mono">
                            <span>Cost Estimate:</span>
                            <span className="font-semibold text-foreground">
                                ${(parseFloat(quantity) * currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    )}

                    <Button
                        type="submit"
                        disabled={trading || !quantity || parseFloat(quantity) <= 0 || (tradeType === "SELL" && (!currentHolding || parseFloat(currentHolding.quantity as string) < parseFloat(quantity)))}
                        className={`w-full h-8 text-xs gap-1 ${
                            tradeType === "BUY"
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-red-600 hover:bg-red-700 text-white"
                        }`}
                    >
                        {trading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            tradeType === "BUY" ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />
                        )}
                        Place {tradeType} Order
                    </Button>
                </form>
            </Card>

            {/* Holdings List */}
            <div className="flex-1 flex flex-col min-h-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Holdings ({holdings.length})
                </span>
                <ScrollArea className="flex-1 border border-border/30 rounded-lg bg-card/5 trading-scroll-area">
                    {holdings.length > 0 ? (
                        <div className="divide-y divide-border/20">
                            {holdings.map((h) => {
                                const qty = parseFloat(h.quantity as string);
                                const avgEntry = parseFloat(h.avg_entry_price as string);
                                const q = quotes[h.symbol];
                                const curPrice = q?.price || avgEntry;

                                const value = qty * curPrice;
                                const costBasis = qty * avgEntry;
                                const pnl = value - costBasis;
                                const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
                                const isPos = pnl >= 0;

                                return (
                                    <div
                                        key={h.id}
                                        className="p-3 flex items-center justify-between gap-2 hover:bg-muted/10 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-semibold text-xs">{h.symbol}</span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-[8px] px-1 py-0 h-3.5 opacity-55"
                                                >
                                                    {h.market_type}
                                                </Badge>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                Qty: <span className="font-mono">{qty.toFixed(4)}</span> @{" "}
                                                <span className="font-mono">${avgEntry.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-xs font-bold font-mono">
                                                    ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </div>
                                                <div
                                                    className={`flex items-center justify-end text-[10px] font-mono ${
                                                        isPos ? "text-green-500" : "text-red-500"
                                                    }`}
                                                >
                                                    {isPos ? (
                                                        <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                                                    ) : (
                                                        <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
                                                    )}
                                                    {isPos ? "+" : ""}
                                                    {pnlPercent.toFixed(2)}%
                                                </div>
                                            </div>

                                            {/* Close position action */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => closePosition(h.id)}
                                                disabled={actionLoading === h.id}
                                                className="h-7 px-2 hover:text-red-500 border border-border/40 hover:border-red-500/30"
                                            >
                                                {actionLoading === h.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    "Close"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-15" />
                            <p className="text-xs">No holdings yet</p>
                            <p className="text-[10px] mt-1 text-muted-foreground/60">
                                Buy some tickers above to start paper trading!
                            </p>
                        </div>
                    )}
                </ScrollArea>
            </div>
        </div>
    );
}
