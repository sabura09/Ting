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
    BarChart,
    Bar,
    Cell
} from "recharts";
import { Loader2, Zap, Cpu, Activity, Layers, Sparkles, TrendingUp, Compass, CpuIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyUsage {
    date: string;
    count: number;
}

interface TopTool {
    tool: string;
    count: number;
}

interface PopularModel {
    model: string;
    count: number;
    tokens: number;
}

interface ModelStats {
    dailyUsage: DailyUsage[];
    topTools: TopTool[];
    popularModels: PopularModel[];
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

// Colors for the bar chart
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6'];

export default function AdminModelUsage() {
    const [stats, setStats] = useState<ModelStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch("/api/admin/model-usage");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch model stats", error);
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
                <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
                <p className="text-muted-foreground animate-pulse font-medium tracking-wide">Analyzing AI Models...</p>
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

    const maxToolCount = Math.max(...(stats.topTools.map(t => t.count) || [0]), 1);

    return (
        <div className="p-6 md:p-10 max-w-[1400px] mx-auto space-y-10">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative flex items-end justify-between"
            >
                <div>
                    <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-violet-600 via-fuchsia-600 to-orange-500 bg-clip-text text-transparent mb-3">
                        Model Intelligence
                    </h1>
                    <p className="text-lg text-muted-foreground/80 max-w-2xl font-medium">
                        Deep dive into AI model utilization, engine popularity, and tool dependencies.
                    </p>
                </div>
                <div className="hidden md:flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-600 px-4 py-2 rounded-full">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-sm font-semibold tracking-tight">AI Insights Active</span>
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
                    <Card className="border shadow-2xl shadow-violet-500/5 bg-background overflow-hidden relative group rounded-3xl">
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <CardHeader className="pb-8 px-8 pt-8">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                        <CardTitle className="text-xl font-bold tracking-tight">Daily Model Invocations</CardTitle>
                                    </div>
                                    <CardDescription className="text-sm font-medium">Global AI engine requests over the last 30 days</CardDescription>
                                </div>
                                <div className="px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl shadow-lg shadow-violet-500/25 flex flex-col items-end">
                                    <span className="text-xs uppercase font-bold tracking-wider opacity-80">Total Requests</span>
                                    <span className="text-xl font-black">{formatNumber(stats.dailyUsage.reduce((acc, curr) => acc + curr.count, 0))}</span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="px-0 pb-0">
                            <div className="h-[380px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.dailyUsage} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorModelUses" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="date" hide />
                                        <YAxis hide />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: "hsl(var(--card))",
                                                borderRadius: "16px",
                                                border: "1px solid hsl(var(--border))",
                                                boxShadow: "0 25px 50px -12px rgba(139, 92, 246, 0.25)",
                                                padding: "16px"
                                            }}
                                            itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 800, fontSize: "18px" }}
                                            labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: "12px", marginBottom: "4px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}
                                            formatter={(value: number) => [new Intl.NumberFormat().format(value), "Invocations"]}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="count" 
                                            stroke="#8b5cf6" 
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorModelUses)" 
                                            animationDuration={2500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Popular Models List */}
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="h-full border shadow-2xl shadow-indigo-500/5 bg-background relative overflow-hidden rounded-3xl">
                        <CardHeader className="px-8 pt-8 pb-4 border-b border-border/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20">
                                    <CpuIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold tracking-tight">Dominant Models</CardTitle>
                                    <CardDescription className="text-sm font-medium mt-1">Most utilized AI engines globally</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.popularModels} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="model" type="category" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--foreground))', fontSize: 13, fontWeight: 600}} width={140} />
                                        <Tooltip 
                                            cursor={{fill: 'hsl(var(--muted))', opacity: 0.4}}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)'}}
                                            formatter={(value: number) => [new Intl.NumberFormat().format(value), "Uses"]}
                                        />
                                        <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={24} animationDuration={2000}>
                                            {stats.popularModels.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Top Tools List */}
                <motion.div variants={itemVariants} className="lg:col-span-1">
                    <Card className="h-full border shadow-2xl shadow-emerald-500/5 bg-background relative overflow-hidden rounded-3xl">
                        <CardHeader className="px-8 pt-8 pb-4 border-b border-border/40">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
                                    <Layers className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-bold tracking-tight">Top Tools</CardTitle>
                                    <CardDescription className="text-sm font-medium mt-1">Highest model consumers</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            {stats.topTools.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8 font-medium">No tool data yet</p>
                            ) : (
                                stats.topTools.map((tool, index) => (
                                    <motion.div 
                                        key={tool.tool}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4 + index * 0.1 }}
                                        className="group relative"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-sm tracking-tight capitalize text-foreground/90 group-hover:text-emerald-500 transition-colors">
                                                {tool.tool.replace(/-/g, ' ')}
                                            </span>
                                            <span className="text-sm font-black tracking-tighter text-foreground/80 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-md">
                                                {formatNumber(tool.count)}
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${(tool.count / maxToolCount) * 100}%` }}
                                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 + index * 0.1 }}
                                                className="h-full bg-emerald-500 rounded-full"
                                            />
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
