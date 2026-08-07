"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, User, Bot, X, MessageSquare, Loader2, Paperclip } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { toast } from "sonner";
import { MarkdownRenderer } from '@/components/MarkdownRenderer';


interface Message {
    role: 'user' | 'assistant';
    content: string;
    image?: string;
}

export default function ChatWidget({ embedded = false, supportEmail }: { embedded?: boolean; supportEmail?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: `Hello! I'm your Live Support Assistant. ${supportEmail ? `(Support Mode: ${supportEmail})` : ''} How can I help you today based on our documents?` }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { settings } = useSettings();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("Please upload an image smaller than 5MB.");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (isMountedRef.current) {
                    setSelectedImage(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        }
        e.target.value = '';
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if ((!input.trim() && !selectedImage) || isLoading) return;

        const userMsg = input.trim();
        const currentImage = selectedImage;
        setInput('');
        setSelectedImage(null);

        setMessages(prev => [...prev, { role: 'user', content: userMsg, image: currentImage || undefined }]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat/rag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: userMsg, supportEmail, image: currentImage || undefined })
            });

            const data = await response.json();

            if (!isMountedRef.current) return;

            if (data.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
            }
        } catch (error) {
            if (isMountedRef.current) {
                setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble connecting to the support server." }]);
            }
        } finally {
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    if (!isOpen && !embedded) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 rounded-full shadow-2xl bg-teal-600 hover:bg-teal-700 transition-all duration-300"
            >
                <MessageSquare className="h-6 w-6 text-white" />
            </Button>
        );
    }

    return (
        <div className={cn(
            "flex flex-col bg-background/95 backdrop-blur-md border border-border shadow-2xl transition-all duration-300 overflow-hidden",
            embedded ? "w-full h-full" : "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[calc(100dvh-6rem)] sm:h-[600px] max-h-[85vh] sm:max-h-[600px] rounded-2xl z-50"
        )}>
            {/* Header */}
            <div className="p-4 border-b bg-teal-600 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Live Support</h3>
                        <p className="text-[10px] opacity-80">Powered by {settings?.metadata?.siteName || "AI Suite"}</p>

                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                    if (embedded) {
                        window.parent.postMessage('close-chat-widget', '*');
                    } else {
                        setIsOpen(false);
                    }
                }} className="text-white hover:bg-white/10">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.map((m, i) => (
                        <div key={i} className={cn(
                            "flex items-start gap-2",
                            m.role === 'user' ? "flex-row-reverse" : ""
                        )}>
                            <div className={cn(
                                "p-2 rounded-lg text-sm max-w-[80%]",
                                m.role === 'user'
                                    ? "bg-teal-600 text-white rounded-tr-none"
                                    : "bg-muted rounded-tl-none border border-border"
                            )}>
                                {m.image && (
                                    <div className="mb-2 rounded overflow-hidden max-h-40 bg-black/5 dark:bg-white/5">
                                        <img
                                            src={m.image}
                                            alt="Shared image"
                                            className="max-w-full h-auto max-h-40 object-contain rounded"
                                        />
                                    </div>
                                )}
                                {m.role === 'user' ? (
                                    <div className="whitespace-pre-wrap">{m.content}</div>
                                ) : (
                                    <MarkdownRenderer content={m.content} className="prose-teal dark:prose-invert" />
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-muted-foreground text-xs italic">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Assistant is thinking...
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t bg-muted/30">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex flex-col gap-2"
                >
                    {selectedImage && (
                        <div className="relative w-14 h-14 mb-1 group self-start">
                            <img
                                src={selectedImage}
                                alt="Preview"
                                className="w-full h-full object-cover rounded-lg border border-teal-500/30 shadow-md"
                            />
                            <button
                                type="button"
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full shadow hover:bg-rose-600 transition-colors"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2 items-center">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            accept="image/*"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            className="h-10 w-10 text-muted-foreground hover:text-teal-600 hover:bg-teal-500/5 shrink-0 rounded-full"
                            disabled={isLoading}
                        >
                            <Paperclip className="h-4.5 w-4.5" />
                        </Button>
                        <Input
                            placeholder="Type your message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="bg-background border-border flex-1"
                        />
                        <Button 
                            type="submit" 
                            size="icon" 
                            disabled={isLoading || (!input.trim() && !selectedImage)} 
                            className="bg-teal-600 hover:bg-teal-700 shrink-0"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
