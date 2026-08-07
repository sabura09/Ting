import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2, Download, Copy, Maximize2, Minimize2,
  Play, X, RefreshCw, Wand2, Zap, AlertTriangle, Settings2,
  ChevronDown, ChevronUp, Loader2, Save, Trash2, ExternalLink, Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useGameMaker, GENRES, VISUAL_STYLES, DIFFICULTIES, THEMES,
  type GenerationStage,
} from "@/hooks/useGameMaker";

/* ── Stage Labels ── */
const STAGE_LABELS: Record<GenerationStage, string> = {
  idle: "",
  thinking: "Analyzing game concept...",
  generating: "Writing game code...",
  compiling: "Compiling & optimizing...",
  done: "Game ready!",
  error: "Generation failed",
};

/* ── Config Chip ── */
function ChipSelector({ label, options, value, onChange }: {
  label: string;
  options: { id: string; label: string; emoji?: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              value === opt.id
                ? "bg-primary/10 border-primary text-primary shadow-sm"
                : "bg-background border-input text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {opt.emoji ? `${opt.emoji} ` : ""}{opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Sandbox iframe ── */
function GamePreview({ html, isFullscreen, isLive = false }: { html: string; isFullscreen: boolean; isLive?: boolean }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let content = html;
    if (isLive) {
      if (content.includes('<style>') && !content.includes('</style>')) content += '</style>';
      if (content.includes('<body>') && !content.includes('</body>')) content += '</body>';
      if (content.includes('<html>') && !content.includes('</html>')) content += '</html>';
    }
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [html, isLive]);

  if (!blobUrl) return null;

  return (
    <div className={`relative w-full overflow-hidden rounded-xl border bg-black shadow-inner ${isFullscreen ? "h-full" : "h-[400px] sm:h-[500px] lg:h-[600px]"}`}>
      {isLive && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 border backdrop-blur-sm shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/70">Building Live</span>
        </div>
      )}
      <iframe
        src={blobUrl}
        title="Game Preview"
        sandbox="allow-scripts allow-same-origin"
        className="w-full h-full"
      />
    </div>
  );
}

/* ── Demo Prompts ── */
const DEMO_PROMPTS = [
  { label: "Flappy Bird Clone", prompt: "Create a Flappy Bird clone with a cyberpunk theme and neon pipes." },
  { label: "Space Shooter", prompt: "Build a top-down space shooter where you fight waves of alien ships and collect power-ups." },
  { label: "Memory Match", prompt: "Design a card memory matching game with a clean minimalist UI and smooth animations." },
  { label: "Dino Runner", prompt: "Create a side-scrolling endless runner game similar to the Chrome Dino game but with a desert fantasy theme." },
];

export default function GameMakerPage() {
  const gm = useGameMaker();
  const previewRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast: uiToast } = useToast();
  const isGenerating = gm.stage === "thinking" || gm.stage === "generating" || gm.stage === "compiling";

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("Please upload an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        gm.setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const [savedGames, setSavedGames] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSavedGames = async () => {
    try {
      const res = await fetch("/api/game/save");
      const data = await res.json();
      if (Array.isArray(data)) setSavedGames(data);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  };

  useEffect(() => {
    fetchSavedGames();
  }, []);

  const handleSaveGame = async () => {
    if (!gm.generatedHtml) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/game/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gm.prompt.slice(0, 30) + (gm.prompt.length > 30 ? "..." : ""),
          code: gm.generatedHtml,
          prompt: gm.prompt,
          genre: gm.config.genre,
          visualStyle: gm.config.visualStyle,
        }),
      });

      if (res.ok) {
        toast.success("Game saved successfully!");
        fetchSavedGames();
      } else {
        toast.error("Failed to save game.");
      }
    } catch (error) {
      toast.error("Error saving game.");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setGameToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!gameToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/game/save?id=${gameToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Game deleted");
        fetchSavedGames();
      } else {
        toast.error("Failed to delete game");
      }
    } catch (error: any) {
      toast.error("Error deleting game");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setGameToDelete(null);
    }
  }

  const toggleFullscreen = () => {
    if (!previewRef.current) return;
    if (!document.fullscreenElement) {
      previewRef.current.requestFullscreen();
      gm.setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      gm.setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) gm.setIsFullscreen(false); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div className="container mx-auto p-4 lg:p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
          <Gamepad2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Game Maker</h1>
          <p className="text-muted-foreground">
            Describe your game idea and have AI generate a fully playable HTML file instantly
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Left: Controls */}
        <div className="space-y-6">
          <Card className="shadow-sm border-muted/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-primary" />
                Game Studio
              </CardTitle>
              <CardDescription>
                Define the core mechanics and theme of your game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prompt" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={imageInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                      accept="image/*"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => imageInputRef.current?.click()}
                      className="h-7 px-2 text-[10px] font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md gap-1"
                      disabled={isGenerating}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Add Mockup/Ref Image
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Textarea
                    id="prompt"
                    placeholder="e.g. A neon-themed space shooter where you collect gems to upgrade your ship..."
                    value={gm.prompt}
                    onChange={(e) => gm.setPrompt(e.target.value)}
                    className="min-h-[140px] resize-none"
                  />
                  {gm.image && (
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 p-1 bg-background/90 border rounded-lg shadow-sm backdrop-blur-sm group">
                      <img
                        src={gm.image}
                        alt="Reference Mockup"
                        className="w-12 h-12 object-cover rounded-md border"
                      />
                      <button
                        type="button"
                        onClick={() => gm.setImage(null)}
                        className="p-1 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors shadow-sm"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Demo Prompts */}
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold uppercase tracking-[0.05em] text-muted-foreground/60">Try a demo prompt</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_PROMPTS.map((demo, i) => (
                    <button
                      key={i}
                      onClick={() => gm.setPrompt(demo.prompt)}
                      className="px-2 py-1 rounded-md bg-muted/50 border border-transparent hover:border-primary/20 hover:bg-primary/5 text-[10px] font-medium text-muted-foreground hover:text-primary transition-all"
                    >
                      {demo.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Advanced Configuration</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => gm.setShowConfig(!gm.showConfig)}
                  className="h-8 px-2 text-muted-foreground"
                >
                  {gm.showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>

              <AnimatePresence>
                {gm.showConfig && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden pt-2 border-t"
                  >
                    <ChipSelector
                      label="Genre"
                      options={GENRES}
                      value={gm.config.genre}
                      onChange={(v) => gm.setConfig({ ...gm.config, genre: v })}
                    />
                    <ChipSelector
                      label="Visual Style"
                      options={VISUAL_STYLES}
                      value={gm.config.visualStyle}
                      onChange={(v) => gm.setConfig({ ...gm.config, visualStyle: v })}
                    />
                    <ChipSelector
                      label="Difficulty"
                      options={DIFFICULTIES}
                      value={gm.config.difficulty}
                      onChange={(v) => gm.setConfig({ ...gm.config, difficulty: v })}
                    />
                    <div className="flex items-center justify-between pt-2">
                      <Label className="text-xs font-medium">Mobile Friendly</Label>
                      <button
                        onClick={() => gm.setConfig({ ...gm.config, mobileFriendly: !gm.config.mobileFriendly })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          gm.config.mobileFriendly ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                          gm.config.mobileFriendly ? "left-5.5 translate-x-1" : "left-0.5"
                        }`} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-2">
                {isGenerating ? (
                  <Button
                    onClick={gm.cancel}
                    variant="outline"
                    className="w-full h-11 border-destructive/20 text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-4 h-4 mr-2" /> Stop Generation
                  </Button>
                ) : (
                  <Button
                    onClick={gm.generate}
                    disabled={!gm.prompt.trim()}
                    className="w-full h-11 shadow-sm"
                    size="lg"
                  >
                    {gm.stage === "done" ? (
                      <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate Game</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> Build Game Now</>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview */}
        <div ref={previewRef} className={gm.isFullscreen ? "fixed inset-0 z-[100] bg-background flex flex-col" : ""}>
          <Card className={`shadow-sm border-muted/60 overflow-hidden flex flex-col ${gm.isFullscreen ? "h-full rounded-none" : ""}`}>
            <CardHeader className="py-3 px-4 flex flex-col bg-muted/30 border-b space-y-3">
              <div className="flex flex-row items-center justify-between w-full space-y-0">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Preview</CardTitle>
                  {gm.generatedHtml ? (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-emerald-600">LIVE</span>
                    </div>
                  ) : isGenerating && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                      <Loader2 className="w-2.5 h-2.5 text-primary animate-spin" />
                      <span className="text-[10px] font-bold text-primary uppercase">Developing...</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {gm.generatedHtml && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-2 text-primary hover:bg-primary/10 hover:text-primary" 
                        onClick={handleSaveGame}
                        disabled={isSaving}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">Save Game</span>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={gm.copySource} title="Copy Code">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={gm.download} title="Download HTML">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title="Fullscreen">
                        {gm.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {isGenerating && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wider">
                    <span className="text-primary">{STAGE_LABELS[gm.stage]}</span>
                    <span className="text-muted-foreground tabular-nums">{Math.round(gm.progress)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-background overflow-hidden border border-primary/10">
                    <motion.div
                      className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${gm.progress}%` }}
                      transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                    />
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className={`p-4 bg-muted/10 ${gm.isFullscreen ? "flex-1" : ""}`}>
              {gm.generatedHtml ? (
                <GamePreview html={gm.generatedHtml} isFullscreen={gm.isFullscreen} />
              ) : gm.stage === "generating" && gm.streamingText ? (
                <GamePreview html={gm.streamingText} isFullscreen={gm.isFullscreen} isLive={true} />
              ) : gm.stage === "thinking" || gm.stage === "compiling" || (gm.stage === "generating" && !gm.streamingText) ? (
                <div className="h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center bg-background rounded-xl border shadow-inner">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{STAGE_LABELS[gm.stage]}</p>
                      <p className="text-xs text-muted-foreground mt-1">Preparing your workspace...</p>
                    </div>
                  </div>
                </div>
              ) : gm.stage === "error" ? (
                <div className="h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center bg-background rounded-xl border border-destructive/20 shadow-inner">
                  <div className="text-center space-y-4">
                    <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
                    <p className="text-sm text-destructive font-medium">Generation encountered an error</p>
                    <Button variant="outline" size="sm" onClick={gm.generate}>
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-[400px] sm:h-[500px] lg:h-[600px] flex items-center justify-center bg-background rounded-xl border border-dashed shadow-inner">
                  <div className="text-center space-y-4 max-w-xs">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <Play className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">No game generated yet</p>
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        Enter a description on the left and click "Build Game Now" to start your creative process.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Saved Games Section */}
      <div className="space-y-6 pt-6 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Saved Games</h2>
          </div>
        </div>

        {savedGames.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex flex-col bg-card border rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                {/* Preview Frame */}
                <div className="aspect-video relative overflow-hidden bg-muted border-b">
                  <iframe
                    srcDoc={game.code}
                    className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0"
                    title={game.name}
                    tabIndex={-1}
                    sandbox="allow-scripts"
                  />
                  <div className="absolute inset-0 bg-transparent" />
                  
                  {/* Action Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      className="rounded-full gap-2"
                      onClick={() => {
                        gm.setGeneratedHtml(game.code);
                        gm.setPrompt(game.prompt);
                        gm.setConfig({
                          ...gm.config,
                          genre: game.genre,
                          visualStyle: game.visualStyle
                        });
                        gm.setStage("done");
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setTimeout(() => {
                          toggleFullscreen();
                        }, 50);
                      }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Play Again
                    </Button>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                        {game.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-muted font-medium uppercase tracking-wider">{game.genre}</span>
                        <span>•</span>
                        <span>{new Date(game.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                      onClick={(e) => triggerDelete(game.id, e)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 italic">
                    "{game.prompt}"
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-muted/20">
            <div className="max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-muted-foreground/30" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-muted-foreground">No saved games yet</h3>
                <p className="text-sm text-muted-foreground/60">
                  Build your first game and save it to see it appear here in your collection.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog 
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Game"
        description="Are you sure you want to delete this game? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
