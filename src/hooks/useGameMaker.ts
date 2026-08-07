import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface GameConfig {
  genre: string;
  visualStyle: string;
  difficulty: string;
  theme: string;
  controlType: string;
  mobileFriendly: boolean;
}

export const DEFAULT_CONFIG: GameConfig = {
  genre: "platformer",
  visualStyle: "premium-ui",
  difficulty: "medium",
  theme: "sci-fi",
  controlType: "keyboard",
  mobileFriendly: false,
};

export const GENRES = [
  { id: "platformer", label: "Platformer", emoji: "🏃" },
  { id: "shooter", label: "Shooter", emoji: "🔫" },
  { id: "puzzle", label: "Puzzle", emoji: "🧩" },
  { id: "racing", label: "Racing", emoji: "🏎️" },
  { id: "rpg", label: "RPG", emoji: "⚔️" },
  { id: "survival", label: "Survival", emoji: "🧟" },
  { id: "endless-runner", label: "Endless Runner", emoji: "🏃‍♂️" },
  { id: "arcade", label: "Arcade", emoji: "👾" },
  { id: "strategy", label: "Strategy", emoji: "♟️" },
  { id: "physics", label: "Physics Sandbox", emoji: "🔬" },
];

export const VISUAL_STYLES = [
  { id: "premium-ui", label: "Premium UI" },
  { id: "pixel-art", label: "Pixel Art" },
  { id: "neon", label: "Neon/Cyberpunk" },
  { id: "minimalist", label: "Minimalist" },
  { id: "retro", label: "Retro" },
  { id: "cartoon", label: "Cartoon" },
  { id: "modern", label: "Modern/Flat" },
];

export const DIFFICULTIES = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
  { id: "insane", label: "Insane" },
];

export const THEMES = [
  { id: "sci-fi", label: "Sci-Fi" },
  { id: "fantasy", label: "Fantasy" },
  { id: "horror", label: "Horror" },
  { id: "nature", label: "Nature" },
  { id: "space", label: "Space" },
  { id: "underwater", label: "Underwater" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "medieval", label: "Medieval" },
];

export type GenerationStage = "idle" | "thinking" | "generating" | "compiling" | "done" | "error";

const SYSTEM_PROMPT = `You are a world-class game developer and UI/UX designer. Your goal is to generate a COMPLETE, SINGLE, self-contained, and HIGHLY POLISHED HTML file for a browser game that looks like a premium product.

Instructions:

1. **Architecture & Tech Stack**:
    - Use HTML5, Canvas API for the game engine, and Tailwind CSS for the UI/HUD.
    - Include Tailwind: <script src="https://cdn.tailwindcss.com"></script>
    - Include FontAwesome: <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    - Include Google Fonts (choose a font that matches the game's theme, e.g., 'Orbitron' for Sci-Fi, 'Press Start 2P' for Retro).

2. **Visual Excellence (Aesthetics)**:
    - **UI Design**: Use Flowbite-inspired components for menus, buttons, and modals.
    - **Theme**: Use a cohesive color palette. Use a modern design with **blue as the primary color** theme (unless the user specifies otherwise).
    - **Glassmorphism**: Use backdrop-blur, semi-transparent backgrounds, and subtle borders for the HUD and overlays.
    - **Typography**: Use large, bold headings and readable body text. Add text-shadows for better legibility against game backgrounds.
    - **Animations**: Add CSS transitions and keyframe animations for UI elements (fade-ins, scale-up on hover, bouncing buttons).

3. **Game Mechanics & Polish**:
    - **HUD**: Create a beautiful, responsive HUD showing score, lives, level, etc., using Tailwind.
    - **Screens**: Every game MUST have a "Start Screen" (with a play button and instructions) and a "Game Over Screen" (with score summary and retry button). These should be centered, visually stunning overlays.
    - **Particles & FX**: Use Canvas to draw simple particle effects (explosions, sparks, trails) to make the game feel "juicy".

4. **Output Requirements**:
    - Output ONLY the raw HTML code. Do NOT include markdown code blocks (no \`\`\`html).
    - Start with <!DOCTYPE html> and end with </html>.
    - Ensure it is fully responsive and works on both desktop and mobile (if requested).
    - All components should be independent; do not connect them.
    - Add proper padding and margin for each element.
    - Use high-quality placeholder images where appropriate:
        * Light theme: https://community.softr.io/uploads/db9110/original/2X/7/74e6e7e3802d0ffd57773c9a878e6f8817a6a8c.jpeg
        * Dark theme: https://www.cibaky.com/wp-content/uploads/2015/12/placeholder-3.jpg
        * Always add descriptive alt tags for images.

5. **Style Guidelines from Playground**:
    - Ensure proper spacing, alignment, and hierarchy in all HTML elements.
    - Primary buttons should match the theme color.
    - Use modern gradients for backgrounds and buttons.
    - Do not include broken links.
    - Do not add any extra text before or after the HTML code.

The game must be FUN, BUG-FREE, and look like it was designed by a professional studio.`;

