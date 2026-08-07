"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Bell, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import type { MarketType } from "@/lib/market-data";

interface Alert {
    id: string;
    symbol: string;
    market_type: MarketType;
    condition: "price_above" | "price_below" | "rsi_above" | "rsi_below" | "macd_cross" | "ema_cross" | "volume_spike";
    threshold: number;
    is_triggered: boolean;
    is_active: boolean;
    created_at: string;
}

interface AlertsPanelProps {
    currentSymbol: string;
    currentType: MarketType;
    currentPrice: number;
}

const CONDITION_LABELS = {
    price_above: "Price Above",
    price_below: "Price Below",
    rsi_above: "RSI Above",
    rsi_below: "RSI Below",
    macd_cross: "MACD Cross",
    ema_cross: "EMA Cross",
    volume_spike: "Volume Spike",
};

export default function AlertsPanel({
    currentSymbol,
    currentType,
    currentPrice,
}: AlertsPanelProps) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [condition, setCondition] = useState<keyof typeof CONDITION_LABELS>("price_above");
    const [threshold, setThreshold] = useState("");
    const [creating, setCreating] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchAlerts = useCallback(async () => {
        try {
            const res = await fetch("/api/market/alerts");
            if (res.ok) {
                const data = await res.json();
                setAlerts(data.alerts || []);
            }
        } catch (err) {
            console.error("Failed to fetch alerts:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAlerts();
    }, [fetchAlerts]);

    // Pre-fill threshold with current price when symbol or price changes
    useEffect(() => {
        if (currentPrice) {
            setThreshold(currentPrice.toString());
        }
    }, [currentSymbol, currentPrice]);

    const createAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(threshold);
        if (isNaN(value)) return;

        setCreating(true);
        try {
            const res = await fetch("/api/market/alerts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    symbol: currentSymbol,
                    marketType: currentType,
                    condition,
                    threshold: value,
                }),
            });
            if (res.ok) {
                const data = await res.json();
                setAlerts((prev) => [data.alert, ...prev]);
                // Reset form slightly
                setThreshold(currentPrice.toString());
            }
        } catch (err) {
            console.error("Failed to create alert:", err);
        } finally {
            setCreating(false);
        }
    };

    const deleteAlert = async (id: string) => {
        setActionLoading(id);
        try {
            const res = await fetch(`/api/market/alerts?id=${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                setAlerts((prev) => prev.filter((a) => a.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete alert:", err);
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-xs font-mono">Loading alerts...</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-card/10">
            {/* Create Alert Form */}
            <div className="p-3 border-b border-border/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Bell className="w-3.5 h-3.5 text-primary" /> Create Alert ({currentSymbol})
                </span>
                <form onSubmit={createAlert} className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <select
                            value={condition}
                            onChange={(e) => setCondition(e.target.value as any)}
                            className="bg-background border border-border/40 rounded-lg px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary w-full"
                        >
                            {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        <Input
                            type="number"
                            step="any"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            placeholder="Value"
                            className="h-8 text-xs font-mono"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={creating || !threshold}
                        className="w-full h-8 text-xs gap-1"
                    >
                        {creating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Plus className="w-3.5 h-3.5" />
                        )}
                        Set Alert
                    </Button>
                </form>
            </div>

            {/* Alerts List */}
            <ScrollArea className="flex-1 trading-scroll-area">
                <div className="p-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        Active Alerts ({alerts.length})
                    </span>
                    {alerts.length > 0 ? (
                        <div className="space-y-2">
                            {alerts.map((alert) => (
                                <Card
                                    key={alert.id}
                                    className="p-2 border border-border/30 bg-card/20 backdrop-blur-sm flex items-center justify-between gap-2"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-semibold text-xs">{alert.symbol}</span>
                                            <Badge
                                                variant="outline"
                                                className="text-[8px] px-1 py-0 h-3.5 opacity-55"
                                            >
                                                {alert.market_type}
                                            </Badge>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            {CONDITION_LABELS[alert.condition]}:{" "}
                                            <span className="font-mono font-medium text-foreground">
                                                {alert.threshold}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteAlert(alert.id)}
                                        disabled={actionLoading === alert.id}
                                        className="h-7 w-7 p-0 hover:text-red-500"
                                    >
                                        {actionLoading === alert.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-red-500" />
                                        )}
                                    </Button>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-15" />
                            <p className="text-xs">No active alerts</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
