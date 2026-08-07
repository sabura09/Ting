"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Bell, Trash2, Check, CheckCheck, Filter, Search,
    Info, CheckCircle2, AlertTriangle, XCircle,
    ArrowLeft, Send, Pin, MessageSquare, Eye,
    ChevronRight, RefreshCw, X, Mail, Shield,
    Sparkles, Zap, Heart, Star, Settings, Home,
    FileText, Image, Code, Database, Cpu, Wifi,
    Lock, Unlock, Calendar, Tag, Bookmark,
    TrendingUp, Activity, BarChart3, LayoutDashboard,
    MessageCircle, Volume2, Award, Gift,
    Users, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const ICON_MAP: Record<string, any> = {
    info: Info, "check-circle": CheckCircle2, "alert-triangle": AlertTriangle,
    "x-circle": XCircle, bell: Bell, sparkles: Sparkles, zap: Zap,
    mail: Mail, shield: Shield, heart: Heart, star: Star,
    settings: Settings, home: Home, "file-text": FileText, image: Image,
    code: Code, database: Database, cpu: Cpu, wifi: Wifi,
    lock: Lock, unlock: Unlock, calendar: Calendar, tag: Tag,
    bookmark: Bookmark, "trending-up": TrendingUp, activity: Activity,
    "bar-chart": BarChart3, layout: LayoutDashboard, message: MessageCircle,
    volume: Volume2, award: Award, gift: Gift, users: Users,
    globe: Globe, send: Send, refresh: RefreshCw,
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any; gradient: string }> = {
    info: { label: "Info", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20", icon: Info, gradient: "from-cyan-500/20 to-blue-500/20" },
    success: { label: "Success", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", icon: CheckCircle2, gradient: "from-emerald-500/20 to-teal-500/20" },
    warning: { label: "Warning", color: "text-amber-400", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/20", icon: AlertTriangle, gradient: "from-amber-500/20 to-orange-500/20" },
    error: { label: "Critical", color: "text-rose-400", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/20", icon: XCircle, gradient: "from-rose-500/20 to-red-500/20" },
};

function getIconComponent(iconName: string) {
    return ICON_MAP[iconName] || Info;
}

function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [severityFilter, setSeverityFilter] = useState("");
    const [readFilter, setReadFilter] = useState("");
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    const fetchNotifications = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (severityFilter) params.set('severity', severityFilter);
            if (readFilter) params.set('isRead', readFilter);
            params.set('limit', '50');

            const res = await fetch(`/api/notifications?${params}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setTotal(data.total || 0);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [severityFilter, readFilter]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleMarkRead = async (id: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'markRead', notificationId: id }),
            });
            fetchNotifications();
        } catch (error) {
            console.error('Error marking read:', error);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'markAllRead' }),
            });
            toast({ title: "Done", description: "All notifications marked as read" });
            fetchNotifications();
        } catch (error) {
            toast({ title: "Error", description: "Failed to mark all read", variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await fetch('/api/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', notificationId: id }),
            });
            if (selectedNotification?.id === id) {
                setSelectedNotification(null);
                setMessages([]);
            }
            fetchNotifications();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
        }
    };

    const openNotification = async (notification: any) => {
        setSelectedNotification(notification);
        if (!notification.is_read) {
            handleMarkRead(notification.id);
        }
        // Load conversation messages
        if (notification.allow_replies) {
            try {
                const res = await fetch(`/api/notifications/${notification.id}/messages`);
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.messages || []);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            } catch (error) {
                console.error('Error loading messages:', error);
            }
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedNotification) return;
        setSendingReply(true);
        try {
            const res = await fetch(`/api/notifications/${selectedNotification.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: replyText.trim() }),
            });
            if (res.ok) {
                setReplyText("");
                // Reload messages
                const msgRes = await fetch(`/api/notifications/${selectedNotification.id}/messages`);
                if (msgRes.ok) {
                    const data = await msgRes.json();
                    setMessages(data.messages || []);
                    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                }
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error || "Failed to send", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
        } finally {
            setSendingReply(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
                            <Bell className="w-5 h-5 text-violet-500" />
                        </div>
                        Notifications
                        {unreadCount > 0 && (
                            <Badge className="bg-violet-500 text-white text-xs">{unreadCount} new</Badge>
                        )}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Stay updated with announcements and messages
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-2 text-xs">
                            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchNotifications} className="gap-2 text-xs">
                        <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value)}
                    className="h-8 px-3 rounded-lg border bg-background text-xs focus:ring-2 focus:ring-violet-500/20 outline-none"
                >
                    <option value="">All Types</option>
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Critical</option>
                </select>
                <select
                    value={readFilter}
                    onChange={e => setReadFilter(e.target.value)}
                    className="h-8 px-3 rounded-lg border bg-background text-xs focus:ring-2 focus:ring-violet-500/20 outline-none"
                >
                    <option value="">All</option>
                    <option value="false">Unread</option>
                    <option value="true">Read</option>
                </select>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Notification List */}
                <div className={cn("space-y-2", selectedNotification ? "lg:col-span-2" : "lg:col-span-5")}>
                    {loading ? (
                        <div className="text-center py-16 text-muted-foreground">Loading...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground border rounded-xl bg-background/50">
                            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">No notifications</p>
                            <p className="text-xs mt-1">You&apos;re all caught up!</p>
                        </div>
                    ) : notifications.map((n, i) => {
                        const severity = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
                        const IconComp = getIconComponent(n.icon);
                        const isSelected = selectedNotification?.id === n.id;
                        return (
                             <div
                                 key={n.id}
                                 onClick={() => openNotification(n)}
                                 role="button"
                                 tabIndex={0}
                                 onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotification(n); } }}
                                 className={cn(
                                     "w-full text-left p-4 rounded-xl border transition-all duration-200 group cursor-pointer",
                                     "hover:shadow-md hover:border-violet-500/20",
                                     isSelected ? "border-violet-500/30 bg-violet-500/5 shadow-md" : "bg-background/50",
                                     !n.is_read && "border-l-2",
                                     !n.is_read && severity.borderColor
                                 )}
                                 style={{ animationDelay: `${i * 40}ms` }}
                             >
                                 <div className="flex items-start gap-3">
                                     <div className={cn("p-2 rounded-xl flex-shrink-0 transition-colors", severity.bgColor)}>
                                         <IconComp className={cn("w-4 h-4", severity.color)} />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2">
                                             <h3 className={cn("text-sm font-medium truncate", !n.is_read && "font-semibold")}>
                                                 {n.title}
                                             </h3>
                                             {n.is_pinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                             {!n.is_read && <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />}
                                         </div>
                                         {n.description && (
                                             <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.description}</p>
                                         )}
                                         <div className="flex items-center gap-2 mt-1.5">
                                             <span className="text-[10px] text-muted-foreground">{formatDate(n.created_at)}</span>
                                             {n.allow_replies && parseInt(n.message_count) > 0 && (
                                                 <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                     <MessageSquare className="w-3 h-3" /> {n.message_count}
                                                 </span>
                                             )}
                                         </div>
                                     </div>
                                     <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button
                                             onClick={e => { e.stopPropagation(); handleDelete(n.id); }}
                                             className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                                         >
                                             <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                     </div>
                                     {selectedNotification && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
                                 </div>
                             </div>
                        );
                    })}
                </div>

                {/* Notification Detail & Conversation */}
                {selectedNotification && (
                    <div className="lg:col-span-3 space-y-4 animate-in slide-in-from-right-4 duration-300">
                        {/* Close button on mobile */}
                        <Button variant="ghost" size="sm" className="lg:hidden gap-2" onClick={() => { setSelectedNotification(null); setMessages([]); }}>
                            <ArrowLeft className="w-4 h-4" /> Back
                        </Button>

                        {/* Notification Content */}
                        <div className={cn(
                            "p-6 rounded-xl border bg-gradient-to-br backdrop-blur-sm",
                            SEVERITY_CONFIG[selectedNotification.severity]?.gradient || "from-cyan-500/5 to-blue-500/5"
                        )}>
                            <div className="flex items-start gap-3 mb-4">
                                {(() => {
                                    const sev = SEVERITY_CONFIG[selectedNotification.severity] || SEVERITY_CONFIG.info;
                                    const IC = getIconComponent(selectedNotification.icon);
                                    return (
                                        <div className={cn("p-2.5 rounded-xl", sev.bgColor)}>
                                            <IC className={cn("w-5 h-5", sev.color)} />
                                        </div>
                                    );
                                })()}
                                <div className="flex-1">
                                    <h2 className="text-lg font-semibold">{selectedNotification.title}</h2>
                                    {selectedNotification.description && (
                                        <p className="text-sm text-muted-foreground mt-0.5">{selectedNotification.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                        <span>From: {selectedNotification.creator_name || 'Admin'}</span>
                                        <span>•</span>
                                        <span>{formatDate(selectedNotification.created_at)}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="flex-shrink-0 hidden lg:flex"
                                    onClick={() => { setSelectedNotification(null); setMessages([]); }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div
                                className="prose prose-sm dark:prose-invert max-w-none p-4 rounded-xl bg-background/50 border"
                                dangerouslySetInnerHTML={{ __html: selectedNotification.content }}
                            />
                        </div>

                        {/* Conversation Thread */}
                        {selectedNotification.allow_replies && (
                            <div className="border rounded-xl bg-background/50 backdrop-blur-sm overflow-hidden">
                                <div className="px-4 py-3 border-b bg-muted/20">
                                    <h3 className="text-sm font-medium flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-violet-500" />
                                        Conversation
                                    </h3>
                                </div>

                                <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
                                    {messages.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-6">
                                            No messages yet. Start a conversation!
                                        </p>
                                    ) : messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "max-w-[85%] p-3 rounded-2xl text-sm",
                                                msg.sender_role === 'user'
                                                    ? "ml-auto bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 border border-violet-500/20 rounded-br-md"
                                                    : "bg-muted/50 border rounded-bl-md"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium">
                                                    {msg.sender_role === 'admin' ? (msg.sender_name || 'Admin') : 'You'}
                                                </span>
                                                {msg.sender_role === 'admin' && (
                                                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-violet-500 border-violet-500/30">
                                                        Admin
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="whitespace-pre-wrap">{msg.message}</p>
                                            <p className="text-[10px] text-muted-foreground mt-1">{formatDate(msg.created_at)}</p>
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Reply Input */}
                                <div className="border-t p-3 flex gap-2">
                                    <Input
                                        placeholder="Type your message..."
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                                        className="flex-1"
                                    />
                                    <Button
                                        onClick={handleSendReply}
                                        disabled={sendingReply || !replyText.trim()}
                                        size="icon"
                                        className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shrink-0"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
