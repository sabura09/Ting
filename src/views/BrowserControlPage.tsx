"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/contexts/AuthContext';
import { useGeminiStream } from '@/hooks/useGeminiStream';
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeft,
    ArrowRight,
    RotateCw,
    Shield,
    Terminal,
    Globe,
    Loader2,
    Sparkles,
    Search,
    ExternalLink,
    ChevronRight,
    Zap,
    Send,
    Bot,
    Eye,
    Crosshair,
    Activity,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    Clock,
    ArrowUpRight,
    Copy,
    Download,
    Trash2,
    Layers,
    Monitor,
    Lock,
    Unlock,
    Check,
    FileText,
    Link as LinkIcon,
    RefreshCw,
    CornerDownLeft,
    X,
    Paperclip
} from 'lucide-react';

const MAX_AGENT_ITERATIONS = 5;

interface LogEntry {
    type: 'system' | 'search' | 'navigate' | 'agent' | 'result' | 'error';
    content: string;
    timestamp: Date;
}

interface PageData {
    title: string;
    url: string;
    textContent: string;
    links: { text: string; href: string }[];
}

const presetMissions = [
    {
        title: "Apple Vision Pro Specs",
        prompt: "Find the key specifications, weight, and current starting price of the Apple Vision Pro from the official website.",
        startUrl: "https://www.apple.com/apple-vision-pro",
        icon: Sparkles,
        color: "text-indigo-400 border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40 hover:bg-indigo-500/10"
    },
    {
        title: "Next.js 15 Features",
        prompt: "Search the Next.js blog or documentation and list the major new features and changes released in Next.js 15.",
        startUrl: "https://nextjs.org/blog",
        icon: Globe,
        color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10"
    },
    {
        title: "Compare Retail Prices",
        prompt: "Search the web and compare the current pricing of the iPhone 16 Pro Max 256GB across Best Buy and Amazon.",
        startUrl: "https://www.google.com",
        icon: Search,
        color: "text-amber-400 border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10"
    },
    {
        title: "GitHub Trending Today",
        prompt: "Navigate to GitHub Trending, retrieve the top 3 trending repositories today, and summarize their goals.",
        startUrl: "https://github.com/trending",
        icon: Terminal,
        color: "text-rose-400 border-rose-500/20 bg-rose-500/5 hover:border-rose-500/40 hover:bg-rose-500/10"
    }
];

