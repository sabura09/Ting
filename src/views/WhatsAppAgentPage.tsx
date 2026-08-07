"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    MessageSquare,
    QrCode,
    Wifi,
    WifiOff,
    Settings,
    Play,
    Square,
    RefreshCw,
    Copy,
    Plus,
    X,
    Loader2,
    Shield,
    AlertTriangle,
    Search,
    Send,
    User,
    Check,
    CheckCheck,
    PlusCircle,
    Info,
    MessageCircle,
    Sliders,
    Bot,
    Clock,
    AlertCircle,
    ListFilter
} from "lucide-react";
import { AVAILABLE_MODELS } from "@/lib/models";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppSettings {
    user_email: string;
    is_active: boolean;
    reply_target: 'all' | 'select';
    target_numbers: string[];
    system_prompt: string;
    model_id: string;
    phone_number: string | null;
    tone: string;
    personality: string;
    reply_behavior: 'auto' | 'manual';
    response_delay: number;
}

interface Conversation {
    sender_number: string;
    sender_name: string | null;
    message_text: string;
    reply_text: string;
    status: string;
    created_at: string;
}

interface Message {
    id: string;
    direction: 'inbound' | 'outbound';
    type: 'incoming' | 'auto_reply' | 'manual' | 'system';
    text: string;
    timestamp: string;
    sender_name?: string | null;
    tokens_consumed?: number;
    status?: string;
}

