"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    BookMarked, 
    Globe, 
    Wand2, 
    Copy, 
    Download, 
    FileText, 
    FileType, 
    Loader2, 
    Eye, 
    Edit3, 
    ArrowRight,
    Sparkles,
    Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useAuth } from "@/contexts/AuthContext";
import { 
    exportToMarkdown, 
    exportToPDF, 
    exportToDocx 
} from "@/lib/wiki-exporter";

export default function WebsiteWikiPage() {
    const [url, setUrl] = useState("");
    const [markdown, setMarkdown] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [title, setTitle] = useState("");
    const { toast } = useToast();
    const { selectedModel, isManualModel } = useAuth();

    const handleExtract = async () => {
        if (!url.trim()) {
            toast({
                title: "Invalid URL",
                description: "Please enter a valid website address.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        setMarkdown("");
        
        try {
            // STEP 1: Scrape raw content
            const scrapeRes = await fetch('/api/website-wiki/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (!scrapeRes.ok) {
                const errData = await scrapeRes.json().catch(() => ({}));
                throw new Error(errData.error || 'Scraping failed');
            }

            const { rawMarkdown } = await scrapeRes.json();

            // STEP 2: Stream AI refinement using core infrastructure
            const systemPrompt = `You are a Website Wiki expert. Your task is to transform raw markdown extracted from a website into a clean, well-structured, professional Wiki-style document.
            
            Guidelines:
            - Keep only the main instructional, informational, or descriptive content.
            - Remove boilerplate, ads, cookie notices, and social media links.
            - Organize with clear H1, H2, and H3 headers.
            - Use bullet points and lists where appropriate.
            - Ensure technical details are accurately preserved.
            - If the content is too messy, re-organize it logically.`;

            const aiRes = await fetch('/api/ai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `RAW CONTENT:\n${rawMarkdown}`,
                    systemPrompt,
                    model: selectedModel,
                    isManual: isManualModel,
                    tool: 'website-wiki'
                })
            });

            if (!aiRes.ok) {
                const errData = await aiRes.json().catch(() => ({}));
                throw new Error(errData.error || 'AI Refinement failed');
            }

            if (!aiRes.body) throw new Error('Streaming not supported');

            const reader = aiRes.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') break;

                        try {
                            const data = JSON.parse(dataStr);
                            if (data.text) {
                                setMarkdown(prev => prev + data.text);
                            }
                            if (data.error) throw new Error(data.error);
                        } catch (e) {
                            // Partial chunk
                        }
                    }
                }
            }

            setTitle(url);
            toast({
                title: "Wiki Generated!",
                description: "The website has been successfully converted into a Wiki using " + selectedModel,
            });
        } catch (error: any) {
            toast({
                title: "Process Error",
                description: error.message || "Failed to generate Wiki.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTest = () => {
        setUrl("https://en.wikipedia.org/wiki/Artificial_intelligence");
    };

    const clearAll = () => {
        setMarkdown("");
        setUrl("");
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(markdown);
        toast({
            title: "Copied!",
            description: "Markdown content copied to clipboard.",
        });
    };

    return (
        <div className="flex flex-col gap-6 p-4 max-w-7xl mx-auto min-h-full">
            {/* Header Section */}
            <header className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                        <BookMarked className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Website Wiki</h1>
                        <p className="text-muted-foreground">Transform any website into a structured, editable Wiki document.</p>
                    </div>
                </div>
            </header>

            {/* Input Section */}
            <Card className="border-primary/20 bg-card/50 backdrop-blur-sm overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input 
                                placeholder="Enter website URL (e.g., https://example.com/article)" 
                                className="pl-10 h-12 bg-background/50 border-primary/10 focus:border-primary/30 transition-all font-medium"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                onClick={handleTest}
                                className="h-12 border-primary/10 hover:bg-primary/5 transition-colors"
                                disabled={isLoading}
                            >
                                Test URL
                            </Button>
                            <Button 
                                onClick={handleExtract}
                                disabled={isLoading}
                                className="h-12 px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5" />
                                        <span>Generate Wiki</span>
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <AnimatePresence mode="wait">
                {markdown ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex-1 flex flex-col gap-6"
                    >
                        {/* Actions Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="secondary" size="sm" onClick={copyToClipboard} className="gap-2">
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </Button>
                                <Button variant="ghost" size="sm" onClick={clearAll} className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2">
                                    <Trash2 className="w-4 h-4" />
                                    Clear
                                </Button>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mr-2">Export As</span>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToMarkdown(markdown)}>
                                    <FileType className="w-4 h-4" />
                                    MD
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToPDF(markdown)}>
                                    <FileText className="w-4 h-4" />
                                    PDF
                                </Button>
                                <Button variant="outline" size="sm" className="gap-2" onClick={() => exportToDocx(markdown)}>
                                    <FileType className="w-4 h-4" />
                                    DOCX
                                </Button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 min-h-[500px] flex flex-col gap-0 border rounded-2xl overflow-hidden bg-card/30 backdrop-blur-md">
                            <Tabs defaultValue="preview" className="flex-1 flex flex-col">
                                <div className="border-b bg-muted/30 px-4 h-14 flex items-center justify-between">
                                    <TabsList className="bg-transparent gap-4">
                                        <TabsTrigger 
                                            value="preview" 
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-14 px-4 gap-2"
                                        >
                                            <Eye className="w-4 h-4" />
                                            Preview
                                        </TabsTrigger>
                                        <TabsTrigger 
                                            value="edit" 
                                            className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary border-b-2 border-transparent data-[state=active]:border-primary rounded-none h-14 px-4 gap-2"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                            Editor
                                        </TabsTrigger>
                                    </TabsList>
                                    
                                    <div className="flex items-center gap-2 text-primary/60">
                                        <Sparkles className="w-4 h-4" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Enhanced by AI</span>
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <TabsContent value="preview" className="flex-1 m-0 p-8 overflow-auto data-[state=active]:flex data-[state=active]:flex-col">
                                        <div className="prose prose-sm dark:prose-invert max-w-none flex-1">
                                            <MarkdownRenderer content={markdown} />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="edit" className="flex-1 m-0 data-[state=active]:flex data-[state=active]:flex-col">
                                        <Textarea 
                                            value={markdown}
                                            onChange={(e) => setMarkdown(e.target.value)}
                                            className="flex-1 w-full p-8 bg-transparent border-0 focus-visible:ring-0 resize-none font-mono text-sm leading-relaxed"
                                            placeholder="Edit your wiki content here..."
                                        />
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-primary/10 rounded-3xl bg-primary/5"
                    >
                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary/50 relative">
                            <Globe className="w-10 h-10" />
                            <div className="absolute -right-2 -top-2 w-8 h-8 rounded-full bg-background border flex items-center justify-center shadow-sm">
                                <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold mb-2">Ready to explore?</h2>
                        <p className="text-muted-foreground max-w-md mx-auto mb-8">
                            Enter any website URL above to start extracting knowledge. Our AI will clean, structure, and convert the page into a beautiful Wiki format.
                        </p>
                        <Button 
                            variant="secondary" 
                            className="gap-2 group py-6 px-8 rounded-2xl"
                            onClick={handleTest}
                            disabled={isLoading}
                        >
                            Try with Wikipedia
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