export default function BrowserControlPage() {
    const { selectedModel } = useAuth();
    const [url, setUrl] = useState("https://google.com");
    const [displayUrl, setDisplayUrl] = useState("https://google.com");
    const [proxyUrl, setProxyUrl] = useState("/api/browser/proxy?url=https%3A%2F%2Fgoogle.com");
    const [agentPrompt, setAgentPrompt] = useState("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [mounted, setMounted] = useState(false);
    const [isLoadingPage, setIsLoadingPage] = useState(false);
    const [isAgentRunning, setIsAgentRunning] = useState(false);
    const [agentAnswer, setAgentAnswer] = useState("");
    const [history, setHistory] = useState<string[]>(["https://google.com"]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [iterationCount, setIterationCount] = useState(0);

    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                addLog('error', 'Image upload failed: File size exceeds the 5MB limit.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                addLog('system', `Image uploaded successfully: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    // Extracted page details for tabs
    const [latestPageData, setLatestPageData] = useState<PageData | null>({
        title: "Google",
        url: "https://google.com",
        textContent: "Search the world's information, including webpages, images, videos and more.",
        links: [
            { text: "Google Search", href: "https://google.com" },
            { text: "About", href: "https://about.google" }
        ]
    });
    const [activeTab, setActiveTab] = useState<'live' | 'reader' | 'links'>('live');
    const [readerSearch, setReaderSearch] = useState('');
    const [linksSearch, setLinksSearch] = useState('');

    // Copy / Action States
    const [copiedAnswer, setCopiedAnswer] = useState(false);
    const [copiedLogs, setCopiedLogs] = useState(false);
    const [showSslTooltip, setShowSslTooltip] = useState(false);

    const iframeRef = useRef<HTMLIFrameElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const { generateStream, isStreaming } = useGeminiStream();
    const isMountedRef = useRef(true);

    const addLog = useCallback((type: LogEntry['type'], content: string) => {
        setLogs(prev => [...prev, { type, content, timestamp: new Date() }]);
    }, []);

    useEffect(() => {
        isMountedRef.current = true;
        setMounted(true);
        setLogs([
            { type: 'system', content: 'Browser agent initialized. Ready for instructions.', timestamp: new Date() }
        ]);
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleNavigate = useCallback((targetUrl: string, addToHistory = true) => {
        setIsLoadingPage(true);
        const normalized = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        setUrl(normalized);
        setDisplayUrl(normalized);
        setProxyUrl(`/api/browser/proxy?url=${encodeURIComponent(normalized)}`);

        if (addToHistory) {
            setHistory(prev => {
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(normalized);
                return newHistory;
            });
            setHistoryIndex(prev => prev + 1);
        }
    }, [historyIndex]);

    const handleManualNavigate = async (targetUrl: string) => {
        if (!targetUrl.trim()) return;
        const normalized = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;
        handleNavigate(normalized);

        try {
            const res = await fetch('/api/browser/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: normalized }),
            });
            if (res.ok) {
                const data = await res.json();
                setLatestPageData({
                    title: data.title || 'Untitled',
                    url: data.url || normalized,
                    textContent: data.textContent || '',
                    links: data.links || [],
                });
            }
        } catch (e) {
            console.error('Failed to load page text for Reader Tab', e);
        }
    };

    const goBack = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            handleNavigate(history[newIndex], false);
        }
    };

    const goForward = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            handleNavigate(history[newIndex], false);
        }
    };

    useEffect(() => {
        const handleIframeMessage = (event: MessageEvent) => {
            if (event.data?.type === 'BROWSER_LOADED') setIsLoadingPage(false);
            if (event.data?.type === 'BROWSER_NAVIGATION') handleManualNavigate(event.data.url);
        };
        window.addEventListener('message', handleIframeMessage);
        return () => window.removeEventListener('message', handleIframeMessage);
    }, [handleManualNavigate]);

    useEffect(() => {
        if (isLoadingPage) {
            const timeout = setTimeout(() => setIsLoadingPage(false), 10000);
            return () => clearTimeout(timeout);
        }
    }, [isLoadingPage]);

    // ─── Agent Loop ───
    const executeSearch = async (query: string): Promise<string> => {
        try {
            const res = await fetch(`/api/browser/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error('Search failed');
            const data = await res.json();
            const results = data.results || [];
            if (results.length === 0) return "No search results found.";
            return results.map((r: any, i: number) =>
                `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.snippet}`
            ).join('\n\n');
        } catch (e: any) {
            return `Search error: ${e.message}`;
        }
    };

    const executeNavigate = async (targetUrl: string): Promise<string> => {
        handleNavigate(targetUrl);
        try {
            const res = await fetch('/api/browser/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: targetUrl }),
            });
            if (!res.ok) throw new Error('Page fetch failed');
            const data = await res.json();

            if (isMountedRef.current) {
                setLatestPageData({
                    title: data.title || 'Untitled Page',
                    url: data.url || targetUrl,
                    textContent: data.textContent || '',
                    links: data.links || [],
                });
            }

            return `**Page Title**: ${data.title}\n**URL**: ${data.url}\n\n**Content**:\n${data.textContent}\n\n**Links on page**:\n${(data.links || []).slice(0, 10).map((l: any) => `- [${l.text}](${l.href})`).join('\n')}`;
        } catch (e: any) {
            return `Navigate error: ${e.message}`;
        }
    };

    const startAutonomousAgent = async () => {
        if (!agentPrompt.trim() || isAgentRunning) return;

        setIsAgentRunning(true);
        setAgentAnswer("");
        setIterationCount(0);
        setLogs([
            { type: 'agent', content: `Agent started — "${agentPrompt}"`, timestamp: new Date() }
        ]);

        const systemInstructions = `You are an autonomous browser research agent. You have access to two tools:

1. **browser_search**: Search the web for information. Use this to find relevant pages.
2. **browser_navigate**: Navigate to a URL and read its content. Use this to read specific pages.

Your task: ${agentPrompt}

Current page URL: ${url}

IMPORTANT RULES:
- Always start by searching for the topic if you don't have a specific URL.
- After searching, navigate to the most relevant result to read detailed information.
- You may search and navigate multiple times to gather comprehensive information.
- When you have enough information, provide a clear, well-formatted answer WITHOUT calling any tools.
- Be thorough but efficient — gather what you need and deliver a complete answer.`;

        let conversationHistory: any[] = [];
        let iterationsLeft = MAX_AGENT_ITERATIONS;
        const userMessage = `Please research the following and provide a comprehensive answer: "${agentPrompt}"`;

        try {
            let currentPrompt = userMessage;

            while (iterationsLeft > 0) {
                if (!isMountedRef.current) return;
                setIterationCount(MAX_AGENT_ITERATIONS - iterationsLeft + 1);
                addLog('system', `Step ${MAX_AGENT_ITERATIONS - iterationsLeft + 1}/${MAX_AGENT_ITERATIONS} — Analyzing current viewport & planning next action...`);

                const res = await generateStream(
                    systemInstructions,
                    currentPrompt,
                    conversationHistory.length === 0 ? (uploadedImage || undefined) : undefined,
                    undefined,
                    "browser-control",
                    conversationHistory
                );

                if (!isMountedRef.current) return;

                if (res.text && (!res.toolCalls || res.toolCalls.length === 0)) {
                    addLog('result', 'Agent successfully finalized synthesis and delivered findings.');
                    setAgentAnswer(res.text);
                    break;
                }

                if (res.toolCalls && res.toolCalls.length > 0) {
                    for (const tool of res.toolCalls) {
                        if (!isMountedRef.current) return;
                        if (tool.name === 'browser_search') {
                            const query = tool.args?.query || '';
                            addLog('search', `Querying web: "${query}"`);
                            const searchResults = await executeSearch(query);
                            if (!isMountedRef.current) return;
                            addLog('system', `Received organic response index. Found ${searchResults.split('\n\n').length} candidates.`);
                            conversationHistory.push(
                                { 
                                    role: 'user', 
                                    content: currentPrompt,
                                    ...(conversationHistory.length === 0 && uploadedImage ? { image: uploadedImage } : {})
                                },
                                { role: 'assistant', content: res.text || `[Called browser_search with query: "${query}"]` },
                                { role: 'user', content: `Search results for "${query}":\n\n${searchResults}\n\nAnalyze these results. Navigate to the most relevant page for detailed information, or if you have enough data, provide your final answer.` }
                            );
                            currentPrompt = `Search results for "${query}":\n\n${searchResults}\n\nAnalyze these results. Navigate to the most relevant page for detailed information, or if you have enough data, provide your final answer.`;
                        } else if (tool.name === 'browser_navigate') {
                            const navUrl = tool.args?.url || '';
                            addLog('navigate', `Routing connection proxy to: ${navUrl}`);
                            const pageContent = await executeNavigate(navUrl);
                            if (!isMountedRef.current) return;
                            addLog('system', `Document loaded. Extracted title: "${latestPageData?.title || 'Unknown'}". Reading text nodes...`);
                            conversationHistory.push(
                                { 
                                    role: 'user', 
                                    content: currentPrompt,
                                    ...(conversationHistory.length === 0 && uploadedImage ? { image: uploadedImage } : {})
                                },
                                { role: 'assistant', content: res.text || `[Called browser_navigate to: ${navUrl}]` },
                                { role: 'user', content: `Page content from ${navUrl}:\n\n${pageContent}\n\nBased on this content and any previous research, continue your investigation or provide your final comprehensive answer.` }
                            );
                            currentPrompt = `Page content from ${navUrl}:\n\n${pageContent}\n\nBased on this content and any previous research, continue your investigation or provide your final comprehensive answer.`;
                        }
                    }
                } else {
                    addLog('error', 'Model returned empty payload response. Terminal process aborted.');
                    break;
                }
                iterationsLeft--;
            }

            if (iterationsLeft === 0 && !agentAnswer) {
                if (!isMountedRef.current) return;
                addLog('system', 'Maximum loop threshold met — Generating comprehensive review report...');
                const finalRes = await generateStream(
                    systemInstructions,
                    `Based on all the research you've done, please provide your final comprehensive answer now. Do NOT call any tools.`,
                    undefined, undefined,
                    "browser-control",
                    conversationHistory
                );
                if (!isMountedRef.current) return;
                if (finalRes.text) {
                    setAgentAnswer(finalRes.text);
                    addLog('result', 'Final research data synthesized.');
                }
            }
        } catch (error: any) {
            if (isMountedRef.current) {
                addLog('error', `Sandbox process failure: ${error.message}`);
            }
        } finally {
            if (isMountedRef.current) {
                setIsAgentRunning(false);
            }
        }
    };

    // Actions
    const handleCopyAnswer = () => {
        if (!agentAnswer) return;
        navigator.clipboard.writeText(agentAnswer);
        setCopiedAnswer(true);
        setTimeout(() => setCopiedAnswer(false), 2000);
    };

    const handleDownloadReport = () => {
        if (!agentAnswer) return;
        const blob = new Blob([
            `# AI Browser Research Report\n\n`,
            `**Research Objective**: ${agentPrompt}\n`,
            `**Engine**: ${selectedModel || 'Default'}\n`,
            `**Timestamp**: ${new Date().toLocaleString()}\n\n`,
            `---\n\n`,
            agentAnswer
        ], { type: 'text/markdown' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `research_report_${new Date().toISOString().slice(0, 10)}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    };

    const handleCopyLogs = () => {
        if (logs.length === 0) return;
        const text = logs.map(l => `[${l.timestamp.toLocaleTimeString()}] [${l.type.toUpperCase()}] ${l.content}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedLogs(true);
        setTimeout(() => setCopiedLogs(false), 2000);
    };

    const handleClearLogs = () => {
        setLogs([
            { type: 'system', content: 'Browser agent initialized. Ready for instructions.', timestamp: new Date() }
        ]);
    };

    // Log styling metadata
    const logMeta = useMemo(() => ({
        search: { 
            icon: Search, 
            color: 'text-amber-400', 
            border: 'border-amber-500/20', 
            bg: 'bg-amber-950/10 hover:bg-amber-950/20',
            glow: 'shadow-[0_0_15px_-3px_rgba(245,158,11,0.15)]',
            label: 'Search' 
        },
        navigate: { 
            icon: Globe, 
            color: 'text-cyan-400', 
            border: 'border-cyan-500/20', 
            bg: 'bg-cyan-950/10 hover:bg-cyan-950/20', 
            glow: 'shadow-[0_0_15px_-3px_rgba(34,211,238,0.15)]',
            label: 'Navigate' 
        },
        agent: { 
            icon: Bot, 
            color: 'text-violet-400', 
            border: 'border-violet-500/20', 
            bg: 'bg-violet-950/10 hover:bg-violet-950/20', 
            glow: 'shadow-[0_0_15px_-3px_rgba(139,92,246,0.15)]',
            label: 'Agent' 
        },
        result: { 
            icon: CheckCircle2, 
            color: 'text-emerald-400', 
            border: 'border-emerald-500/20', 
            bg: 'bg-emerald-950/10 hover:bg-emerald-950/20', 
            glow: 'shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]',
            label: 'Result' 
        },
        error: { 
            icon: XCircle, 
            color: 'text-rose-400', 
            border: 'border-rose-500/20', 
            bg: 'bg-rose-950/10 hover:bg-rose-950/20', 
            glow: 'shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]',
            label: 'Error' 
        },
        system: { 
            icon: Activity, 
            color: 'text-zinc-400', 
            border: 'border-zinc-800/80', 
            bg: 'bg-zinc-900/20 hover:bg-zinc-900/35', 
            glow: 'shadow-none',
            label: 'System' 
        },
    }), []);

    // Filtered data for reader and links tabs
    const filteredReaderText = useMemo(() => {
        if (!latestPageData?.textContent) return "";
        if (!readerSearch.trim()) return latestPageData.textContent;
        return latestPageData.textContent
            .split('\n')
            .filter(line => line.toLowerCase().includes(readerSearch.toLowerCase()))
            .join('\n');
    }, [latestPageData, readerSearch]);

    const filteredLinks = useMemo(() => {
        if (!latestPageData?.links) return [];
        if (!linksSearch.trim()) return latestPageData.links;
        return latestPageData.links.filter(l =>
            l.text.toLowerCase().includes(linksSearch.toLowerCase()) ||
            l.href.toLowerCase().includes(linksSearch.toLowerCase())
        );
    }, [latestPageData, linksSearch]);

    return (
        <Layout fullHeight noPadding>
            {/* Custom font and premium styling injection */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap');
                
                .browser-page { 
                    font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
                }
                .browser-heading {
                    font-family: 'Bricolage Grotesque', system-ui, sans-serif;
                }
                .browser-mono { 
                    font-family: 'JetBrains Mono', ui-monospace, monospace; 
                }
                
                /* Custom styled scrollbars */
                .custom-scroll::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scroll::-webkit-scrollbar-thumb {
                    background: hsl(var(--border) / 0.8);
                    border-radius: 9999px;
                }
                .custom-scroll::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--ai-primary) / 0.5);
                }

                                /* Glass effect cards */
                .glass-card {
                    background: hsl(var(--background) / 0.5);
                    backdrop-filter: blur(20px);
                    border: 1px solid hsl(var(--border) / 0.4);
                }

                /* Holographic effects */
                .holo-glow {
                    box-shadow: 0 0 30px -5px hsl(var(--ai-primary) / 0.15), 0 0 15px -3px hsl(var(--ai-secondary) / 0.1);
                }
                .holo-border-active {
                    animation: borderPulse 3s infinite alternate ease-in-out;
                }
                
                @keyframes borderPulse {
                    0% {
                        border-color: hsl(var(--ai-primary) / 0.3);
                        box-shadow: 0 0 15px -5px hsl(var(--ai-primary) / 0.15);
                    }
                    100% {
                        border-color: hsl(var(--ai-secondary) / 0.7);
                        box-shadow: 0 0 25px -5px hsl(var(--ai-secondary) / 0.25);
                    }
                }

                /* Grid background visualizer */
                .tech-grid {
                    background-size: 20px 20px;
                    background-image: radial-gradient(circle, hsl(var(--foreground) / 0.03) 1px, transparent 1px);
                }

                /* Premium HUD Console Container */
                .hud-console {
                    background: linear-gradient(135deg, rgba(10, 10, 14, 0.8) 0%, rgba(6, 6, 8, 0.95) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.6), 
                                inset 0 1px 1px 0 rgba(255, 255, 255, 0.04);
                    position: relative;
                }

                /* HUD grid overlay */
                .hud-grid {
                    background-size: 16px 16px;
                    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
                    pointer-events: none;
                }

                /* Animated scanline sweeping the console */
                .hud-scanline {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        to bottom,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(139, 92, 246, 0.01) 10%,
                        rgba(139, 92, 246, 0.05) 50%,
                        rgba(139, 92, 246, 0.01) 90%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    background-size: 100% 360px;
                    animation: sweep 12s linear infinite;
                    pointer-events: none;
                    z-index: 5;
                }

                @keyframes sweep {
                    0% { background-position: 0 -360px; }
                    100% { background-position: 0 360px; }
                }
            ` }} />

            <div className="browser-page flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background/95 tech-grid">

                {/* ═══════════════════════════════════════════════════════ */}
                {/* LEFT CONTROL SIDEBAR DECK                              */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="w-full lg:w-[420px] xl:w-[450px] flex flex-col glass-card border-r border-border/40 shrink-0 shadow-2xl relative z-10">

                    {/* Brand Banner */}
                    <div className="p-6 border-b border-border/30">
                        <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-ai-primary via-ai-primary-light to-ai-secondary flex items-center justify-center shadow-lg shadow-primary/20 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-white/10 group-hover:scale-110 transition-transform" />
                                <Globe className="w-5.5 h-5.5 text-white relative z-10" />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold tracking-tight browser-heading bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground/80 bg-clip-text text-transparent">
                                    Browser Control
                                </h1>
                                <p className="text-xs text-muted-foreground/90 font-medium">Autonomous browser agent interface</p>
                            </div>
                        </div>
                    </div>

                    {/* Controls Scrollport */}
                    <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-6">

                        {/* Objective Textarea */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                                    Research Objective
                                </Label>
                                {(agentPrompt || uploadedImage) && (
                                    <button
                                        onClick={() => {
                                            setAgentPrompt("");
                                            setUploadedImage(null);
                                        }}
                                        className="text-[10px] font-medium text-muted-foreground hover:text-rose-400 transition-colors"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <Textarea
                                    className="min-h-[110px] resize-none text-xs rounded-xl border-border/30 bg-muted/10 focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50 placeholder:text-muted-foreground/50 transition-all p-3.5 pr-8 pb-10"
                                    placeholder="Enter natural language research task... (e.g. 'Compare pricing of Apple Vision Pro on Best Buy vs Amazon')"
                                    value={agentPrompt}
                                    onChange={(e) => setAgentPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            startAutonomousAgent();
                                        }
                                    }}
                                />
                                <div className="absolute bottom-2 left-2 flex items-center gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        accept="image/*"
                                        disabled={isAgentRunning}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isAgentRunning}
                                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-150 active:scale-95 flex items-center justify-center"
                                        title="Upload reference image"
                                    >
                                        <Paperclip className="w-3.5 h-3.5" />
                                    </button>
                                    {uploadedImage && (
                                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 select-none">
                                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                            IMAGE READY
                                        </span>
                                    )}
                                </div>
                                <div className="absolute bottom-2.5 right-2.5 opacity-40 group-focus-within:opacity-100 transition-opacity">
                                    <CornerDownLeft className="w-3.5 h-3.5 text-muted-foreground" />
                                </div>
                            </div>

                            {/* Cyberpunk Asset Preview Deck */}
                            <AnimatePresence>
                                {uploadedImage && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 5 }}
                                        className="relative w-20 h-20 group border border-emerald-500/30 rounded-xl overflow-hidden bg-emerald-950/10 shadow-lg shadow-emerald-500/5 p-1"
                                    >
                                        <div className="relative w-full h-full rounded-lg overflow-hidden">
                                            <img
                                                src={uploadedImage}
                                                alt="Holographic upload preview"
                                                className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                                            />
                                            {/* Scanline overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/5 to-transparent pointer-events-none mix-blend-overlay" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setUploadedImage(null);
                                                    addLog('system', 'Reference image removed from workspace.');
                                                }}
                                                disabled={isAgentRunning}
                                                className="absolute top-1 right-1 p-1 bg-rose-500/90 hover:bg-rose-600 text-white rounded-full transition-all shadow-md active:scale-90 opacity-0 group-hover:opacity-100 duration-200"
                                                title="Unlink asset"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Example Prompts Suggestion Chips */}
                            <div className="flex flex-col gap-2 pt-1.5 pb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                                    Example Prompts
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {presetMissions.map((mission, index) => {
                                        const Icon = mission.icon;
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setAgentPrompt(mission.prompt);
                                                }}
                                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-semibold transition-all duration-200 active:scale-[0.97] flex items-center gap-1.5 ${mission.color}`}
                                            >
                                                <Icon className="w-3 h-3 shrink-0" />
                                                <span>{mission.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Launch Deck Trigger */}
                            <Button
                                className={`w-full h-11 text-xs font-bold uppercase tracking-wider relative overflow-hidden group shadow-md transition-all active:scale-[0.99] ${isAgentRunning
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20'
                                    : 'bg-gradient-to-r from-ai-primary to-ai-secondary text-white hover:opacity-95 shadow-primary/20'
                                    }`}
                                onClick={startAutonomousAgent}
                                disabled={isAgentRunning || isStreaming || !agentPrompt.trim()}
                            >
                                {isAgentRunning ? (
                                    <span className="flex items-center gap-2 relative z-10">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        Running Sandbox Agent ({iterationCount}/{MAX_AGENT_ITERATIONS})
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 relative z-10">
                                        <Crosshair className="w-3.5 h-3.5" />
                                        Launch Autonomous Agent
                                    </span>
                                )}
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>

                            {/* Agent Loop Live HUD Progress */}
                            {isAgentRunning && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 rounded-xl border border-border/30 bg-muted/10 space-y-2"
                                >
                                    <div className="flex justify-between items-center text-[10px] font-semibold tracking-wider uppercase browser-mono">
                                        <span className="text-primary flex items-center gap-1.5 animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                                            Loop Active
                                        </span>
                                        <span className="text-muted-foreground">Iteration {iterationCount} of {MAX_AGENT_ITERATIONS}</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-border/20 overflow-hidden">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-ai-primary to-ai-secondary"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(iterationCount / MAX_AGENT_ITERATIONS) * 100}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Terminal Activity Log Console */}
                        <div className="rounded-2xl hud-console flex flex-col h-[360px] overflow-hidden group/console relative">
                            {/* HUD Background grid & Scanline */}
                            <div className="hud-grid absolute inset-0 opacity-40 group-hover/console:opacity-50 transition-opacity" />
                            <div className="hud-scanline" />

                            {/* Integrated Console Header */}
                            <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between relative z-10 shrink-0 select-none">
                                <div className="flex items-center gap-2.5">
                                    <div className="relative flex items-center justify-center">
                                        <Terminal className="w-4 h-4 text-violet-400" />
                                        {isAgentRunning && (
                                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-zinc-100 font-mono">
                                            Telemetry Monitor
                                        </span>
                                        <span className="text-[8px] text-zinc-500 font-mono flex items-center gap-1">
                                            <span className={`w-1 h-1 rounded-full ${isAgentRunning ? 'bg-violet-400 animate-pulse' : 'bg-emerald-500'}`} />
                                            {isAgentRunning ? 'AGENT ACTIVE • STEP STREAMING' : 'AGENT STANDBY • SECURE PROXY'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={handleCopyLogs}
                                        title="Copy Console Output"
                                        className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-zinc-100 transition-all duration-150 active:scale-95 shadow-sm"
                                    >
                                        {copiedLogs ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        onClick={handleClearLogs}
                                        title="Clear Console"
                                        className="p-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 hover:text-rose-400 transition-all duration-150 active:scale-95 shadow-sm"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Logs Area */}
                            <ScrollArea className="flex-grow p-3.5 pr-2.5 custom-scroll relative z-10">
                                <div className="space-y-2 pb-2 text-[10px] browser-mono">
                                    {logs.map((log, index) => {
                                        const meta = logMeta[log.type] || logMeta.system;
                                        const Icon = meta.icon;
                                        return (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                                className={`p-2.5 rounded-xl border ${meta.border} ${meta.bg} ${meta.glow} flex items-start gap-2.5 relative group hover:border-white/20 transition-all duration-200`}
                                            >
                                                {/* Glowing type badge */}
                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-950/80 border border-white/5 text-[9px] font-bold ${meta.color}`}>
                                                    <Icon className="w-2.5 h-2.5 shrink-0" />
                                                    <span className="tracking-wider uppercase">{meta.label}</span>
                                                </div>
                                                
                                                {/* Content body */}
                                                <div className="flex-1 text-zinc-300 leading-relaxed break-words min-w-0 font-medium">
                                                    {log.content}
                                                </div>
                                                
                                                {/* Mini Timestamp */}
                                                <span className="text-[8px] text-zinc-500 shrink-0 mt-0.5 font-mono select-none px-1.5 py-0.5 rounded bg-zinc-950/40 border border-white/[0.02]">
                                                    {mounted ? log.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                    {(isAgentRunning || isStreaming) && (
                                        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-violet-950/10 border border-violet-500/20 text-violet-400 text-[10px] font-semibold animate-pulse">
                                            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                            <span className="tracking-wide">Awaiting remote LLM instruction packet...</span>
                                        </div>
                                    )}
                                    <div ref={logEndRef} />
                                </div>
                            </ScrollArea>

                            {/* Live Telemetry Stats Bar */}
                            <div className="px-4 py-2.5 border-t border-white/[0.06] bg-white/[0.01] flex items-center justify-between text-[8px] font-mono text-zinc-500 select-none relative z-10 shrink-0">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                                        PROXY: SECURE
                                    </span>
                                    <span className="hover:text-zinc-300 transition-colors">LOGS: {logs.length}</span>
                                    <span className="hover:text-zinc-300 transition-colors">TEL_PING: 47ms</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isStreaming ? (
                                        <span className="text-cyan-400 font-bold flex items-center gap-1 tracking-wider uppercase animate-pulse">
                                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                                            STREAMING
                                        </span>
                                    ) : (
                                        <span className="text-zinc-600 font-semibold tracking-wider uppercase">
                                            SYS_IDLE
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Synthesis Output Widget (Docked Bottom drawer) */}
                    <AnimatePresence>
                        {agentAnswer && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                                className="border-t border-border/30 bg-gradient-to-b from-background to-muted/20 shadow-inner relative max-h-[38%] overflow-hidden flex flex-col"
                            >
                                <div className="px-6 py-3.5 border-b border-border/20 bg-emerald-500/5 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-emerald-400" />
                                        <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-widest browser-heading">
                                            Synthesis Results
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={handleCopyAnswer}
                                            title="Copy markdown content"
                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95"
                                        >
                                            {copiedAnswer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            onClick={handleDownloadReport}
                                            title="Download report (.md)"
                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all duration-150 active:scale-95"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 custom-scroll">
                                    <div className="px-6 py-4 prose prose-xs dark:prose-invert max-w-none text-xs leading-relaxed text-zinc-300">
                                        <MarkdownRenderer content={agentAnswer} />
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* ═══════════════════════════════════════════════════════ */}
                {/* RIGHT BROWSER VIEWPORT DECK                            */}
                {/* ═══════════════════════════════════════════════════════ */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-6 relative">

                    {/* Simulated OS Browser Window Frame wrapper */}
                    <div className={`flex-1 flex flex-col rounded-2xl overflow-hidden glass-card shadow-2xl relative transition-all duration-300 holo-glow ${isAgentRunning ? 'holo-border-active' : 'border-border/30'}`}>

                        {/* Chrome Control Bar */}
                        <div className="bg-background/80 border-b border-border/30 px-5 py-3.5 flex flex-wrap items-center gap-4 relative z-10 backdrop-blur-md justify-between sm:justify-start">

                            {/* OS Window Traffic Lights */}
                            <div className="flex gap-2 shrink-0 select-none mr-2">
                                <div className="w-3 h-3 rounded-full bg-rose-500/90 shadow-sm shadow-rose-500/20 relative group cursor-pointer flex items-center justify-center text-[7px] text-rose-950 font-bold hover:scale-105 transition-transform" />
                                <div className="w-3 h-3 rounded-full bg-amber-500/90 shadow-sm shadow-amber-500/20 relative group cursor-pointer flex items-center justify-center text-[7px] text-amber-950 font-bold hover:scale-105 transition-transform" />
                                <div className="w-3 h-3 rounded-full bg-emerald-500/90 shadow-sm shadow-emerald-500/20 relative group cursor-pointer flex items-center justify-center text-[7px] text-emerald-950 font-bold hover:scale-105 transition-transform" />
                            </div>

                            {/* Deck Navigation Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
                                    onClick={goBack}
                                    disabled={historyIndex <= 0}
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
                                    onClick={goForward}
                                    disabled={historyIndex >= history.length - 1}
                                >
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
                                    onClick={() => handleManualNavigate(url)}
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPage ? 'animate-spin text-primary' : ''}`} />
                                </Button>
                            </div>

                            {/* Deck URL/Address Box */}
                            <div className="flex-1 min-w-[200px] flex items-center bg-muted/20 border border-border/20 rounded-xl px-3 py-1.5 gap-2 relative transition-all duration-300 focus-within:bg-muted/30 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10">
                                <div
                                    className="flex items-center cursor-pointer relative"
                                    onMouseEnter={() => setShowSslTooltip(true)}
                                    onMouseLeave={() => setShowSslTooltip(false)}
                                >
                                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    {showSslTooltip && (
                                        <div className="absolute top-6 left-0 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 p-2.5 rounded-lg w-52 shadow-2xl z-55 browser-mono leading-relaxed">
                                            <span className="text-emerald-400 font-bold block mb-1">✓ Connection Secure</span>
                                            SSL proxy active. Cookies and data routed through isolated API endpoint.
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    value={displayUrl}
                                    onChange={(e) => setDisplayUrl(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleManualNavigate(displayUrl); }}
                                    className="flex-1 bg-transparent text-[11px] text-foreground focus:outline-none browser-mono truncate placeholder:text-muted-foreground/30 select-all"
                                    placeholder="Enter URL to navigate manually..."
                                />
                                {isLoadingPage && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
                            </div>

                            {/* Interactive Mode Tabs */}
                            <div className="flex bg-muted/40 p-0.5 rounded-lg border border-border/20">
                                <button
                                    onClick={() => setActiveTab('live')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'live' ? 'bg-background shadow text-primary border border-border/10' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    Live viewport
                                </button>
                                <button
                                    onClick={() => setActiveTab('reader')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'reader' ? 'bg-background shadow text-primary border border-border/10' : 'text-muted-foreground hover:text-foreground'}`}
                                    disabled={!latestPageData}
                                >
                                    <FileText className="w-3.5 h-3.5" />
                                    Text Reader
                                </button>
                                <button
                                    onClick={() => setActiveTab('links')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1.5 ${activeTab === 'links' ? 'bg-background shadow text-primary border border-border/10' : 'text-muted-foreground hover:text-foreground'}`}
                                    disabled={!latestPageData || latestPageData.links.length === 0}
                                >
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    Parsed Links ({latestPageData?.links.length || 0})
                                </button>
                            </div>

                            {/* Pilot Status Badge */}
                            <div className="shrink-0 flex items-center gap-2">
                                {isAgentRunning ? (
                                    <Badge className="bg-violet-500/10 text-violet-400 border border-violet-500/30 gap-1.5 text-[9px] font-extrabold uppercase tracking-widest browser-mono animate-pulse">
                                        <Bot className="w-3 h-3" />
                                        Agent Pilot Mode
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-muted-foreground border-border/40 gap-1.5 text-[9px] font-semibold uppercase tracking-wider browser-mono">
                                        <Monitor className="w-3 h-3" />
                                        Manual mode
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Viewport content area */}
                        <div className="flex-1 relative bg-white dark:bg-zinc-950 overflow-hidden flex flex-col">

                            {/* Loading Glass overlay */}
                            <AnimatePresence>
                                {isLoadingPage && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 z-40 bg-zinc-950/70 backdrop-blur-md flex flex-col items-center justify-center gap-4 pointer-events-none"
                                    >
                                        <div className="relative">
                                            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-ai-primary via-ai-primary-light to-ai-secondary flex items-center justify-center shadow-xl shadow-primary/20">
                                                <Globe className="w-8 h-8 text-white animate-spin-slow" />
                                            </div>
                                            <div className="absolute -inset-4 rounded-[36px] border border-primary/20 animate-ping opacity-30" />
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-xs font-bold uppercase tracking-wider text-zinc-300">Proxying Document</p>
                                            <p className="text-[10px] text-zinc-500 browser-mono max-w-xs truncate">{url}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* TAB 1: Live View iframe */}
                            <div className={`flex-1 w-full h-full relative ${activeTab === 'live' ? 'block' : 'hidden'}`}>
                                {/* Sweep scanline visual when AI is controlling browser */}
                                {isAgentRunning && (
                                    <>
                                        <div className="absolute inset-0 border-2 border-violet-500/25 pointer-events-none z-20" />
                                        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-b from-transparent via-violet-500/55 to-transparent pointer-events-none z-20 animate-slide-in-down" style={{ animationDuration: '4s', animationIterationCount: 'infinite' }} />
                                    </>
                                )}
                                <iframe
                                    ref={iframeRef}
                                    src={proxyUrl}
                                    className="w-full h-full border-none bg-white"
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                                    title="Browser viewport"
                                />
                            </div>

                            {/* TAB 2: Extracted Reader Text */}
                            <div className={`flex-1 flex flex-col bg-zinc-950 p-6 overflow-hidden ${activeTab === 'reader' ? 'block' : 'hidden'}`}>
                                <div className="flex gap-4 items-center mb-4 border-b border-border/20 pb-3 shrink-0">
                                    <div className="flex-1 relative">
                                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Filter text content..."
                                            value={readerSearch}
                                            onChange={(e) => setReaderSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border/20 bg-muted/10 text-xs focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 browser-mono"
                                        />
                                    </div>
                                    {readerSearch && (
                                        <button
                                            onClick={() => setReaderSearch("")}
                                            className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                                        >
                                            Reset Filter
                                        </button>
                                    )}
                                </div>
                                <ScrollArea className="flex-1 custom-scroll bg-zinc-900/40 border border-border/20 rounded-xl p-4.5">
                                    {filteredReaderText ? (
                                        <pre className="text-[11px] font-medium leading-relaxed text-zinc-300 whitespace-pre-wrap font-sans break-words select-text">
                                            {filteredReaderText}
                                        </pre>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                            <FileText className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                            <p className="text-xs text-muted-foreground">No extracted text matches your search.</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>

                            {/* TAB 3: Parsed Links Index */}
                            <div className={`flex-1 flex flex-col bg-zinc-950 p-6 overflow-hidden ${activeTab === 'links' ? 'block' : 'hidden'}`}>
                                <div className="flex gap-4 items-center mb-4 border-b border-border/20 pb-3 shrink-0">
                                    <div className="flex-1 relative">
                                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                                        <input
                                            type="text"
                                            placeholder="Search links or anchor text..."
                                            value={linksSearch}
                                            onChange={(e) => setLinksSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-border/20 bg-muted/10 text-xs focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 browser-mono"
                                        />
                                    </div>
                                    {linksSearch && (
                                        <button
                                            onClick={() => setLinksSearch("")}
                                            className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                                        >
                                            Clear Search
                                        </button>
                                    )}
                                </div>
                                <ScrollArea className="flex-1 custom-scroll">
                                    {filteredLinks.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pr-2">
                                            {filteredLinks.map((link, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-3 rounded-xl border border-border/20 bg-muted/5 hover:border-primary/30 transition-all flex flex-col justify-between items-start gap-1 group relative overflow-hidden"
                                                >
                                                    <span className="text-[11px] font-semibold text-zinc-200 group-hover:text-primary transition-colors pr-8">
                                                        {link.text || "[No anchor text]"}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground browser-mono truncate max-w-full">
                                                        {link.href}
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            handleManualNavigate(link.href);
                                                            setActiveTab('live');
                                                        }}
                                                        className="absolute right-2.5 top-2.5 p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors md:opacity-0 md:group-hover:opacity-100"
                                                        title="Navigate to URL"
                                                    >
                                                        <ArrowUpRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                                            <LinkIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                            <p className="text-xs text-muted-foreground">No parsed links match your search filter.</p>
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
