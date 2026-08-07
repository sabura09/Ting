"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
    Bell, Plus, Send, Save, Clock, Pin, MessageSquare,
    Trash2, Eye, Edit3, Search, Filter, ChevronDown,
    Info, CheckCircle2, AlertTriangle, XCircle,
    Users, Globe, User, X, Bold, Italic, List,
    Link as LinkIcon, Sparkles, BarChart3,
    ChevronRight, ArrowLeft, Check, RefreshCw,
    Mail, Shield, Zap, Heart, Star, Settings, Home,
    FileText, Image, Code, Database, Cpu, Wifi,
    Lock, Unlock, Calendar, Tag, Bookmark,
    TrendingUp, Activity, PieChart, LayoutDashboard,
    MessageCircle, Volume2, Award, Gift
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Icon library for the icon picker
const ICON_LIBRARY = [
    { name: "info", icon: Info, label: "Info" },
    { name: "check-circle", icon: CheckCircle2, label: "Check" },
    { name: "alert-triangle", icon: AlertTriangle, label: "Warning" },
    { name: "x-circle", icon: XCircle, label: "Error" },
    { name: "bell", icon: Bell, label: "Bell" },
    { name: "sparkles", icon: Sparkles, label: "Sparkles" },
    { name: "zap", icon: Zap, label: "Zap" },
    { name: "mail", icon: Mail, label: "Mail" },
    { name: "shield", icon: Shield, label: "Shield" },
    { name: "heart", icon: Heart, label: "Heart" },
    { name: "star", icon: Star, label: "Star" },
    { name: "settings", icon: Settings, label: "Settings" },
    { name: "home", icon: Home, label: "Home" },
    { name: "file-text", icon: FileText, label: "File" },
    { name: "image", icon: Image, label: "Image" },
    { name: "code", icon: Code, label: "Code" },
    { name: "database", icon: Database, label: "Database" },
    { name: "cpu", icon: Cpu, label: "CPU" },
    { name: "wifi", icon: Wifi, label: "WiFi" },
    { name: "lock", icon: Lock, label: "Lock" },
    { name: "unlock", icon: Unlock, label: "Unlock" },
    { name: "calendar", icon: Calendar, label: "Calendar" },
    { name: "tag", icon: Tag, label: "Tag" },
    { name: "bookmark", icon: Bookmark, label: "Bookmark" },
    { name: "trending-up", icon: TrendingUp, label: "Trending" },
    { name: "activity", icon: Activity, label: "Activity" },
    { name: "bar-chart", icon: BarChart3, label: "Chart" },
    { name: "layout", icon: LayoutDashboard, label: "Layout" },
    { name: "message", icon: MessageCircle, label: "Message" },
    { name: "volume", icon: Volume2, label: "Volume" },
    { name: "award", icon: Award, label: "Award" },
    { name: "gift", icon: Gift, label: "Gift" },
    { name: "users", icon: Users, label: "Users" },
    { name: "globe", icon: Globe, label: "Globe" },
    { name: "send", icon: Send, label: "Send" },
    { name: "refresh", icon: RefreshCw, label: "Refresh" },
];

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; icon: any }> = {
    info: { label: "Info", color: "text-cyan-500", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", icon: Info },
    success: { label: "Success", color: "text-emerald-500", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/30", icon: CheckCircle2 },
    warning: { label: "Warning", color: "text-amber-500", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", icon: AlertTriangle },
    error: { label: "Critical", color: "text-rose-500", bgColor: "bg-rose-500/10", borderColor: "border-rose-500/30", icon: XCircle },
};

function getIconComponent(iconName: string) {
    const found = ICON_LIBRARY.find(i => i.name === iconName);
    return found?.icon || Info;
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

export default function AdminNotifications() {
    const [activeTab, setActiveTab] = useState("history");
    const [notifications, setNotifications] = useState<any[]>([]);
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [users, setUsers] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [severityFilter, setSeverityFilter] = useState("");
    const { toast } = useToast();

    // Create form state
    const [formData, setFormData] = useState({
        title: "",
        content: "",
        description: "",
        severity: "info",
        icon: "info",
        isGlobal: false,
        isPinned: false,
        allowReplies: true,
        scheduledAt: "",
        expiresAt: "",
        recipients: [] as string[],
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [showIconPicker, setShowIconPicker] = useState(false);
    const [userSearch, setUserSearch] = useState("");
    const contentRef = useRef<HTMLDivElement>(null);

    // Conversation state
    const [selectedConversation, setSelectedConversation] = useState<any>(null);
    const [conversationMessages, setConversationMessages] = useState<any[]>([]);
    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Viewing notification detail
    const [viewingNotification, setViewingNotification] = useState<any>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.set('status', statusFilter);
            if (severityFilter) params.set('severity', severityFilter);
            params.set('limit', '100');

            const res = await fetch(`/api/admin/notifications?${params}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, severityFilter]);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/notifications?status=sent&limit=100');
            if (res.ok) {
                const data = await res.json();
                const withMessages = (data.notifications || []).filter((n: any) => parseInt(n.message_count) > 0);
                setConversations(withMessages);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        fetchUsers();
    }, [fetchNotifications, fetchUsers]);

    useEffect(() => {
        if (activeTab === 'conversations') {
            fetchConversations();
        }
    }, [activeTab, fetchConversations]);

    const resetForm = () => {
        setFormData({
            title: "", content: "", description: "", severity: "info",
            icon: "info", isGlobal: false, isPinned: false,
            allowReplies: true, scheduledAt: "", expiresAt: "", recipients: [],
        });
        setEditingId(null);
        if (contentRef.current) contentRef.current.innerHTML = '';
    };

    const handleSave = async (sendStatus: string) => {
        if (!formData.title.trim()) {
            toast({ title: "Error", description: "Title is required", variant: "destructive" });
            return;
        }

        const htmlContent = contentRef.current?.innerHTML || formData.content;
        if (!htmlContent.trim()) {
            toast({ title: "Error", description: "Content is required", variant: "destructive" });
            return;
        }

        if (!formData.isGlobal && formData.recipients.length === 0 && sendStatus === 'sent') {
            toast({ title: "Error", description: "Select at least one recipient or enable global delivery", variant: "destructive" });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                content: htmlContent,
                status: sendStatus,
                ...(editingId && { id: editingId }),
            };

            const method = editingId ? 'PATCH' : 'POST';
            const res = await fetch('/api/admin/notifications', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast({
                    title: "Success",
                    description: sendStatus === 'sent' ? "Notification sent!" : sendStatus === 'scheduled' ? "Notification scheduled!" : "Draft saved!",
                });
                resetForm();
                fetchNotifications();
                setActiveTab('history');
            } else {
                const data = await res.json();
                toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to save notification", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this notification? This action cannot be undone.')) return;
        try {
            const res = await fetch(`/api/admin/notifications?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast({ title: "Deleted", description: "Notification deleted" });
                fetchNotifications();
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
        }
    };

    const handleEdit = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/notifications/${id}`);
            if (res.ok) {
                const data = await res.json();
                const n = data.notification;
                setFormData({
                    title: n.title,
                    content: n.content,
                    description: n.description || '',
                    severity: n.severity,
                    icon: n.icon,
                    isGlobal: n.is_global,
                    isPinned: n.is_pinned,
                    allowReplies: n.allow_replies,
                    scheduledAt: n.scheduled_at ? new Date(n.scheduled_at).toISOString().slice(0, 16) : '',
                    expiresAt: n.expires_at ? new Date(n.expires_at).toISOString().slice(0, 16) : '',
                    recipients: data.recipients?.map((r: any) => r.user_email) || [],
                });
                setEditingId(id);
                if (contentRef.current) contentRef.current.innerHTML = n.content;
                setActiveTab('create');
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load notification", variant: "destructive" });
        }
    };

    const handleViewDetail = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/notifications/${id}`);
            if (res.ok) {
                const data = await res.json();
                setViewingNotification(data);
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to load notification", variant: "destructive" });
        }
    };

    const openConversation = async (notification: any) => {
        setSelectedConversation(notification);
        try {
            const res = await fetch(`/api/admin/notifications/${notification.id}/messages`);
            if (res.ok) {
                const data = await res.json();
                setConversationMessages(data.messages || []);
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedConversation) return;
        setSendingReply(true);
        try {
            const res = await fetch(`/api/admin/notifications/${selectedConversation.id}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: replyText.trim() }),
            });
            if (res.ok) {
                setReplyText("");
                openConversation(selectedConversation);
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to send reply", variant: "destructive" });
        } finally {
            setSendingReply(false);
        }
    };

    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        contentRef.current?.focus();
    };

    const toggleRecipient = (email: string) => {
        setFormData(prev => ({
            ...prev,
            recipients: prev.recipients.includes(email)
                ? prev.recipients.filter(e => e !== email)
                : [...prev.recipients, email],
        }));
    };

    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase())
    );

    // Analytics data
    const analytics = {
        totalSent: notifications.filter(n => n.status === 'sent').length,
        totalDraft: notifications.filter(n => n.status === 'draft').length,
        totalScheduled: notifications.filter(n => n.status === 'scheduled').length,
        bySeverity: {
            info: notifications.filter(n => n.severity === 'info').length,
            success: notifications.filter(n => n.severity === 'success').length,
            warning: notifications.filter(n => n.severity === 'warning').length,
            error: notifications.filter(n => n.severity === 'error').length,
        },
        totalRecipients: notifications.reduce((sum, n) => sum + parseInt(n.recipient_count || '0'), 0),
        totalRead: notifications.reduce((sum, n) => sum + parseInt(n.read_count || '0'), 0),
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20">
                            <Bell className="w-5 h-5 text-violet-500" />
                        </div>
                        Notification Management
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Create, manage, and track notifications for your users
                    </p>
                </div>
                <Button
                    onClick={() => { resetForm(); setActiveTab('create'); }}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/25 gap-2"
                >
                    <Plus className="w-4 h-4" /> New Notification
                </Button>
            </div>

            {/* Notification Detail Modal */}
            {viewingNotification && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setViewingNotification(null)}>
                    <div className="bg-background rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-auto m-4" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {(() => {
                                        const severity = SEVERITY_CONFIG[viewingNotification.notification?.severity || 'info'];
                                        const IconComp = severity.icon;
                                        return (
                                            <div className={cn("p-2 rounded-xl", severity.bgColor)}>
                                                <IconComp className={cn("w-5 h-5", severity.color)} />
                                            </div>
                                        );
                                    })()}
                                    <div>
                                        <h2 className="text-lg font-semibold">{viewingNotification.notification?.title}</h2>
                                        <p className="text-xs text-muted-foreground">{viewingNotification.notification?.description}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setViewingNotification(null)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none mb-6 p-4 rounded-xl bg-muted/30" dangerouslySetInnerHTML={{ __html: viewingNotification.notification?.content || '' }} />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Status:</span>{' '}
                                    <Badge variant="outline" className="ml-1">{viewingNotification.notification?.status}</Badge>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Created by:</span>{' '}
                                    <span className="font-medium">{viewingNotification.notification?.creator_name || viewingNotification.notification?.created_by}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Recipients:</span>{' '}
                                    <span className="font-medium">{viewingNotification.recipients?.length || 0}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Read:</span>{' '}
                                    <span className="font-medium">{viewingNotification.recipients?.filter((r: any) => r.is_read).length || 0}</span>
                                </div>
                            </div>
                            {viewingNotification.recipients?.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-medium mb-2">Recipients</h3>
                                    <div className="max-h-40 overflow-auto space-y-1">
                                        {viewingNotification.recipients.map((r: any) => (
                                            <div key={r.id} className="flex items-center justify-between text-sm px-3 py-1.5 rounded-lg bg-muted/30">
                                                <span>{r.user_name || r.user_email}</span>
                                                <Badge variant="outline" className={cn("text-xs", r.is_read ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground")}>
                                                    {r.is_read ? "Read" : "Unread"}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/50 border p-1 rounded-xl">
                    <TabsTrigger value="history" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Clock className="w-4 h-4" /> History
                    </TabsTrigger>
                    <TabsTrigger value="create" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Plus className="w-4 h-4" /> {editingId ? "Edit" : "Create"}
                    </TabsTrigger>
                    <TabsTrigger value="conversations" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <MessageSquare className="w-4 h-4" /> Conversations
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <BarChart3 className="w-4 h-4" /> Analytics
                    </TabsTrigger>
                </TabsList>

                {/* ═══ HISTORY TAB ═══ */}
                <TabsContent value="history" className="mt-6 space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-3 items-center">
                        <select
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); }}
                            className="h-9 px-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
                        >
                            <option value="">All Status</option>
                            <option value="sent">Sent</option>
                            <option value="draft">Draft</option>
                            <option value="scheduled">Scheduled</option>
                        </select>
                        <select
                            value={severityFilter}
                            onChange={e => { setSeverityFilter(e.target.value); }}
                            className="h-9 px-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-violet-500/20 outline-none"
                        >
                            <option value="">All Types</option>
                            <option value="info">Info</option>
                            <option value="success">Success</option>
                            <option value="warning">Warning</option>
                            <option value="error">Critical</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={fetchNotifications} className="gap-2 ml-auto">
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="border rounded-xl overflow-hidden bg-background/50 backdrop-blur-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Recipient</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Sent By</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Date</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
                                    ) : notifications.length === 0 ? (
                                        <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                            No notifications yet
                                        </td></tr>
                                    ) : notifications.map((n, i) => {
                                        const severity = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
                                        const SeverityIcon = severity.icon;
                                        return (
                                            <tr key={n.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors" style={{ animationDelay: `${i * 30}ms` }}>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {n.is_pinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                                                        <span className="font-medium truncate max-w-[200px]">{n.title}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={cn("gap-1 text-xs", severity.color, severity.borderColor)}>
                                                        <SeverityIcon className="w-3 h-3" /> {severity.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 hidden md:table-cell">
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        {n.is_global ? <><Globe className="w-3 h-3" /> Global</> :
                                                            <><Users className="w-3 h-3" /> {n.recipient_count || 0} users</>}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{n.creator_name || n.created_by}</td>
                                                <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{formatDate(n.created_at)}</td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className={cn("text-xs",
                                                        n.status === 'sent' ? "text-emerald-500 border-emerald-500/30" :
                                                        n.status === 'scheduled' ? "text-amber-500 border-amber-500/30" :
                                                        "text-muted-foreground"
                                                    )}>
                                                        {n.status === 'sent' ? 'Sent' : n.status === 'scheduled' ? 'Scheduled' : 'Draft'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1 justify-end">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetail(n.id)}>
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                        {n.status === 'draft' && (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(n.id)}>
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(n.id)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{total} notification{total !== 1 ? 's' : ''} total</p>
                </TabsContent>

                {/* ═══ CREATE TAB ═══ */}
                <TabsContent value="create" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Form */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Title */}
                            <div className="p-5 rounded-xl border bg-background/50 backdrop-blur-sm space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-violet-500" /> Content
                                </h3>
                                <Input
                                    placeholder="Notification title..."
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="text-base font-medium h-11"
                                />
                                <Input
                                    placeholder="Short preview text (optional)"
                                    value={formData.description}
                                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="text-sm"
                                />
                                {/* Rich Text Editor */}
                                <div className="border rounded-xl overflow-hidden">
                                    <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30 flex-wrap">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCommand('bold')} title="Bold">
                                            <Bold className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCommand('italic')} title="Italic">
                                            <Italic className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
                                            <List className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                            const url = prompt('Enter link URL:');
                                            if (url) execCommand('createLink', url);
                                        }} title="Insert Link">
                                            <LinkIcon className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                    <div
                                        ref={contentRef}
                                        contentEditable
                                        className="min-h-[160px] p-4 text-sm outline-none focus:ring-2 focus:ring-violet-500/10 prose prose-sm dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none"
                                        data-placeholder="Write your notification content here..."
                                        suppressContentEditableWarning
                                        onInput={() => {
                                            setFormData(prev => ({ ...prev, content: contentRef.current?.innerHTML || '' }));
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Severity & Icon */}
                            <div className="p-5 rounded-xl border bg-background/50 backdrop-blur-sm space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Severity & Icon
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
                                        const SevIcon = config.icon;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setFormData(prev => ({ ...prev, severity: key }))}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm",
                                                    formData.severity === key
                                                        ? cn(config.bgColor, config.borderColor, config.color, "ring-2 ring-offset-1", `ring-${key === 'info' ? 'cyan' : key === 'success' ? 'emerald' : key === 'warning' ? 'amber' : 'rose'}-500/30`)
                                                        : "hover:bg-muted/50 text-muted-foreground"
                                                )}
                                            >
                                                <SevIcon className="w-4 h-4" /> {config.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Icon Picker */}
                                <div>
                                    <Button variant="outline" size="sm" onClick={() => setShowIconPicker(!showIconPicker)} className="gap-2">
                                        {(() => { const IC = getIconComponent(formData.icon); return <IC className="w-4 h-4" />; })()}
                                        Icon: {formData.icon} <ChevronDown className="w-3 h-3" />
                                    </Button>
                                    {showIconPicker && (
                                        <div className="mt-2 p-3 border rounded-xl grid grid-cols-6 sm:grid-cols-8 gap-1 bg-background/80 backdrop-blur-sm max-h-[200px] overflow-y-auto">
                                            {ICON_LIBRARY.map(item => {
                                                const IC = item.icon;
                                                return (
                                                    <button
                                                        key={item.name}
                                                        onClick={() => { setFormData(prev => ({ ...prev, icon: item.name })); setShowIconPicker(false); }}
                                                        className={cn(
                                                            "p-2 rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center",
                                                            formData.icon === item.name && "bg-violet-500/10 ring-1 ring-violet-500/30"
                                                        )}
                                                        title={item.label}
                                                    >
                                                        <IC className="w-4 h-4" />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Settings */}
                        <div className="space-y-6">
                            {/* Target Audience */}
                            <div className="p-5 rounded-xl border bg-background/50 backdrop-blur-sm space-y-4">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Users className="w-4 h-4 text-blue-500" /> Target Audience
                                </h3>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" /> Send to all users</span>
                                    <Switch
                                        checked={formData.isGlobal}
                                        onCheckedChange={v => setFormData(prev => ({ ...prev, isGlobal: v }))}
                                    />
                                </div>
                                {!formData.isGlobal && (
                                    <div className="space-y-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                            <Input
                                                placeholder="Search users..."
                                                value={userSearch}
                                                onChange={e => setUserSearch(e.target.value)}
                                                className="pl-9 h-9"
                                            />
                                        </div>
                                        {formData.recipients.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {formData.recipients.map(email => (
                                                    <Badge key={email} variant="secondary" className="gap-1 text-xs pr-1">
                                                        {email.split('@')[0]}
                                                        <button onClick={() => toggleRecipient(email)} className="ml-0.5 hover:text-destructive">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                        <div className="max-h-[200px] overflow-y-auto space-y-0.5 border rounded-lg p-1">
                                            {filteredUsers.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
                                            ) : filteredUsers.slice(0, 50).map(u => (
                                                <button
                                                    key={u.email}
                                                    onClick={() => toggleRecipient(u.email)}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left transition-colors",
                                                        formData.recipients.includes(u.email) ? "bg-violet-500/10 text-violet-500" : "hover:bg-muted/50"
                                                    )}
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                                        {(u.name || u.email)?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-xs font-medium">{u.name || u.email?.split('@')[0]}</p>
                                                        <p className="truncate text-[10px] text-muted-foreground">{u.email}</p>
                                                    </div>
                                                    {formData.recipients.includes(u.email) && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Options */}
                            <div className="p-5 rounded-xl border bg-background/50 backdrop-blur-sm space-y-3">
                                <h3 className="text-sm font-medium flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-muted-foreground" /> Options
                                </h3>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-sm flex items-center gap-2"><Pin className="w-3.5 h-3.5" /> Pin notification</span>
                                    <Switch checked={formData.isPinned} onCheckedChange={v => setFormData(prev => ({ ...prev, isPinned: v }))} />
                                </div>
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-sm flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5" /> Allow replies</span>
                                    <Switch checked={formData.allowReplies} onCheckedChange={v => setFormData(prev => ({ ...prev, allowReplies: v }))} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Schedule</label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.scheduledAt}
                                        onChange={e => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Expiration</label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.expiresAt}
                                        onChange={e => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => handleSave('sent')}
                                    disabled={saving}
                                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/25 gap-2"
                                >
                                    <Send className="w-4 h-4" /> {saving ? "Sending..." : "Send Now"}
                                </Button>
                                {formData.scheduledAt && (
                                    <Button variant="outline" onClick={() => handleSave('scheduled')} disabled={saving} className="gap-2">
                                        <Clock className="w-4 h-4" /> Schedule
                                    </Button>
                                )}
                                <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="gap-2">
                                    <Save className="w-4 h-4" /> Save Draft
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ═══ CONVERSATIONS TAB ═══ */}
                <TabsContent value="conversations" className="mt-6">
                    {selectedConversation ? (
                        <div className="space-y-4">
                            <Button variant="ghost" onClick={() => { setSelectedConversation(null); setConversationMessages([]); }} className="gap-2 text-sm">
                                <ArrowLeft className="w-4 h-4" /> Back to conversations
                            </Button>
                            {/* Conversation Header */}
                            <div className="p-4 rounded-xl border bg-background/50 flex items-center gap-3">
                                {(() => {
                                    const sev = SEVERITY_CONFIG[selectedConversation.severity || 'info'];
                                    const SevIcon = sev.icon;
                                    return <div className={cn("p-2 rounded-xl", sev.bgColor)}><SevIcon className={cn("w-4 h-4", sev.color)} /></div>;
                                })()}
                                <div>
                                    <h3 className="font-medium">{selectedConversation.title}</h3>
                                    <p className="text-xs text-muted-foreground">Created by {selectedConversation.creator_name || selectedConversation.created_by}</p>
                                </div>
                            </div>
                            {/* Messages */}
                            <div className="border rounded-xl bg-muted/10 backdrop-blur-sm overflow-hidden">
                                <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
                                    {conversationMessages.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
                                    ) : conversationMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={cn(
                                                "max-w-[80%] p-3 rounded-2xl text-sm animate-in slide-in-from-bottom-2 duration-300",
                                                msg.sender_role === 'admin'
                                                    ? "ml-auto bg-gradient-to-r from-violet-500/15 to-fuchsia-500/15 border border-violet-500/20 rounded-br-md"
                                                    : "bg-muted/50 border rounded-bl-md"
                                            )}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-medium">{msg.sender_name || msg.sender_email?.split('@')[0]}</span>
                                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                                    {msg.sender_role === 'admin' ? 'Admin' : 'User'}
                                                </Badge>
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
                                        placeholder="Type your reply..."
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
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden bg-background/50">
                            {conversations.length === 0 ? (
                                <div className="text-center py-16 text-muted-foreground">
                                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-medium">No conversations yet</p>
                                    <p className="text-xs mt-1">Conversations will appear when users reply to notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {conversations.map((c) => {
                                        const sev = SEVERITY_CONFIG[c.severity || 'info'];
                                        const SevIcon = sev.icon;
                                        const unread = parseInt(c.unread_user_messages || '0');
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => openConversation(c)}
                                                className="w-full flex items-center gap-3 p-4 hover:bg-muted/20 transition-colors text-left"
                                            >
                                                <div className={cn("p-2 rounded-xl flex-shrink-0", sev.bgColor)}>
                                                    <SevIcon className={cn("w-4 h-4", sev.color)} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm truncate">{c.title}</span>
                                                        {unread > 0 && (
                                                            <Badge className="bg-violet-500 text-white text-[10px] px-1.5 py-0 h-4">{unread}</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.last_message}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-[10px] text-muted-foreground">{c.last_message_at ? formatDate(c.last_message_at) : ''}</p>
                                                    <p className="text-[10px] text-muted-foreground">{c.message_count} messages</p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* ═══ ANALYTICS TAB ═══ */}
                <TabsContent value="analytics" className="mt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: "Total Sent", value: analytics.totalSent, icon: Send, color: "text-violet-500", bg: "bg-violet-500/10" },
                            { label: "Drafts", value: analytics.totalDraft, icon: FileText, color: "text-slate-500", bg: "bg-slate-500/10" },
                            { label: "Total Recipients", value: analytics.totalRecipients, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
                            { label: "Read", value: analytics.totalRead, icon: Eye, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                        ].map((stat) => {
                            const StatIcon = stat.icon;
                            return (
                                <div key={stat.label} className="p-5 rounded-xl border bg-background/50 backdrop-blur-sm">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("p-2.5 rounded-xl", stat.bg)}>
                                            <StatIcon className={cn("w-5 h-5", stat.color)} />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{stat.value}</p>
                                            <p className="text-xs text-muted-foreground">{stat.label}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Severity Breakdown */}
                    <div className="p-5 rounded-xl border bg-background/50 backdrop-blur-sm">
                        <h3 className="text-sm font-medium mb-4">Notifications by Type</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(SEVERITY_CONFIG).map(([key, config]) => {
                                const SevIcon = config.icon;
                                const count = analytics.bySeverity[key as keyof typeof analytics.bySeverity] || 0;
                                return (
                                    <div key={key} className={cn("p-4 rounded-xl border text-center", config.bgColor, config.borderColor)}>
                                        <SevIcon className={cn("w-6 h-6 mx-auto mb-2", config.color)} />
                                        <p className="text-2xl font-bold">{count}</p>
                                        <p className={cn("text-xs", config.color)}>{config.label}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Read Rate */}
                    {analytics.totalRecipients > 0 && (
                        <div className="p-5 rounded-xl border bg-background/50 backdrop-blur-sm mt-4">
                            <h3 className="text-sm font-medium mb-3">Read Rate</h3>
                            <div className="flex items-center gap-4">
                                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.round((analytics.totalRead / analytics.totalRecipients) * 100)}%` }}
                                    />
                                </div>
                                <span className="text-sm font-medium">
                                    {Math.round((analytics.totalRead / analytics.totalRecipients) * 100)}%
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                {analytics.totalRead} of {analytics.totalRecipients} recipients have read their notifications
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
