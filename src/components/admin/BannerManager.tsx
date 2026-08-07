"use client";

import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Plus,
    Trash2,
    Edit2,
    Calendar as CalendarIcon,
    Palette,
    Eye,
    Save,
    X,
    ChevronUp,
    ChevronDown,
    ExternalLink,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Banner {
    id: string;
    message: string;
    start_date: string;
    end_date: string;
    bg_gradient: string;
    text_color: string;
    is_enabled: boolean;
    is_dismissible: boolean;
    button_text: string;
    button_link: string;
    priority: number;
    created_at: string;
}

export default function BannerManager() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Partial<Banner> | null>(null);
    const { toast } = useToast();

    // Form states
    const [message, setMessage] = useState("");
    const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    const [endDate, setEndDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
    const [startColor, setStartColor] = useState("#4f46e5");
    const [endColor, setEndColor] = useState("#9333ea");
    const [textColor, setTextColor] = useState("#ffffff");
    const [isEnabled, setIsEnabled] = useState(true);
    const [isDismissible, setIsDismissible] = useState(true);
    const [buttonText, setButtonText] = useState("");
    const [buttonLink, setButtonLink] = useState("");
    const [priority, setPriority] = useState(0);

    useEffect(() => {
        fetchBanners();
    }, []);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/banners");
            if (!res.ok) throw new Error("Failed to fetch banners");
            const data = await res.json();
            setBanners(data);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Could not load banners",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setMessage("");
        setStartDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setEndDate(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
        setStartColor("#4f46e5");
        setEndColor("#9333ea");
        setTextColor("#ffffff");
        setIsEnabled(true);
        setIsDismissible(true);
        setButtonText("");
        setButtonLink("");
        setPriority(0);
        setEditingBanner(null);
    };

    const handleEdit = (banner: Banner) => {
        setEditingBanner(banner);
        setMessage(banner.message);
        setStartDate(format(new Date(banner.start_date), "yyyy-MM-dd'T'HH:mm"));
        setEndDate(format(new Date(banner.end_date), "yyyy-MM-dd'T'HH:mm"));
        
        // Parse gradient if possible, or set defaults
        const gradientMatch = banner.bg_gradient.match(/linear-gradient\(to right, (#[^,]+), (#[^)]+)\)/);
        if (gradientMatch) {
            setStartColor(gradientMatch[1]);
            setEndColor(gradientMatch[2]);
        }
        
        setTextColor(banner.text_color);
        setIsEnabled(banner.is_enabled);
        setIsDismissible(banner.is_dismissible);
        setButtonText(banner.button_text || "");
        setButtonLink(banner.button_link || "");
        setPriority(banner.priority);
        setIsDialogOpen(true);
    };

    const handleSave = async () => {
        if (!message || !startDate || !endDate) {
            toast({
                title: "Missing fields",
                description: "Please fill in message, start date, and end date.",
                variant: "destructive",
            });
            return;
        }

        setSaving(true);
        const bg_gradient = `linear-gradient(to right, ${startColor}, ${endColor})`;
        
        const payload = {
            id: editingBanner?.id,
            message,
            start_date: new Date(startDate).toISOString(),
            end_date: new Date(endDate).toISOString(),
            bg_gradient,
            text_color: textColor,
            is_enabled: isEnabled,
            is_dismissible: isDismissible,
            button_text: buttonText,
            button_link: buttonLink,
            priority,
        };

        try {
            const method = editingBanner ? "PATCH" : "POST";
            const res = await fetch("/api/admin/banners", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to save banner");

            toast({
                title: editingBanner ? "Banner Updated" : "Banner Created",
                description: "Your changes have been saved successfully.",
            });

            setIsDialogOpen(false);
            resetForm();
            fetchBanners();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to save banner",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this banner?")) return;

        try {
            const res = await fetch(`/api/admin/banners?id=${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete banner");

            toast({
                title: "Banner Deleted",
                description: "The banner has been removed.",
            });
            fetchBanners();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to delete banner",
                variant: "destructive",
            });
        }
    };

    const toggleStatus = async (banner: Banner) => {
        try {
            const res = await fetch("/api/admin/banners", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: banner.id, is_enabled: !banner.is_enabled }),
            });

            if (!res.ok) throw new Error("Failed to toggle status");
            fetchBanners();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to toggle status",
                variant: "destructive",
            });
        }
    };

    const BannerPreview = () => (
        <div className="mt-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-xs uppercase text-muted-foreground mb-2 block">Live Preview</Label>
            <div 
                className="w-full min-h-[50px] flex items-center justify-between px-6 py-3 rounded-md shadow-sm overflow-hidden relative"
                style={{ 
                    background: `linear-gradient(to right, ${startColor}, ${endColor})`,
                    color: textColor
                }}
            >
                <div className="flex-1 text-center font-medium" dangerouslySetInnerHTML={{ __html: message || "Banner message will appear here..." }} />
                
                {buttonText && (
                    <div 
                        className="ml-4 px-3 py-1 rounded bg-white/20 hover:bg-white/30 transition-colors text-sm font-semibold cursor-pointer border border-white/20 whitespace-nowrap"
                    >
                        {buttonText}
                    </div>
                )}

                {isDismissible && (
                    <div className="ml-4 opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
                        <X size={18} />
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Announcement Banners</h1>
                    <p className="text-muted-foreground">Manage top-site notifications and alerts.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="rounded-full shadow-lg shadow-primary/20">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Banner
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{editingBanner ? "Edit Banner" : "New Announcement"}</DialogTitle>
                            <DialogDescription>
                                Create a top-site banner with custom colors and timing.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-6 py-4">
                            <RichTextEditor
                                label="Banner Message"
                                value={message}
                                onChange={setMessage}
                                placeholder="Type your announcement here..."
                                minHeight="100px"
                            />

                            <BannerPreview />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start Date & Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End Date & Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label>Background Gradient</Label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex flex-col gap-1">
                                            <span className="text-[10px] text-muted-foreground">Start</span>
                                            <div className="flex gap-1">
                                                <Input type="color" value={startColor} onChange={(e) => setStartColor(e.target.value)} className="w-8 h-8 p-0 border-none bg-transparent" />
                                                <Input value={startColor} onChange={(e) => setStartColor(e.target.value)} className="h-8 text-xs font-mono" />
                                            </div>
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1">
                                            <span className="text-[10px] text-muted-foreground">End</span>
                                            <div className="flex gap-1">
                                                <Input type="color" value={endColor} onChange={(e) => setEndColor(e.target.value)} className="w-8 h-8 p-0 border-none bg-transparent" />
                                                <Input value={endColor} onChange={(e) => setEndColor(e.target.value)} className="h-8 text-xs font-mono" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Text Color</Label>
                                    <div className="flex gap-2 items-end">
                                        <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 p-0 border-none bg-transparent" />
                                        <Input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-8 text-xs font-mono" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="priority">Priority (Higher First)</Label>
                                    <Input
                                        id="priority"
                                        type="number"
                                        value={priority}
                                        onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="btn-text">Button Text (Optional)</Label>
                                    <Input id="btn-text" value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="e.g. Learn More" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="btn-link">Button Link (URL)</Label>
                                    <Input id="btn-link" value={buttonLink} onChange={(e) => setButtonLink(e.target.value)} placeholder="https://..." />
                                </div>
                            </div>

                            <div className="flex gap-8">
                                <div className="flex items-center space-x-2">
                                    <Switch id="enabled" checked={isEnabled} onCheckedChange={setIsEnabled} />
                                    <Label htmlFor="enabled">Enabled</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="dismissible" checked={isDismissible} onCheckedChange={setIsDismissible} />
                                    <Label htmlFor="dismissible">Dismissible</Label>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                {editingBanner ? "Update Banner" : "Create Banner"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Separator />

            {loading ? (
                <div className="flex h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : banners.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 bg-muted rounded-full mb-4">
                            <Palette className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-semibold">No banners found</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Create your first announcement banner to keep your users informed.
                        </p>
                        <Button variant="outline" className="mt-6" onClick={() => setIsDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Add Banner
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {banners.map((banner) => {
                        const isExpired = new Date(banner.end_date) < new Date();
                        const isUpcoming = new Date(banner.start_date) > new Date();
                        const isActive = banner.is_enabled && !isExpired && !isUpcoming;

                        return (
                            <Card key={banner.id} className={`transition-all ${!banner.is_enabled ? 'opacity-60 bg-muted/30' : ''}`}>
                                <div className="p-4 flex flex-col md:flex-row gap-4 items-start md:items-center">
                                    <div 
                                        className="w-12 h-12 rounded-lg flex-shrink-0"
                                        style={{ background: banner.bg_gradient }}
                                    />
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold truncate max-w-[400px]" dangerouslySetInnerHTML={{ __html: banner.message }} />
                                            <Badge variant={isActive ? "default" : "secondary"} className="h-5 text-[10px] uppercase">
                                                {isActive ? "Active" : isExpired ? "Expired" : isUpcoming ? "Upcoming" : "Disabled"}
                                            </Badge>
                                            {banner.priority > 0 && (
                                                <Badge variant="outline" className="h-5 text-[10px] text-blue-500 border-blue-200">
                                                    P{banner.priority}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            <span className="flex items-center"><CalendarIcon className="w-3 h-3 mr-1" /> {format(new Date(banner.start_date), "MMM d, HH:mm")} — {format(new Date(banner.end_date), "MMM d, HH:mm")}</span>
                                            {banner.button_text && <span className="flex items-center"><ExternalLink className="w-3 h-3 mr-1" /> {banner.button_text}</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-auto">
                                        <div className="flex items-center space-x-2 mr-4">
                                            <Switch 
                                                checked={banner.is_enabled} 
                                                onCheckedChange={() => toggleStatus(banner)}
                                            />
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(banner)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(banner.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
