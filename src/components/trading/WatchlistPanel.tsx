"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, ArrowUpRight, ArrowDownRight, Star, Loader2 } from "lucide-react";
import type { MarketType, Quote } from "@/lib/market-data";

interface WatchlistSymbol {
    symbol: string;
    type: MarketType;
    addedAt: string;
}

interface Watchlist {
    id: string;
    name: string;
    symbols: WatchlistSymbol[];
    is_default: boolean;
}

interface WatchlistPanelProps {
    currentSymbol: string;
    currentType: MarketType;
    onSelectSymbol: (symbol: string, type: MarketType) => void;
}

export default function WatchlistPanel({
    currentSymbol,
    currentType,
    onSelectSymbol,
}: WatchlistPanelProps) {
    const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
    const [activeWatchlist, setActiveWatchlist] = useState<Watchlist | null>(null);
    const [quotes, setQuotes] = useState<Record<string, Quote>>({});
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchWatchlists = useCallback(async () => {
        try {
            const res = await fetch("/api/market/watchlist");
            if (res.ok) {
                const data = await res.json();
                setWatchlists(data.watchlists || []);
                const def = data.watchlists?.find((w: Watchlist) => w.is_default) || data.watchlists?.[0] || null;
                setActiveWatchlist(def);
            }
        } catch (err) {
            console.error("Failed to fetch watchlists:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchQuotes = useCallback(async (symbols: WatchlistSymbol[]) => {
        if (symbols.length === 0) return;
        try {
            const newQuotes: Record<string, Quote> = {};
            await Promise.all(
                symbols.map(async (s) => {
                    try {
                        const res = await fetch(
                            `/api/market/quote?symbol=${encodeURIComponent(s.symbol)}&type=${s.type}`
                        );
                        if (res.ok) {
                            newQuotes[s.symbol] = await res.json();
                        }
                    } catch (e) {
                        console.error(`Failed to fetch quote for ${s.symbol}:`, e);
                    }
                })
            );
            setQuotes((prev) => ({ ...prev, ...newQuotes }));
        } catch (err) {
            console.error("Failed to fetch quotes:", err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchWatchlists();
    }, [fetchWatchlists]);

    // Fetch quotes when active watchlist symbols change
    useEffect(() => {
        if (activeWatchlist) {
            fetchQuotes(activeWatchlist.symbols);
            // Setup polling every 30s
            const interval = window.setInterval(() => {
                fetchQuotes(activeWatchlist.symbols);
            }, 30000);
            return () => clearInterval(interval);
        }
    }, [activeWatchlist, fetchQuotes]);

    const addToWatchlist = async () => {
        if (!activeWatchlist) return;
        const exists = activeWatchlist.symbols.some((s) => s.symbol === currentSymbol);
        if (exists) return;

        setActionLoading("add");
        try {
            const res = await fetch("/api/market/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "add_symbol",
                    watchlistId: activeWatchlist.id,
                    symbol: currentSymbol,
                    type: currentType,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                // Update local state
                setWatchlists((prev) =>
                    prev.map((w) => (w.id === activeWatchlist.id ? data.watchlist : w))
                );
                setActiveWatchlist(data.watchlist);
            }
        } catch (err) {
            console.error("Failed to add to watchlist:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const removeFromWatchlist = async (e: React.MouseEvent, symbolToRemove: string) => {
        e.stopPropagation(); // Prevent selecting the symbol
        if (!activeWatchlist) return;

        setActionLoading(symbolToRemove);
        try {
            const res = await fetch("/api/market/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "remove_symbol",
                    watchlistId: activeWatchlist.id,
                    symbol: symbolToRemove,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setWatchlists((prev) =>
                    prev.map((w) => (w.id === activeWatchlist.id ? data.watchlist : w))
                );
                setActiveWatchlist(data.watchlist);
            }
        } catch (err) {
            console.error("Failed to remove from watchlist:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const isCurrentInWatchlist = activeWatchlist?.symbols.some((s) => s.symbol === currentSymbol) || false;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs font-mono">Loading watchlist...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card/10">
            {/* Quick Add header */}
            <div className="p-3 border-b border-border/30 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-primary" /> {activeWatchlist?.name || "Watchlist"}
                </span>
                {!isCurrentInWatchlist && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={addToWatchlist}
                        disabled={actionLoading === "add"}
                        className="h-6 text-[10px] gap-1 px-2 border-primary/20 hover:border-primary/50 text-primary bg-primary/5"
                    >
                        {actionLoading === "add" ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : (
                            <Plus className="w-2.5 h-2.5" />
                        )}
                        Watch {currentSymbol}
                    </Button>
                )}
            </div>

            {/* List */}
            <ScrollArea className="flex-1 trading-scroll-area">
                {activeWatchlist && activeWatchlist.symbols.length > 0 ? (
                    <div className="divide-y divide-border/20">
                        {activeWatchlist.symbols.map((item) => {
                            const q = quotes[item.symbol];
                            const priceChange = q?.changePercent || 0;
                            const isPositive = priceChange >= 0;

                            return (
                                <div
                                    key={item.symbol}
                                    onClick={() => onSelectSymbol(item.symbol, item.type)}
                                    className={`group flex items-center justify-between p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                                        item.symbol === currentSymbol ? "bg-primary/5 border-r-2 border-primary" : ""
                                    }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-xs tracking-tight">{item.symbol}</span>
                                            <Badge
                                                variant="outline"
                                                className="text-[8px] px-1 py-0 h-3.5 opacity-55 text-[10px]"
                                            >
                                                {item.type}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Quote Display */}
                                    <div className="flex items-center gap-3">
                                        {q ? (
                                            <div className="text-right">
                                                <div className="text-xs font-bold font-mono">
                                                    ${q.price?.toFixed(q.price > 100 ? 2 : q.price > 1 ? 4 : 6)}
                                                </div>
                                                <div
                                                    className={`flex items-center justify-end text-[10px] font-mono ${
                                                        isPositive ? "text-green-500" : "text-red-500"
                                                    }`}
                                                >
                                                    {isPositive ? (
                                                        <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
                                                    ) : (
                                                        <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
                                                    )}
                                                    {isPositive ? "+" : ""}
                                                    {priceChange.toFixed(2)}%
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-muted-foreground/40 font-mono">--</div>
                                        )}

                                        {/* Remove Action */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => removeFromWatchlist(e, item.symbol)}
                                            disabled={actionLoading === item.symbol}
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                                        >
                                            {actionLoading === item.symbol ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3 h-3 text-muted-foreground/40 hover:text-red-500" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 px-4 text-muted-foreground">
                        <Star className="w-8 h-8 mx-auto mb-2 opacity-15" />
                        <p className="text-xs">Your watchlist is empty</p>
                        <p className="text-[10px] mt-1 text-muted-foreground/60">
                            Click &quot;Watch {currentSymbol}&quot; above to track it
                        </p>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