export default function WhatsAppAgentPage() {
    const [settings, setSettings] = useState<WhatsAppSettings | null>(null);
    const [status, setStatus] = useState<string>("disconnected"); // disconnected, connecting, qr, connected, error
    const [qr, setQr] = useState<string>("");

    // View state
    const [activeTab, setActiveTab] = useState<'chats' | 'settings'>('chats');
    const [settingsSubTab, setSettingsSubTab] = useState<'connection' | 'persona' | 'whitelist'>('connection');

    // Conversations state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedContact, setSelectedContact] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>("");

    // Loading states
    const [loadingSettings, setLoadingSettings] = useState<boolean>(true);
    const [loadingConversations, setLoadingConversations] = useState<boolean>(true);
    const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
    const [savingSettings, setSavingSettings] = useState<boolean>(false);
    const [connecting, setConnecting] = useState<boolean>(false);
    const [disconnecting, setDisconnecting] = useState<boolean>(false);

    // Composer manual input
    const [composerMessage, setComposerMessage] = useState<string>("");
    const [sendingMessage, setSendingMessage] = useState<boolean>(false);

    // New Chat dialog state
    const [newChatNumber, setNewChatNumber] = useState<string>("");
    const [showNewChatInput, setShowNewChatInput] = useState<boolean>(false);

    // Form settings inputs
    const [systemPrompt, setSystemPrompt] = useState<string>("");
    const [modelId, setModelId] = useState<string>("gemini-2.5-flash");
    const [replyTarget, setReplyTarget] = useState<'all' | 'select'>("all");
    const [targetNumbers, setTargetNumbers] = useState<string[]>([]);
    const [newNumber, setNewNumber] = useState<string>("");
    const [tone, setTone] = useState<string>("friendly");
    const [personality, setPersonality] = useState<string>("professional");
    const [replyBehavior, setReplyBehavior] = useState<'auto' | 'manual'>("auto");
    const [responseDelay, setResponseDelay] = useState<number>(0);

    const { toast } = useToast();
    const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState<boolean>(false);

    // Disconnect confirmation modal state
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState<boolean>(false);

    // Refs for scrolling and live updating
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const selectedContactRef = useRef<string | null>(null);

    // Sync ref
    useEffect(() => {
        selectedContactRef.current = selectedContact;
    }, [selectedContact]);

    // Initial fetch
    useEffect(() => {
        fetchSettings();
        fetchConversations();
    }, []);

    // Auto-scroll chat history
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Fetch conversation messages when selected contact changes
    useEffect(() => {
        if (selectedContact) {
            fetchMessages(selectedContact);
        } else {
            setMessages([]);
        }
    }, [selectedContact]);

    // Auto-connect if offline on page load
    useEffect(() => {
        if (settings && status === "disconnected" && !hasAttemptedAutoConnect) {
            setHasAttemptedAutoConnect(true);
            handleConnect();
        }
    }, [settings, status, hasAttemptedAutoConnect]);

    // Setup EventSource for SSE Real-time Updates
    useEffect(() => {
        let eventSource: EventSource | null = null;

        const connectSse = () => {
            console.log("[WhatsApp UI] Establishing EventSource connection...");
            eventSource = new EventSource("/api/social/whatsapp/sse");

            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.status) {
                        setStatus(data.status);
                    }
                    if (data.qr !== undefined) {
                        setQr(data.qr);
                    }

                    // On connection update, sync session details if linked
                    if (data.status === "connected") {
                        fetchSettings();
                    }

                    // Handle real-time messaging updates
                    if (data.type === "message") {
                        fetchConversations();
                        const currentContact = selectedContactRef.current;
                        if (currentContact && (data.senderNumber === currentContact || data.senderNumber === 'all')) {
                            fetchMessages(currentContact);
                        }
                    }
                } catch (e) {
                    console.error("[WhatsApp UI] SSE event parsing error:", e);
                }
            };

            eventSource.onerror = (err) => {
                console.error("[WhatsApp UI] SSE Error occurred:", err);
                if (eventSource) eventSource.close();
                // Attempt reconnection after 6 seconds
                setTimeout(connectSse, 6000);
            };
        };

        connectSse();

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, []);

    // Fetch Functions
    const fetchSettings = async () => {
        setLoadingSettings(true);
        try {
            const res = await fetch("/api/social/whatsapp/settings");
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSettings(data.settings);
            setStatus(data.status);
            if (data.qr) {
                setQr(data.qr);
            }

            // Sync form values
            setSystemPrompt(data.settings.system_prompt);
            setModelId(data.settings.model_id);
            setReplyTarget(data.settings.reply_target);
            setTargetNumbers(data.settings.target_numbers || []);
            setTone(data.settings.tone || 'friendly');
            setPersonality(data.settings.personality || 'professional');
            setReplyBehavior(data.settings.reply_behavior || 'auto');
            setResponseDelay(data.settings.response_delay || 0);

            // Auto-switch to settings tab if not active/connected
            if (data.status !== "connected") {
                setActiveTab("settings");
            }
        } catch (error: any) {
            toast({
                title: "Error fetching configurations",
                description: error.message || "Failed to load agent settings.",
                variant: "destructive"
            });
        } finally {
            setLoadingSettings(false);
        }
    };

    const fetchConversations = async () => {
        try {
            const res = await fetch("/api/social/whatsapp/conversations");
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setConversations(data.conversations || []);
        } catch (error: any) {
            console.error("Error loading conversations:", error);
        } finally {
            setLoadingConversations(false);
        }
    };

    const fetchMessages = async (contact: string) => {
        setLoadingMessages(true);
        try {
            const res = await fetch(`/api/social/whatsapp/messages?contact=${contact}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setMessages(data.messages || []);
        } catch (error: any) {
            console.error("Error loading messages:", error);
            toast({
                title: "Failed to load chat history",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch("/api/social/whatsapp/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemPrompt,
                    modelId,
                    replyTarget,
                    targetNumbers,
                    tone,
                    personality,
                    replyBehavior,
                    responseDelay
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            toast({
                title: "Settings Saved",
                description: "WhatsApp AI agent configurations have been successfully updated."
            });
            fetchSettings();
        } catch (error: any) {
            toast({
                title: "Save Failed",
                description: error.message || "Failed to save configuration.",
                variant: "destructive"
            });
        } finally {
            setSavingSettings(false);
        }
    };

    const handleConnect = async () => {
        setConnecting(true);
        setQr("");
        try {
            const res = await fetch("/api/social/whatsapp/connect", {
                method: "POST"
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setStatus(data.status);
            toast({
                title: "Connecting",
                description: "Initializing WhatsApp. Please scan the QR code to link your account."
            });
        } catch (error: any) {
            toast({
                title: "Connection Failed",
                description: error.message || "Could not connect to WhatsApp client.",
                variant: "destructive"
            });
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        try {
            const res = await fetch("/api/social/whatsapp/connect", {
                method: "DELETE"
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setStatus("disconnected");
            setQr("");
            setSelectedContact(null);
            if (settings) {
                setSettings({ ...settings, phone_number: null, is_active: false });
            }
            toast({
                title: "Disconnected",
                description: "WhatsApp account unlinked successfully."
            });
            setShowDisconnectConfirm(false);
        } catch (error: any) {
            toast({
                title: "Disconnect Failed",
                description: error.message || "Could not log out of WhatsApp client.",
                variant: "destructive"
            });
        } finally {
            setDisconnecting(false);
        }
    };

    const handleAddNumber = () => {
        if (!newNumber.trim()) return;
        const clean = newNumber.replace(/\D/g, "");
        if (!clean) return;

        if (targetNumbers.includes(clean)) {
            toast({ title: "Already added", description: "This number is already in the whitelisted targets." });
            return;
        }

        setTargetNumbers([...targetNumbers, clean]);
        setNewNumber("");
    };

    const handleRemoveNumber = (index: number) => {
        setTargetNumbers(targetNumbers.filter((_, i) => i !== index));
    };

    // Manual message transmit
    const handleSendManualMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!composerMessage.trim() || !selectedContact) return;

        setSendingMessage(true);
        try {
            const res = await fetch("/api/social/whatsapp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contact: selectedContact,
                    message: composerMessage
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setComposerMessage("");
            // Optimistic manual fetch
            fetchMessages(selectedContact);
            fetchConversations();
        } catch (error: any) {
            toast({
                title: "Message Delivery Failed",
                description: error.message || "Failed to transmit manual message.",
                variant: "destructive"
            });
        } finally {
            setSendingMessage(false);
        }
    };

    // Create a new manual conversation
    const handleStartNewChat = (e: React.FormEvent) => {
        e.preventDefault();
        const clean = newChatNumber.replace(/\D/g, "");
        if (!clean) {
            toast({ title: "Invalid Number", description: "Please enter digits only.", variant: "destructive" });
            return;
        }

        setSelectedContact(clean);
        setNewChatNumber("");
        setShowNewChatInput(false);

        // Add dynamically to local conversations if it's not already there
        const exists = conversations.some(c => c.sender_number === clean);
        if (!exists) {
            setConversations(prev => [
                {
                    sender_number: clean,
                    sender_name: "New Contact",
                    message_text: "",
                    reply_text: "",
                    status: "manual",
                    created_at: new Date().toISOString()
                },
                ...prev
            ]);
        }
    };

    // Filter conversations by search input
    const filteredConversations = conversations.filter(c => {
        const nameMatch = c.sender_name?.toLowerCase().includes(searchQuery.toLowerCase());
        const numberMatch = c.sender_number.includes(searchQuery);
        return nameMatch || numberMatch;
    });

    // Helper: Dynamic colors for initials avatars
    const getAvatarColor = (num: string) => {
        const phonePart = num.split('@')[0];
        const charCodeSum = phonePart.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = charCodeSum % 6;
        const colors = [
            'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30',
            'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30',
            'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:text-teal-400 dark:border-teal-500/30',
            'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30',
            'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 dark:border-purple-500/30',
            'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30',
        ];
        return colors[index];
    };

    // Helper: Format message dates nicely
    const formatMessageTime = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return "Yesterday";
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    // Skeletons
    const ConversationsSkeleton = () => (
        <div className="space-y-3 p-3">
            {[...Array(6)].map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted/30" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted/30 rounded w-1/3" />
                        <div className="h-3 bg-muted/30 rounded w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );

    const MessagesSkeleton = () => (
        <div className="space-y-4 p-4 flex flex-col min-h-full justify-end">
            {[...Array(4)].map((_, idx) => {
                const isLeft = idx % 2 === 0;
                return (
                    <div key={idx} className={`flex items-start gap-2.5 max-w-[70%] ${isLeft ? 'self-start' : 'self-end flex-row-reverse'}`}>
                        <div className="w-8 h-8 rounded-full bg-muted/20 animate-pulse" />
                        <div className="flex flex-col gap-1 w-[200px]">
                            <div className={`p-3 rounded-2xl animate-pulse h-10 ${isLeft ? 'bg-muted/30 rounded-tl-none' : 'bg-emerald-500/10 rounded-tr-none'}`} />
                        </div>
                    </div>
                );
            })}
        </div>
    );

    // Calculate conversation stats
    const totalMsgs = messages.length;
    const aiMsgs = messages.filter(m => m.type === 'auto_reply').length;
    const manualMsgs = messages.filter(m => m.type === 'manual').length;
    const tokensUsed = messages.reduce((sum, m) => sum + (m.tokens_consumed || 0), 0);

    return (
        <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-emerald-500/5 via-background to-background text-foreground font-sans">

            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/40 px-6 py-4 bg-card/65 backdrop-blur-md">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-emerald-500" />
                        <h1
                            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent"
                            style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                        >
                            WhatsApp Agent Control
                        </h1>
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            {status === "connected" ? "Linked" : "Offline"}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {status === "connected" ? `Linked to session +${settings?.phone_number || ""}` : "Connect your mobile device to enable automation and messaging."}
                    </p>
                </div>

                {/* View Tabs */}
                <div className="flex items-center gap-2 bg-muted p-1.5 rounded-xl border border-border/80">
                    <button
                        onClick={() => setActiveTab('chats')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'chats'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Active Chats
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'settings'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                        style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Agent Settings
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 justify-center">

                {/* 1. CHATS VIEW (Three-panel layout) */}
                {activeTab === 'chats' && (
                    <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 border border-border/60 rounded-2xl overflow-hidden bg-card/35 backdrop-blur-xl shadow-xl">

                        {/* Sidebar: Chats List (Col span 4) */}
                        <div className="md:col-span-4 flex flex-col min-h-0 border-r border-border/60 bg-muted/10">

                            {/* Search and Action Bar */}
                            <div className="p-4 border-b border-border/20 space-y-3">
                                <div className="flex items-center gap-2 justify-between">
                                    <span className="text-sm font-semibold tracking-wide text-foreground/80" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                        Conversations
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowNewChatInput(!showNewChatInput)}
                                        className="h-8 w-8 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-full"
                                        title="New Manual Chat"
                                    >
                                        <PlusCircle className="w-5 h-5" />
                                    </Button>
                                </div>

                                {/* Start Manual Conversation Input */}
                                {showNewChatInput && (
                                    <form onSubmit={handleStartNewChat} className="flex gap-2 p-2 rounded-lg bg-background border border-emerald-500/30 animate-in slide-in-from-top-1 duration-200">
                                        <Input
                                            placeholder="Enter phone with country code (e.g. 1415...)"
                                            value={newChatNumber}
                                            onChange={(e) => setNewChatNumber(e.target.value)}
                                            className="h-8 text-xs bg-background border-border/40 focus-visible:ring-emerald-500 text-foreground"
                                            autoFocus
                                        />
                                        <Button type="submit" size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white">
                                            Start
                                        </Button>
                                    </form>
                                )}

                                {/* Search Field */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/60" />
                                    <Input
                                        placeholder="Search by name or number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 h-9 text-xs bg-background border-border/60 text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            {/* Scrollable List */}
                            <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border/10">
                                {loadingConversations ? (
                                    <ConversationsSkeleton />
                                ) : filteredConversations.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-2 text-muted-foreground">
                                        <MessageCircle className="w-8 h-8 opacity-20" />
                                        <p className="text-xs italic">No active conversations found.</p>
                                        <p className="text-[10px] max-w-[200px]">Click the plus icon above to start chatting manually with a client.</p>
                                    </div>
                                ) : (
                                    filteredConversations.map((chat) => {
                                        const phonePart = chat.sender_number.split('@')[0];
                                        const initials = (chat.sender_name || phonePart.slice(-2))
                                            .substring(0, 2)
                                            .toUpperCase();
                                        const isActive = selectedContact === chat.sender_number;

                                        // Determine recent text preview
                                        const isManualOutbound = chat.status === 'manual';
                                        const previewText = isManualOutbound
                                            ? `You: ${chat.reply_text}`
                                            : (chat.reply_text ? `AI: ${chat.reply_text}` : chat.message_text);

                                        return (
                                            <button
                                                key={chat.sender_number}
                                                onClick={() => setSelectedContact(chat.sender_number)}
                                                className={`w-full flex items-start gap-3 p-3.5 text-left transition-all ${isActive
                                                        ? 'bg-emerald-500/10 border-l-4 border-emerald-500'
                                                        : 'hover:bg-muted/40 border-l-4 border-transparent'
                                                    }`}
                                            >
                                                {/* Initials Avatar */}
                                                <div className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-sm tracking-wide shrink-0 ${getAvatarColor(chat.sender_number)}`}>
                                                    {initials}
                                                </div>

                                                {/* Meta */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-xs font-semibold text-foreground truncate">
                                                            {chat.sender_name || `+${phonePart}`}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground/75 shrink-0">
                                                            {formatMessageTime(chat.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground truncate pr-2">
                                                        {previewText}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Center: Conversation Window (Col span 5 or 8 depending on lg sidebar) */}
                        <div className="col-span-1 md:col-span-8 lg:col-span-5 flex flex-col min-h-0 bg-background/50 relative">

                            {selectedContact ? (
                                <>
                                    {/* Active Contact Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card/40">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-semibold text-xs ${getAvatarColor(selectedContact)}`}>
                                                {selectedContact.split('@')[0].slice(-2)}
                                            </div>
                                            <div>
                                                <h3 className="text-xs font-semibold text-foreground">
                                                    +{selectedContact.split('@')[0]}
                                                </h3>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {replyBehavior === 'auto' ? 'AI active' : 'Manual operator'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400">
                                                {replyBehavior === 'auto' ? 'AI Auto-reply On' : 'Manual Mode'}
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Chat Messages Log */}
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5 min-h-0">
                                        {loadingMessages && messages.length === 0 ? (
                                            <MessagesSkeleton />
                                        ) : messages.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                                                <MessageSquare className="w-10 h-10 opacity-10 mb-2 animate-bounce" />
                                                <p className="text-xs italic">No messages recorded in this chat.</p>
                                                <p className="text-[10px] max-w-[200px] mt-1">Send a manual reply below to begin the session history.</p>
                                            </div>
                                        ) : (
                                            messages.map((msg, index) => {
                                                const isInbound = msg.direction === 'inbound';

                                                if (msg.type === 'system') {
                                                    return (
                                                        <div key={msg.id || index} className="flex justify-center my-3 animate-in fade-in duration-300">
                                                            <div className="px-3.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 dark:text-red-400 text-[10px] flex items-center gap-1.5 max-w-sm text-center">
                                                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                                <span>{msg.text}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={msg.id || index}
                                                        className={`flex w-full ${isInbound ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}
                                                    >
                                                        <div className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-md ${isInbound
                                                                ? 'bg-muted/90 border border-border/60 text-foreground rounded-tl-none'
                                                                : msg.type === 'manual'
                                                                    ? 'bg-blue-600/90 text-white rounded-tr-none'
                                                                    : 'bg-emerald-600/90 text-white rounded-tr-none'
                                                            }`}>
                                                            {/* Sender Name */}
                                                            {isInbound && (
                                                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                                                                    {msg.sender_name || "Contact"}
                                                                </div>
                                                            )}

                                                            {/* Text */}
                                                            <p className="leading-relaxed whitespace-pre-line break-words">
                                                                {msg.text}
                                                            </p>

                                                            {/* Footer Meta */}
                                                            <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[9px] opacity-75 select-none">
                                                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                                                                {!isInbound && (
                                                                    <>
                                                                        {msg.type === 'auto_reply' ? (
                                                                            <Badge className="bg-slate-950/40 text-emerald-300 text-[8px] py-0 border-none shrink-0">
                                                                                AI {msg.tokens_consumed ? `(-${msg.tokens_consumed}T)` : ''}
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge className="bg-slate-950/40 text-blue-300 text-[8px] py-0 border-none shrink-0">
                                                                                Manual
                                                                            </Badge>
                                                                        )}
                                                                        <CheckCheck className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    {/* Message Composer */}
                                    <form onSubmit={handleSendManualMessage} className="p-4 border-t border-border/60 bg-card/65 flex gap-2 items-center">
                                        <Input
                                            placeholder="Type a manual reply here..."
                                            value={composerMessage}
                                            onChange={(e) => setComposerMessage(e.target.value)}
                                            disabled={sendingMessage || status !== 'connected'}
                                            className="bg-background border-border/80 focus-visible:ring-emerald-500 text-xs py-5 text-foreground placeholder:text-muted-foreground/60"
                                        />
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={sendingMessage || !composerMessage.trim() || status !== 'connected'}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 w-10 shrink-0 shadow-lg shadow-emerald-500/10"
                                        >
                                            {sendingMessage ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </form>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground space-y-3 bg-background/10">
                                    <div className="w-16 h-16 rounded-full border border-border/10 bg-card flex items-center justify-center">
                                        <MessageSquare className="w-8 h-8 text-emerald-500/50" />
                                    </div>
                                    <div>
                                        <h3 className="text-foreground font-semibold text-sm" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                            No Chat Selected
                                        </h3>
                                        <p className="text-xs text-muted-foreground max-w-[280px] mt-1 mx-auto leading-relaxed">
                                            Select a contact from the conversations sidebar or start a new manual chat session using the plus icon.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Panel: Conversation Details & Statistics (Col span 3) */}
                        <div className="hidden lg:flex lg:col-span-3 flex-col min-h-0 border-l border-border/60 bg-card/45 overflow-y-auto">
                            {selectedContact ? (
                                <div className="p-5 space-y-6">
                                    {/* Header Info */}
                                    <div className="text-center space-y-2">
                                        <div className={`w-14 h-14 rounded-full border mx-auto flex items-center justify-center font-bold text-lg ${getAvatarColor(selectedContact)}`}>
                                            {selectedContact.split('@')[0].slice(-2)}
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-xs font-semibold text-foreground">
                                                +{selectedContact.split('@')[0]}
                                            </h4>
                                            <span className="text-[9px] text-muted-foreground font-mono">Contact Details</span>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <Card className="bg-muted/40 border border-border/40">
                                            <CardContent className="p-3 text-center">
                                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</span>
                                                <p className="text-lg font-bold text-foreground mt-1" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>{totalMsgs}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-muted/40 border border-border/40">
                                            <CardContent className="p-3 text-center">
                                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">AI Replies</span>
                                                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>{aiMsgs}</p>
                                            </CardContent>
                                        </Card>
                                        <Card className="bg-muted/40 border border-border/40 col-span-2">
                                            <CardContent className="p-3 flex items-center justify-between">
                                                <div className="text-left">
                                                    <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Tokens Spent</span>
                                                    <p className="text-sm font-semibold text-foreground mt-0.5">{tokensUsed} Tokens</p>
                                                </div>
                                                <Badge className="bg-background border border-border text-muted-foreground text-[8px] font-mono">
                                                    Manual: {manualMsgs}
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    {/* active rules info */}
                                    <div className="space-y-3 pt-3 border-t border-border/20">
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground/80" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                            Active Persona Info
                                        </span>
                                        <div className="space-y-2 text-[11px] text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/40">
                                            <div className="flex justify-between">
                                                <span>Model:</span>
                                                <span className="font-mono text-foreground">{modelId}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Tone:</span>
                                                <span className="text-foreground capitalize">{tone}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Personality:</span>
                                                <span className="text-foreground capitalize">{personality}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Delay:</span>
                                                <span className="text-foreground">{responseDelay} seconds</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center p-5 text-center text-muted-foreground/60">
                                    <Info className="w-7 h-7 opacity-20 mb-1" />
                                    <p className="text-[10px] italic">No active metadata available.</p>
                                </div>
                            )}
                        </div>

                    </div>
                )}

                {/* 2. SETTINGS VIEW */}
                {activeTab === 'settings' && (
                    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-card/25 border border-border rounded-2xl p-6 overflow-y-auto">

                        {/* Sub Tab Navigation (Col span 3) */}
                        <div className="lg:col-span-3 flex flex-col space-y-2 border-r border-border pr-4 shrink-0">
                            <span
                                className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2"
                                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                            >
                                Settings Tabs
                            </span>
                            <button
                                onClick={() => setSettingsSubTab('connection')}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${settingsSubTab === 'connection'
                                        ? 'bg-emerald-600/90 text-white shadow-md'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <QrCode className="w-4 h-4" />
                                Link & Status
                            </button>
                            <button
                                onClick={() => setSettingsSubTab('persona')}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${settingsSubTab === 'persona'
                                        ? 'bg-emerald-600/90 text-white shadow-md'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <Sliders className="w-4 h-4" />
                                AI Character Persona
                            </button>
                            <button
                                onClick={() => setSettingsSubTab('whitelist')}
                                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${settingsSubTab === 'whitelist'
                                        ? 'bg-emerald-600/90 text-white shadow-md'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                    }`}
                            >
                                <Shield className="w-4 h-4" />
                                Whitelisted Numbers
                            </button>

                            <div className="pt-6 mt-6 border-t border-border/10 space-y-4">
                                <div className="bg-muted/40 p-3 rounded-lg border border-border space-y-2">
                                    <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500 font-semibold uppercase tracking-wider">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Limits & Safety
                                    </div>
                                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                                        Avoid bulk notifications or spam. Whitelisting targets is recommended to test new configurations safely.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Active Configuration Panel (Col span 9) */}
                        <div className="lg:col-span-9 flex flex-col min-h-0 space-y-4">

                            {/* Tab 2a: Connection State */}
                            {settingsSubTab === 'connection' && (
                                <Card className="bg-card border-border/60 shadow-sm relative overflow-hidden flex-1">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center justify-between">
                                            <span>WhatsApp Session Control</span>
                                            <div className="flex items-center gap-2">
                                                {status === "connected" ? (
                                                    <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-pulse">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </Badge>
                                                ) : status === "qr" ? (
                                                    <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                        Scan QR
                                                    </Badge>
                                                ) : status === "connecting" ? (
                                                    <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Starting
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                                        Disconnected
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Connect your account by scanning the dynamically generated QR code.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center justify-center py-8 min-h-[300px]">
                                        {status === "qr" && qr ? (
                                            <div className="flex flex-col items-center space-y-4 animate-in fade-in duration-300">
                                                <div className="p-3.5 bg-white rounded-xl shadow-inner border border-border relative">
                                                    <img src={qr} alt="WhatsApp Web QR Code" className="w-52 h-52 object-contain" />
                                                    <div className="absolute inset-0 border-2 border-emerald-500/10 rounded-xl pointer-events-none" />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-xs font-semibold text-foreground">Scan QR Code</p>
                                                    <p className="text-[10px] text-muted-foreground max-w-xs leading-normal">
                                                        Open WhatsApp on your mobile phone &rarr; Settings &rarr; Linked Devices &rarr; Link a Device.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : status === "connected" ? (
                                            <div className="flex flex-col items-center text-center space-y-4 animate-in scale-in duration-300">
                                                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/5">
                                                    <Wifi className="w-7 h-7 text-emerald-500" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-foreground">Successfully Connected</p>
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                                                        +{settings?.phone_number || "Active WhatsApp Client"}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground max-w-xs pt-1 leading-normal">
                                                        Your AI agent is running successfully in the background and logging interactions.
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="destructive"
                                                    onClick={() => setShowDisconnectConfirm(true)}
                                                    disabled={disconnecting}
                                                    className="bg-red-500/10 hover:bg-red-500/25 text-red-500 dark:text-red-400 border border-red-500/20 text-xs px-6 py-2 transition-all mt-4"
                                                >
                                                    {disconnecting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                            Disconnecting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <WifiOff className="w-4 h-4 mr-1.5" />
                                                            Unlink Account
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        ) : status === "connecting" ? (
                                            <div className="flex flex-col items-center text-center space-y-4 animate-pulse">
                                                <div className="w-12 h-12 rounded-full border border-blue-500/30 flex items-center justify-center bg-blue-500/5">
                                                    <Loader2 className="w-6 h-6 text-blue-500 dark:text-blue-400 animate-spin" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-foreground">Initializing Socket</p>
                                                    <p className="text-[10px] text-muted-foreground max-w-xs">
                                                        Generating secure WhatsApp session handshake. Please wait...
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in duration-300">
                                                <div className="w-12 h-12 rounded-full border border-border bg-card flex items-center justify-center">
                                                    <WifiOff className="w-6 h-6 text-muted-foreground" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs font-semibold text-foreground">Account Disconnected</p>
                                                    <p className="text-[10px] text-muted-foreground max-w-xs leading-normal">
                                                        AI Responder is offline. Start a new session connection to load the QR scanner.
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={handleConnect}
                                                    disabled={connecting}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-6 py-2 shadow-md"
                                                >
                                                    {connecting ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                            Connecting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="w-4 h-4 mr-1.5" />
                                                            Start Connection
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Tab 2b: AI Persona */}
                            {settingsSubTab === 'persona' && (
                                <Card className="bg-card border border-border/60 shadow-sm flex-1">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-1.5">
                                            <Bot className="w-5 h-5 text-emerald-500" />
                                            AI Persona Identity
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Control AI Model parameters, character prompting, tone variables, response delay, and toggle rules.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">

                                        {/* Row 1: Model & Response Mode */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                            {/* AI Model */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="model-select" className="text-xs font-medium text-foreground">AI Model Orchestrator</Label>
                                                <Select value={modelId} onValueChange={setModelId}>
                                                    <SelectTrigger id="model-select" className="border-border bg-background text-xs">
                                                        <SelectValue placeholder="Select Model" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {AVAILABLE_MODELS.map((model) => (
                                                            <SelectItem key={model.id} value={model.id} className="text-xs">
                                                                {model.name} ({model.provider})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Reply Behavior Toggle */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="behavior-select" className="text-xs font-medium text-foreground">Reply Automation Mode</Label>
                                                <Select value={replyBehavior} onValueChange={(val: 'auto' | 'manual') => setReplyBehavior(val)}>
                                                    <SelectTrigger id="behavior-select" className="border-border bg-background text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="auto" className="text-xs">AI Auto-Reply Enabled</SelectItem>
                                                        <SelectItem value="manual" className="text-xs">Manual Operator Control Only</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Row 2: Character Tone & Personality */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                            {/* Tone */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="tone-input" className="text-xs font-medium text-foreground">Tone</Label>
                                                <Input
                                                    id="tone-input"
                                                    value={tone}
                                                    onChange={(e) => setTone(e.target.value)}
                                                    placeholder="friendly, casual, sarcastic..."
                                                    className="border-border bg-background text-xs"
                                                />
                                            </div>

                                            {/* Personality */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="personality-input" className="text-xs font-medium text-foreground">Personality Type</Label>
                                                <Input
                                                    id="personality-input"
                                                    value={personality}
                                                    onChange={(e) => setPersonality(e.target.value)}
                                                    placeholder="helpful assistant, agent..."
                                                    className="border-border bg-background text-xs"
                                                />
                                            </div>

                                            {/* Response Delay */}
                                            <div className="space-y-1.5">
                                                <Label htmlFor="delay-input" className="text-xs font-medium text-foreground">Response Delay (Seconds)</Label>
                                                <Input
                                                    id="delay-input"
                                                    type="number"
                                                    value={responseDelay}
                                                    onChange={(e) => setResponseDelay(parseInt(e.target.value, 10) || 0)}
                                                    placeholder="0"
                                                    min={0}
                                                    className="border-border bg-background text-xs"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 3: System Prompt */}
                                        <div className="space-y-1.5">
                                            <Label htmlFor="prompt-input" className="text-xs font-medium text-foreground">System Instruction Prompt</Label>
                                            <Textarea
                                                id="prompt-input"
                                                value={systemPrompt}
                                                onChange={(e) => setSystemPrompt(e.target.value)}
                                                placeholder="Describe who the agent is, how they behave, and what information they can supply."
                                                rows={5}
                                                className="border-border bg-background resize-none text-xs leading-normal"
                                            />
                                        </div>

                                        <Button
                                            onClick={handleSaveSettings}
                                            disabled={savingSettings}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-5 mt-2"
                                        >
                                            {savingSettings ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-4 h-4 mr-1.5" />
                                                    Save Configuration
                                                </>
                                            )}
                                        </Button>

                                    </CardContent>
                                </Card>
                            )}

                            {/* Tab 2c: Whitelist numbers */}
                            {settingsSubTab === 'whitelist' && (
                                <Card className="bg-card border border-border/60 shadow-sm flex-1">
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-1.5">
                                            <Shield className="w-5 h-5 text-emerald-500" />
                                            Target Whitelist Manager
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            Configure whether the AI replies to all numbers or only select whitelisted contacts.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">

                                        {/* Target Settings */}
                                        <div className="space-y-3 bg-muted/30 p-4 border border-border rounded-xl">
                                            <Label className="text-xs font-semibold text-foreground">Automation Recipient Rules</Label>
                                            <div className="flex flex-col sm:flex-row gap-4 pt-1">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                                                    <input
                                                        type="radio"
                                                        name="replyTarget"
                                                        value="all"
                                                        checked={replyTarget === "all"}
                                                        onChange={() => setReplyTarget("all")}
                                                        className="accent-emerald-500 h-3.5 w-3.5"
                                                    />
                                                    Reply to ALL incoming conversations
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground">
                                                    <input
                                                        type="radio"
                                                        name="replyTarget"
                                                        value="select"
                                                        checked={replyTarget === "select"}
                                                        onChange={() => setReplyTarget("select")}
                                                        className="accent-emerald-500 h-3.5 w-3.5"
                                                    />
                                                    Only whitelist selected numbers
                                                </label>
                                            </div>
                                        </div>

                                        {/* Number Whitelist input manager */}
                                        {replyTarget === "select" && (
                                            <div className="space-y-3 animate-in slide-in-from-top-1 duration-200">
                                                <Label htmlFor="add-num-input" className="text-xs text-muted-foreground">Add Whitelist Number (digits only, e.g. 14155552671)</Label>
                                                <div className="flex gap-2">
                                                    <Input
                                                        id="add-num-input"
                                                        value={newNumber}
                                                        onChange={(e) => setNewNumber(e.target.value)}
                                                        placeholder="e.g. 14155552671"
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddNumber()}
                                                        className="border-border bg-background text-xs"
                                                    />
                                                    <Button size="sm" onClick={handleAddNumber} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 shrink-0">
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </div>

                                                <div className="flex flex-wrap gap-2 pt-3">
                                                    {targetNumbers.length === 0 ? (
                                                        <p className="text-[11px] text-muted-foreground italic">No numbers whitelisted. The AI agent will not auto-reply to anyone.</p>
                                                    ) : (
                                                        targetNumbers.map((number, idx) => (
                                                            <Badge key={idx} variant="secondary" className="pr-1 py-1.5 flex items-center gap-1.5 bg-muted border border-border text-foreground">
                                                                <span className="font-mono text-xs">+{number}</span>
                                                                <button
                                                                    onClick={() => handleRemoveNumber(idx)}
                                                                    className="text-muted-foreground hover:text-foreground rounded-full hover:bg-muted p-0.5 shrink-0"
                                                                >
                                                                    <X className="w-3 h-3" />
                                                                </button>
                                                            </Badge>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <Button
                                            onClick={handleSaveSettings}
                                            disabled={savingSettings}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-5 mt-2"
                                        >
                                            {savingSettings ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                                    Saving Changes...
                                                </>
                                            ) : (
                                                <>
                                                    <Shield className="w-4 h-4 mr-1.5" />
                                                    Save Target Rules
                                                </>
                                            )}
                                        </Button>

                                    </CardContent>
                                </Card>
                            )}

                        </div>

                    </div>
                )}

            </div>

            {/* Disconnect Confirmation Dialog */}
            {showDisconnectConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card border border-border rounded-2xl max-w-sm w-full mx-4 overflow-hidden shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-500">
                            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-sm text-foreground" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                                Unlink WhatsApp Account
                            </h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-normal">
                            Are you sure you want to disconnect? This will log out and unlink your WhatsApp account, stopping all auto-responses.
                        </p>
                        <div className="flex gap-2 justify-end pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowDisconnectConfirm(false)}
                                className="text-xs text-muted-foreground hover:bg-muted hover:text-foreground px-4"
                                disabled={disconnecting}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleDisconnect}
                                className="text-xs bg-red-600 hover:bg-red-500 text-white px-4 flex items-center gap-1.5 shadow-lg"
                                disabled={disconnecting}
                            >
                                {disconnecting ? (
                                    <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Unlinking...
                                    </>
                                ) : (
                                    <>
                                        <WifiOff className="w-3.5 h-3.5" />
                                        Unlink Account
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
