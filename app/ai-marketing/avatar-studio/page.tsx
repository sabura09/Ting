"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { 
    UserCircle, 
    Sparkles, 
    Upload, 
    Loader2, 
    Trash2, 
    History,
    Check,
    Plus,
    X,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AssetViewer } from "@/components/marketing/AssetViewer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export default function AvatarStudioPage() {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();
    const [name, setName] = useState("");
    const [prompt, setPrompt] = useState("");
    const [referenceImage, setReferenceImage] = useState<string | null>(null);
    const [avatars, setAvatars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [refUploading, setRefUploading] = useState(false);
    const [taskId, setTaskId] = useState<string | null>(null);
    const [avatarToDelete, setAvatarToDelete] = useState<any>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, router]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchAvatars();
        }
    }, [isAuthenticated]);

    useEffect(() => {
        let interval: any;
        if (taskId && generating) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/marketing?action=poll&taskId=${taskId}&type=image`);
                    const status = await res.json();
                    if (status.state === 'success') {
                        setGenerating(false);
                        setTaskId(null);
                        toast.success("Avatar generated successfully!");
                        fetchAvatars();
                    } else if (status.state === 'failed') {
                        setGenerating(false);
                        setTaskId(null);
                        if (status.error?.toLowerCase().includes('credits insufficient') && window.location.href.includes('mounikai')) {
                            toast.error("In the demo, this feature is disabled");
                            fetch('/api/notifications/credits-exhausted', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ domain: window.location.href })
                            }).catch(console.error);
                        } else {
                            toast.error(status.error || "Generation failed");
                        }
                    }
                } catch (error) {
                    console.error("Polling error:", error);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [taskId, generating]);

    if (authLoading || !isAuthenticated) {
        return null;
    }

    const fetchAvatars = async () => {
        try {
            const res = await fetch('/api/marketing?action=list-avatars');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAvatars(data);
            } else {
                console.error("API returned non-array data:", data);
                setAvatars([]);
            }
        } catch (error) {
            console.error("Failed to load avatars", error);
            setAvatars([]);
            toast.error("Failed to load avatars");
        } finally {
            setLoading(false);
        }
    };

    const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setRefUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                const uploadRes = await fetch('/api/marketing', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'upload',
                        base64: base64, // Full base64 string including prefix
                        fileName: file.name
                    })
                });
                const uploadData = await uploadRes.json();
                if (uploadData.success) {
                    setReferenceImage(uploadData.url);
                    toast.success("Reference photo uploaded!");
                } else {
                    toast.error(uploadData.error || "Upload failed");
                }
            } catch (error) {
                toast.error("Upload failed");
            } finally {
                setRefUploading(false);
                if (e.target) e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            try {
                // Upload to Kie.ai
                const uploadRes = await fetch('/api/marketing', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'upload',
                        base64: base64, // Full base64 string including prefix
                        fileName: file.name
                    })
                });
                const uploadData = await uploadRes.json();
                
                if (uploadData.success) {
                    // Save as avatar
                    const saveRes = await fetch('/api/marketing', {
                        method: 'POST',
                        body: JSON.stringify({
                            action: 'save-avatar',
                            imageUrl: uploadData.url,
                            name: file.name.split('.')[0]
                        })
                    });
                    const saveData = await saveRes.json();
                    
                    if (saveData.success) {
                        toast.success("Avatar uploaded and ready!");
                        fetchAvatars();
                    } else {
                        toast.error(saveData.error || "Failed to save avatar");
                    }
                } else {
                    toast.error(uploadData.error || "Upload failed");
                }
            } catch (error) {
                toast.error("Upload failed");
            } finally {
                setUploading(false);
                if (e.target) e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async () => {
        if (!name.trim()) {
            toast.error("Please enter a name for your avatar");
            return;
        }
        if (!prompt.trim()) {
            toast.error("Please describe your avatar");
            return;
        }

        setGenerating(true);
        try {
            const res = await fetch('/api/marketing', {
                method: 'POST',
                body: JSON.stringify({
                    action: 'generate-image',
                    name: name,
                    isAvatar: true,
                    prompt: `Portrait avatar of ${prompt}. Studio lighting, clean background, headshot style.`,
                    referenceImageUrl: referenceImage,
                    options: { size: '1:1', isEnhance: true }
                })
            });

            const data = await res.json();
            if (data.success) {
                setTaskId(data.taskId);
                toast.info("Avatar generation started...");
            } else {
                setGenerating(false);
                if (data.error?.toLowerCase().includes('credits insufficient') && window.location.href.includes('mounikai')) {
                    toast.error("In the demo, this feature is disabled");
                    fetch('/api/notifications/credits-exhausted', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ domain: window.location.href })
                    }).catch(console.error);
                } else {
                    toast.error(data.error || "Generation failed");
                }
            }
        } catch (error) {
            toast.error("Generation failed");
            setGenerating(false);
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                            <UserCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight outfit">Avatar Studio</h1>
                            <p className="text-muted-foreground">Create and manage your AI-powered brand ambassadors.</p>
                        </div>
                    </div>
                    <div className="relative">
                        <Button 
                            variant="outline" 
                            className="gap-2 rounded-xl h-12" 
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            Upload Custom Avatar
                        </Button>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleUpload} 
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Create New Card */}
                    <Card className="lg:col-span-1">
                        <CardContent className="p-6 space-y-6">
                            <h2 className="text-xl font-bold outfit flex items-center gap-2">
                                <Plus className="w-5 h-5 text-primary" />
                                Create New Avatar
                            </h2>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Avatar Name</label>
                                    <Input 
                                        placeholder="e.g. Sarah - Marketing Manager" 
                                        className="rounded-xl"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Avatar Description</label>
                                    <Textarea 
                                        placeholder="Describe the avatar's appearance, style, and personality..." 
                                        className="rounded-xl min-h-[100px] resize-none"
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Reference Photo (Optional)</label>
                                    <div className="relative group">
                                        {referenceImage ? (
                                            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-primary/20">
                                                <img src={referenceImage} alt="Reference" className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => setReferenceImage(null)}
                                                    className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    {refUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
                                                    <span className="text-xs font-medium">Upload headshot to match face</span>
                                                </div>
                                                <input type="file" className="hidden" accept="image/*" onChange={handleReferenceUpload} />
                                            </label>
                                        )}
                                    </div>
                                </div>
                                <Button 
                                    className="w-full btn-premium h-12 gap-2" 
                                    disabled={generating}
                                    onClick={handleGenerate}
                                >
                                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    {generating ? <span>Generating...</span> : <span>Generate Avatar</span>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gallery Card */}
                    <Card className="premium-card lg:col-span-2">
                        <CardContent className="p-6 space-y-6">
                            <h2 className="text-xl font-bold outfit flex items-center gap-2">
                                <History className="w-5 h-5 text-primary" />
                                My Avatars
                            </h2>

                            {loading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="aspect-square rounded-full skeleton" />
                                    ))}
                                </div>
                            ) : avatars.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                        <UserCircle className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">No avatars created yet. Use the tool on the left to start.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                    {avatars?.map((avatar: any) => (
                                        <motion.div 
                                            key={avatar.id}
                                            layout
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="group relative"
                                        >
                                            <div 
                                                className="aspect-square rounded-full overflow-hidden border-4 border-muted group-hover:border-primary/50 transition-all shadow-lg cursor-pointer"
                                                onClick={() => {
                                                    setViewerIndex(avatars.indexOf(avatar));
                                                    setViewerOpen(true);
                                                }}
                                            >
                                                <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-cover" />
                                                 {avatar.type !== 'system' && (
                                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                                         <Button 
                                                            size="icon" 
                                                            variant="secondary" 
                                                            className="rounded-full w-8 h-8 bg-primary text-white"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setViewerIndex(avatars.indexOf(avatar));
                                                                setViewerOpen(true);
                                                            }}
                                                         >
                                                             <Eye className="w-4 h-4" />
                                                         </Button>
                                                         <Button 
                                                            size="icon" 
                                                            variant="destructive" 
                                                            className="rounded-full w-8 h-8"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAvatarToDelete(avatar);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                         >
                                                             <Trash2 className="w-4 h-4" />
                                                         </Button>
                                                     </div>
                                                 )}
                                            </div>
                                            <div className="mt-3 text-center">
                                                <p className="font-bold text-sm truncate">{avatar.name}</p>
                                                <p className="text-[10px] text-muted-foreground capitalize">{avatar.type}</p>
                                            </div>
                                            <div className="absolute top-0 right-0">
                                                <span className="badge-premium p-1 rounded-full">
                                                    <Check className="w-3 h-3" />
                                                </span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AssetViewer 
                open={viewerOpen} 
                close={() => setViewerOpen(false)} 
                assets={avatars.map(a => ({ ...a, url: a.image_url, type: 'image' }))} 
                currentIndex={viewerIndex} 
            />

            <ConfirmDialog 
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={async () => {
                    if (!avatarToDelete) return;
                    setDeleting(true);
                    try {
                        const res = await fetch('/api/marketing', {
                            method: 'POST',
                            body: JSON.stringify({ action: 'delete-avatar', id: avatarToDelete.id })
                        });
                        const data = await res.json();
                        if (data.success) {
                            toast.success('Avatar deleted');
                            fetchAvatars();
                        } else {
                            toast.error(data.error || 'Failed to delete avatar');
                        }
                    } catch (err) {
                        toast.error('Failed to delete avatar');
                    } finally {
                        setDeleting(false);
                        setDeleteDialogOpen(false);
                        setAvatarToDelete(null);
                    }
                }}
                title="Delete Avatar"
                description="Are you sure you want to delete this avatar? This action cannot be undone."
                confirmText="Delete"
                isDestructive={true}
                isLoading={deleting}
            />
        </Layout>
    );
}
