"use client";

import { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { Loader2, Zap, Trophy, Cpu, Activity, User, Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DailyUsage {
    date: string;
    tokens: number;
}

interface TopTool {
    tool: string;
    tokens: number;
}

interface TopUser {
    email: string;
    name: string;
    tokens: number;
}

interface TokenStats {
    dailyUsage: DailyUsage[];
    topTools: TopTool[];
    topUsers: TopUser[];
}

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

// Tool icons mapping for a more premium look
const toolIcons: Record<string, React.ReactNode> = {
    'website-builder': <div className="w-6 h-6 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500"><Activity className="w-3.5 h-3.5" /></div>,
    'site-generation': <div className="w-6 h-6 rounded-md bg-indigo-500/10 flex items-center justify-center text-indigo-500"><Sparkles className="w-3.5 h-3.5" /></div>,
    'code': <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Cpu className="w-3.5 h-3.5" /></div>,
    'chat': <div className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center text-rose-500"><User className="w-3.5 h-3.5" /></div>,
};

export default function AdminTokenUsage() {
    const [stats, setStats] = useState<TokenStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/token-usage");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch token stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(num);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium tracking-wide">Crunching token data...</p>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <p className="text-muted-foreground">Failed to load statistics.</p>
            </div>
        );
    }

    const maxToolTokens = Math.max(...(stats.topTools.map(t => t.tokens) || [0]), 1);

    return (
        <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-10">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex items-end justify-between"
            >
                <div>
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-br from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent mb-3">
                        Token Analytics
                    </h1>
                    <p className="text-lg text-muted-foreground/80 max-w-2xl font-medium">
                        Monitor platform resource consumption, top-tier tools, and power users in real-time.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-card border shadow-sm px-4 py-2 rounded-full">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-semibold tracking-tight">Live Updating</span>
                </div>
            </motion.div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
            >
                {/* Main Area Chart */}
                <motion.div variants={itemVariants} className="lg:col-span-3">
                    <Card className="border shadow-sm bg-card/40 backdrop-blur-3xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <CardHeader className="pb-8 px-8 pt-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <CardTitle className="text-xl font-bold tracking-tight">Consumption Trend</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium">Daily token usage over the last 30 days</CardDescription>
                                </div>
                                <div className="px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-md text-sm font-bold tracking-tight">
                                    {formatNumber(stats.dailyUsage.reduce((acc, curr) => acc + curr.tokens, 0))} Total
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            <div className="h-[380px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.dailyUsage} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTokensBlue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis 
                                            dataKey="date" 
                                            hide
                                        />
                                        <YAxis 
                                            hide
                                        />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: "hsl(var(--card))",
                                                borderRadius: "12px",
                                                border: "1px solid hsl(var(--border))",
                                                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)",
                                                padding: "12px 16px"
                                            }}
                                            itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 700, fontSize: "16px" }}
                                            labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "12px", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}
                                            formatter={(value: number) => [new Intl.NumberFormat().format(value), "Tokens"]}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="tokens" 
                                            stroke="#3b82f6" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorTokensBlue)" 
                                            animationDuration={2000}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Top Tools Custom List */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="h-full border shadow-sm bg-card/60 backdrop-blur-xl">
                        <CardHeader className="px-8 pt-8 pb-4 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20">
                                    <Cpu className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold tracking-tight">Top AI Tools</CardTitle>
                                    <CardDescription className="text-sm font-medium mt-1">Resource allocation by feature</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-7">
                            {stats.topTools.map((tool, index) => (
                                <motion.div 
                                    key={tool.tool} 
                                    className="space-y-3 group"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + index * 0.1 }}
                                >
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3">
                                            {toolIcons[tool.tool.toLowerCase()] || <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-muted-foreground"><Zap className="w-3.5 h-3.5" /></div>}
                                            <span className="font-semibold text-sm tracking-tight capitalize text-foreground/90 group-hover:text-foreground transition-colors">
                                                {tool.tool.replace(/-/g, ' ')}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-base font-bold tracking-tight">{formatNumber(tool.tokens)}</span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Tokens</span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(tool.tokens / maxToolTokens) * 100}%` }}
                                            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 + index * 0.1 }}
                                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                        />
                                    </div>
                                </motion.div>
                            ))}
                            {stats.topTools.length === 0 && (
                                <p className="text-muted-foreground text-center py-8">No tool usage data recorded yet.</p>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Power Users List */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="h-full border shadow-sm bg-card/60 backdrop-blur-xl relative overflow-hidden">
                        <CardHeader className="px-8 pt-8 pb-4 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20">
                                    <Trophy className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold tracking-tight">Power Users</CardTitle>
                                    <CardDescription className="text-sm font-medium mt-1">Highest token consumers</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            {stats.topUsers.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No usage data yet</p>
                            ) : (
                                stats.topUsers.map((user, index) => (
                                    <motion.div 
                                        key={user.email}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-muted/50 transition-colors group cursor-default"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                                                    <AvatarFallback className="bg-gradient-to-br from-rose-100 to-orange-100 text-rose-700 dark:from-rose-900/30 dark:to-orange-900/30 dark:text-rose-400 font-bold">
                                                        {user.name?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {index < 3 && (
                                                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-background border flex items-center justify-center shadow-sm">
                                                        <span className={`text-[10px] font-black ${
                                                            index === 0 ? "text-amber-500" : 
                                                            index === 1 ? "text-slate-400" : 
                                                            "text-amber-700"
                                                        }`}>
                                                            {index + 1}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-sm font-bold tracking-tight leading-none text-foreground/90 group-hover:text-foreground transition-colors">{user.name}</p>
                                                <p className="text-xs font-medium text-muted-foreground line-clamp-1">{user.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 bg-background border px-2.5 py-1.5 rounded-lg shadow-sm">
                                            <span className="text-sm font-black tracking-tighter text-foreground/80 leading-none">
                                                {formatNumber(user.tokens)}
                                            </span>
                                            <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground leading-none">
                                                Tokens
                                            </span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

            </motion.div>
        </div>
    );
}