export function useGameMaker() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [stage, setStage] = useState<GenerationStage>("idle");
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const { selectedModel, isManualModel, refreshUser, apiKeys } = useAuth();
  const { toast } = useToast();

  const generate = useCallback(async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt Required", description: "Describe the game you want to create.", variant: "destructive" });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setGeneratedHtml(null);
    setStreamingText("");
    setStage("thinking");
    setProgress(0);

    const fullPrompt = `Create this game: ${prompt.trim()}

Game Settings:
- Genre: ${config.genre}
- Visual Style: ${config.visualStyle}
- Difficulty: ${config.difficulty}
- Theme: ${config.theme}
- Controls: ${config.controlType}
- Mobile Friendly: ${config.mobileFriendly ? "Yes, add touch controls" : "No"}

IMPORTANT: Focus heavily on the UI/UX. The game should have a "premium" feel with professional-grade UI components, modern typography, and smooth animations as per the system instructions. Output ONLY the HTML code.`;

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      Object.entries(apiKeys || {}).forEach(([provider, key]) => {
          if (key) headers[`x-provider-key-${provider}`] = key;
      });

      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers,
        body: JSON.stringify({
          tool: "game-maker",
          model: selectedModel,
          isManual: isManualModel,
          prompt: fullPrompt,
          systemPrompt: SYSTEM_PROMPT,
          image: image || undefined,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || "Generation failed");
      }

      setStage("generating");
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              accumulated += parsed.text;
              setStreamingText(accumulated);
              const estimatedProgress = Math.min(90, (accumulated.length / 8000) * 90);
              setProgress(estimatedProgress);
            }
            if (parsed.error) throw new Error(parsed.error);
          } catch (e: any) {
            if (e.message === "Stream interrupted") throw e;
          }
        }
      }

      // Extract HTML from accumulated text
      let html = accumulated.trim();
      // Remove markdown fences if present
      const fenceMatch = html.match(/```html?\s*\n?([\s\S]*?)```/);
      if (fenceMatch) html = fenceMatch[1].trim();
      // Ensure it starts with DOCTYPE or html
      const dtIdx = html.indexOf("<!DOCTYPE");
      const htmlIdx = html.indexOf("<html");
      const startIdx = dtIdx >= 0 ? dtIdx : htmlIdx;
      if (startIdx > 0) html = html.slice(startIdx);
      const endIdx = html.lastIndexOf("</html>");
      if (endIdx > 0) html = html.slice(0, endIdx + 7);

      if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
        throw new Error("AI did not generate valid HTML game code.");
      }

      setStage("compiling");
      setProgress(95);
      await new Promise((r) => setTimeout(r, 600));
      setGeneratedHtml(html);
      setStage("done");
      setProgress(100);
      refreshUser();
      toast({ title: "Game Created!", description: "Your game is ready to play." });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setStage("error");
      toast({ title: "Generation Failed", description: err.message, variant: "destructive" });
    }
  }, [prompt, image, config, selectedModel, refreshUser, toast]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStage("idle");
    setProgress(0);
  }, []);

  const download = useCallback(() => {
    if (!generatedHtml) return;
    const blob = new Blob([generatedHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `game-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Downloaded!", description: "Game saved as HTML file." });
  }, [generatedHtml, toast]);

  const copySource = useCallback(() => {
    if (!generatedHtml) return;
    navigator.clipboard.writeText(generatedHtml);
    toast({ title: "Copied!", description: "Game source copied to clipboard." });
  }, [generatedHtml, toast]);

  return {
    prompt, setPrompt,
    image, setImage,
    config, setConfig,
    generatedHtml, setGeneratedHtml,
    streamingText,
    stage, setStage, progress,
    isFullscreen, setIsFullscreen,
    showConfig, setShowConfig,
    generate, cancel, download, copySource,
  };
}
