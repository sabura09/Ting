"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { User, Check, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Avatar {
    id: string;
    name: string;
    image_url: string;
    type: string;
}

interface AvatarPickerProps {
    selectedId?: string;
    onSelect: (avatar: Avatar) => void;
}

export function AvatarPicker({ selectedId, onSelect }: AvatarPickerProps) {
    const [avatars, setAvatars] = useState<Avatar[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAvatars();
    }, []);

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

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Select AI Avatar
                </h3>
                <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" asChild>
                    <Link href="/ai-marketing/avatar-studio">
                        <Plus className="w-3 h-3" />
                        New Avatar
                    </Link>
                </Button>
            </div>

            <ScrollArea className="w-full whitespace-nowrap rounded-xl border bg-muted/30">
                <div className="flex gap-4 p-4 w-max min-w-full">
                    {loading ? (
                        <div className="flex items-center gap-2 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs text-muted-foreground">Loading avatars...</span>
                        </div>
                    ) : (!avatars || avatars.length === 0) ? (
                        <div className="py-2 text-xs text-muted-foreground">
                            No avatars found. Create one in the Avatar Studio.
                        </div>
                    ) : (
                        avatars.map((avatar) => (
                            <motion.button
                                key={avatar.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelect(avatar)}
                                className="relative flex-shrink-0 w-24 group flex flex-col items-center bg-transparent hover:bg-transparent border-none p-0 outline-none focus:ring-0"
                            >
                                <div className={`p-2 rounded-full transition-all group-hover:bg-primary/10 ${
                                    selectedId === avatar.id ? 'bg-primary/15 shadow-sm' : ''
                                }`}>
                                    <div className={`w-16 h-16 rounded-full overflow-hidden border-2 transition-all ${
                                        selectedId === avatar.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                                    }`}>
                                        <img
                                            src={avatar.image_url}
                                            alt={avatar.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity flex items-center justify-center">
                                            <Check className={`w-6 h-6 text-white ${selectedId === avatar.id ? 'opacity-100' : 'opacity-0'}`} />
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-[10px] text-center truncate font-medium text-muted-foreground w-full px-1">
                                    {avatar.name}
                                </p>
                                {selectedId === avatar.id && (
                                    <motion.div
                                        layoutId="avatar-check"
                                        className="absolute top-1 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg z-10"
                                    >
                                        <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                )}
                            </motion.button>
                        ))
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
