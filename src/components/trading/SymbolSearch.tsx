"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X, TrendingUp, Bitcoin, DollarSign, Clock } from "lucide-react";
import type { MarketSearchResult, MarketType } from "@/lib/market-data";

interface SymbolSearchProps {
    onSelect: (symbol: string, type: MarketType) => void;
    isOpen: boolean;
    onClose: () => void;
}

const MARKET_TYPE_ICONS: Record<MarketType, React.ReactNode> = {
    stock: <TrendingUp className="w-3.5 h-3.5" />,
    crypto: <Bitcoin className="w-3.5 h-3.5" />,
    forex: <DollarSign className="w-3.5 h-3.5" />,
};

const MARKET_TYPE_COLORS: Record<MarketType, string> = {
    stock: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    crypto: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    forex: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

export default function SymbolSearch({ onSelect, isOpen, onClose }: SymbolSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<MarketSearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<MarketType | "all">("all");
    const [recentSearches, setRecentSearches] = useState<
        { symbol: string; type: MarketType }[]
    >([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load recent searches from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("trading-recent-searches");
            if (saved) setRecentSearches(JSON.parse(saved));
        }
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    // Keyboard shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                if (!isOpen) {
                    // Parent should handle this — emit event
                }
            }
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    const searchSymbols = useCallback(async (q: string, type?: MarketType) => {
        if (q.length < 1) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const params = new URLSearchParams({ q });
            if (type && type !== ("all" as any)) params.set("type", type);

            const res = await fetch(`/api/market/search?${params}`);
            const data = await res.json();
            setResults(data.results || []);
            setSelectedIndex(0);
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInput = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            searchSymbols(value, activeTab === "all" ? undefined : activeTab);
        }, 300);
    };

    const handleSelect = (symbol: string, type: MarketType) => {
        onSelect(symbol, type);
        onClose();
        setQuery("");
        setResults([]);

        // Save to recent searches
        const updated = [
            { symbol, type },
            ...recentSearches.filter((r) => r.symbol !== symbol),
        ].slice(0, 8);
        setRecentSearches(updated);
        localStorage.setItem("trading-recent-searches", JSON.stringify(updated));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const items = results.length > 0 ? results : recentSearches.map((r) => ({ ...r, name: r.symbol }));
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" && items[selectedIndex]) {
            const item = items[selectedIndex];
            handleSelect(item.symbol, item.type);
        }
    };

    if (!isOpen) return null;

    const displayResults = results.length > 0 ? results : [];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Search Modal */}
            <div className="relative w-full max-w-xl mx-4 bg-card/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
                    <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <Input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => handleInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search stocks, crypto, forex..."
                        className="border-0 bg-transparent focus-visible:ring-0 px-0 text-base placeholder:text-muted-foreground/50"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border/50">
                        ESC
                    </kbd>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Market Type Tabs */}
                <div className="flex items-center gap-1 px-4 py-2 border-b border-border/20">
                    {(["all", "stock", "crypto", "forex"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab);
                                if (query) searchSymbols(query, tab === "all" ? undefined : tab);
                            }}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                activeTab === tab
                                    ? "bg-primary/15 text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            }`}
                        >
                            {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className="max-h-[300px] overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
                            Searching...
                        </div>
                    )}

                    {!loading && displayResults.length > 0 && (
                        <div className="py-1">
                            {displayResults.map((result, idx) => (
                                <button
                                    key={`${result.symbol}-${result.type}`}
                                    onClick={() => handleSelect(result.symbol, result.type)}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                        idx === selectedIndex
                                            ? "bg-primary/10"
                                            : "hover:bg-muted/50"
                                    }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-7 h-7 rounded-md ${MARKET_TYPE_COLORS[result.type]}`}
                                    >
                                        {MARKET_TYPE_ICONS[result.type]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{result.symbol}</span>
                                            <Badge
                                                variant="outline"
                                                className={`text-[9px] px-1.5 py-0 h-4 ${MARKET_TYPE_COLORS[result.type]}`}
                                            >
                                                {result.type}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground truncate">{result.name}</p>
                                    </div>
                                    {result.exchange && (
                                        <span className="text-[10px] text-muted-foreground/60">{result.exchange}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query.length === 0 && recentSearches.length > 0 && (
                        <div className="py-1">
                            <p className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                                Recent
                            </p>
                            {recentSearches.map((item, idx) => (
                                <button
                                    key={`recent-${item.symbol}`}
                                    onClick={() => handleSelect(item.symbol, item.type)}
                                    className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted/50 transition-colors ${
                                        idx === selectedIndex ? "bg-primary/10" : ""
                                    }`}
                                >
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
                                    <span className="font-medium text-sm">{item.symbol}</span>
                                    <Badge
                                        variant="outline"
                                        className={`text-[9px] px-1.5 py-0 h-4 ${MARKET_TYPE_COLORS[item.type]}`}
                                    >
                                        {item.type}
                                    </Badge>
                                </button>
                            ))}
                        </div>
                    )}

                    {!loading && query.length > 0 && displayResults.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Search className="w-8 h-8 mb-2 opacity-30" />
                            <p className="text-sm">No results for &quot;{query}&quot;</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3 px-4 py-2 border-t border-border/20 text-[10px] text-muted-foreground/50">
                    <span>↑↓ Navigate</span>
                    <span>↵ Select</span>
                    <span>ESC Close</span>
                </div>
            </div>
        </div>
    );
}
