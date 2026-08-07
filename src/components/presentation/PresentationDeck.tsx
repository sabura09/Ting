"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Pause,
    Maximize2,
    Grid,
    Download,
    Sparkles,
    Monitor,
    Smartphone,
    Globe,
    CheckCircle2,
    ArrowRight,
    X,
    Code,
    Sliders,
    Rocket,
    Shield,
    DollarSign,
    Send,
    Sun,
    Moon,
    ArrowLeft,
    Loader2,
    Terminal,
    Layers,
    Cpu,
    BookOpen,
    TrendingUp,
    Users,
    AlertTriangle,
    Target,
    Zap,
    Check
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { exportToPowerPoint, SlideData } from '@/utils/pptxExporter';
import { streamGeminiResponse } from '@/components/website/playground/_components/aiClient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import ChatSection from '@/components/website/playground/_components/ChatSection';
import { Messages } from '@/components/website/playground/playground';


const floatingIcons = [
    { emoji: '🚀', top: '10%', left: '4%', size: 'text-3xl', delay: 0 },
    { emoji: '🎨', bottom: '15%', left: '3%', size: 'text-4xl', delay: 0.3 },
    { emoji: '💡', top: '12%', right: '5%', size: 'text-2xl', delay: 0.5 },
    { emoji: '🎯', bottom: '12%', right: '4%', size: 'text-4xl', delay: 0.7 },
    { emoji: '⭐', bottom: '25%', left: '8%', size: 'text-2xl', delay: 0.4 },
    { emoji: '🧩', top: '22%', right: '3%', size: 'text-3xl', delay: 0.2 },
];

const PRESENTATION_SYSTEM_PROMPT = `
You are an expert Presentation AI Designer.
Your task is to generate EXACTLY 8 presentation slides strictly tailored to the user's prompt topic.

CRITICAL REQUIREMENT:
Output your response containing a JSON array of EXACTLY 8 slide objects inside a \`\`\`json \`\`\` code block.

OPTIONAL FIELDS AVAILABLE ON ANY SLIDE:
- "image": A valid Unsplash image URL for a hero/featured image. Use https://images.unsplash.com/photo-<id>?w=800&q=80 format. Pick contextually relevant images.
- "backgroundGradient": A CSS gradient string for the slide background (e.g. "linear-gradient(135deg, #f5f0ff 0%, #e8dff5 50%, #ffffff 100%)"). Use soft, elegant gradients.
- "backgroundColor": A solid CSS color for the slide background (e.g. "#1a1a2e").
- "layout": Controls image placement. Options: "default", "image-right", "image-left", "image-full", "centered". Use "image-right" or "image-left" when an image is provided.

When the user provides a reference image, analyse its visual style (colors, layout, imagery) and reproduce it using the fields above.

Each slide object in the JSON array MUST have one of the 8 slide types below:

Slide 1 (type: "title"):
{
  "slideNumber": 1,
  "type": "title",
  "badge": "PRESENTATION OVERVIEW",
  "title": "Main Topic Title",
  "subtitle": "Clear 1-line value proposition / tagline",
  "image": "https://images.unsplash.com/photo-xxxxx?w=800&q=80",
  "backgroundGradient": "linear-gradient(135deg, #f5f0ff 0%, #e8dff5 100%)",
  "layout": "image-right",
  "metrics": [
    { "label": "Key Metric 1", "value": "Value 1" },
    { "label": "Key Metric 2", "value": "Value 2" },
    { "label": "Key Metric 3", "value": "Value 3" }
  ]
}

Slide 2 (type: "problem"):
{
  "slideNumber": 2,
  "type": "problem",
  "badge": "KEY CHALLENGES",
  "title": "Problem & Market Pain Points",
  "subtitle": "Explanation of primary challenges in this field",
  "cards": [
    { "title": "Challenge 1", "description": "Specific details for challenge 1" },
    { "title": "Challenge 2", "description": "Specific details for challenge 2" },
    { "title": "Challenge 3", "description": "Specific details for challenge 3" }
  ]
}

Slide 3 (type: "solution"):
{
  "slideNumber": 3,
  "type": "solution",
  "badge": "SOLUTION & INNOVATION",
  "title": "Core Solution & Key Innovations",
  "subtitle": "How technology and strategy address the challenges",
  "points": [
    "Innovation breakthrough point 1",
    "Innovation breakthrough point 2",
    "Innovation breakthrough point 3"
  ]
}

Slide 4 (type: "market"):
{
  "slideNumber": 4,
  "type": "market",
  "badge": "MARKET & IMPACT",
  "title": "Market Size & Industry Adoption",
  "subtitle": "TAM, SAM, and growth opportunities",
  "stats": [
    { "value": "$200B+", "label": "Total Addressable Market (TAM)", "desc": "Global industry reach" },
    { "value": "35%+", "label": "Annual Growth Rate (CAGR)", "desc": "Market expansion" },
    { "value": "85%", "label": "Enterprise Penetration", "desc": "Target adoption" }
  ]
}

Slide 5 (type: "business_model"):
{
  "slideNumber": 5,
  "type": "business_model",
  "badge": "ARCHITECTURE & TIERS",
  "title": "Implementation Strategy & Tiers",
  "subtitle": "Deployment tiers and features",
  "tiers": [
    { "name": "Phase 1 / Starter", "price": "Foundational", "features": ["Feature A", "Feature B"] },
    { "name": "Phase 2 / Growth", "price": "Advanced", "features": ["Feature C", "Feature D"], "popular": true },
    { "name": "Phase 3 / Enterprise", "price": "Scale", "features": ["Feature E", "Feature F"] }
  ]
}

Slide 6 (type: "traction"):
{
  "slideNumber": 6,
  "type": "traction",
  "badge": "PERFORMANCE BENCHMARKS",
  "title": "Proven Impact & Metrics",
  "subtitle": "Performance indicators and user results",
  "stats": [
    { "value": "99.4%", "label": "Model / System Accuracy" },
    { "value": "10x", "label": "Speed / Performance Boost" },
    { "value": "60%", "label": "Cost Savings" },
    { "value": "24/7", "label": "Automated Availability" }
  ]
}

Slide 7 (type: "team"):
{
  "slideNumber": 7,
  "type": "team",
  "badge": "ROADMAP & LEADERSHIP",
  "title": "Future Roadmap & Leadership",
  "subtitle": "Key milestones and team capabilities",
  "cards": [
    { "title": "Milestone 1 / Lead A", "role": "Near-Term Focus", "description": "Details about near-term focus" },
    { "title": "Milestone 2 / Lead B", "role": "Long-Term Vision", "description": "Details about long-term vision" }
  ]
}

Slide 8 (type: "ask"):
{
  "slideNumber": 8,
  "type": "ask",
  "badge": "SUMMARY & CALL TO ACTION",
  "title": "Key Takeaways & Next Steps",
  "subtitle": "Final summary of core takeaways",
  "points": [
    "Key takeaway point 1 tailored to topic",
    "Key takeaway point 2 tailored to topic",
    "Key takeaway point 3 tailored to topic"
  ]
}

ALWAYS generate ALL 8 SLIDES! Make all slide titles and descriptions 100% relevant to the prompt!
If you apply color, background, weight, or format changes to any text field, you MUST wrap the text inside the value in standard HTML inline style elements (e.g. "<span style='color: red;'>Text</span>" or "<strong>Text</strong>") directly inside the string. Do NOT add new JSON keys (such as "color": "red") to the slide data structure.
When the topic is visual (beauty, fashion, food, travel, etc.), always include relevant "image" URLs and "backgroundGradient" values on at least the title slide.
`;

// Guaranteed 8-Slide Generator for any prompt topic
function generate8SlidesForPrompt(promptText: string): SlideData[] {
    const rawTopic = promptText.trim() || 'AI Technology';
    const cleanTopic = rawTopic.replace(/make the ppt about the/i, '').replace(/create a ppt about/i, '').trim() || 'AI Innovation';

    // Topic keyword extraction
    const isNLP = cleanTopic.toLowerCase().includes('nlp') || cleanTopic.toLowerCase().includes('language') || cleanTopic.toLowerCase().includes('text');
    const isFintech = cleanTopic.toLowerCase().includes('fintech') || cleanTopic.toLowerCase().includes('pay') || cleanTopic.toLowerCase().includes('money');
    const isCrypto = cleanTopic.toLowerCase().includes('crypto') || cleanTopic.toLowerCase().includes('web3') || cleanTopic.toLowerCase().includes('blockchain');

    if (isNLP) {
        return [
            {
                slideNumber: 1,
                type: 'title',
                badge: 'ARTIFICIAL INTELLIGENCE & NLP',
                title: 'Natural Language Processing (NLP)',
                subtitle: 'Transforming Unstructured Human Language into Actionable AI Intelligence',
                metrics: [
                    { label: 'Core Architecture', value: 'Transformers & LLMs' },
                    { label: 'Primary Focus', value: 'NLU & Text Generation' },
                    { label: 'Accuracy Benchmark', value: '98.5% SOTA' }
                ]
            },
            {
                slideNumber: 2,
                type: 'problem',
                badge: 'KEY CHALLENGES',
                title: 'The Complexity of Human Language Processing',
                subtitle: 'Why parsing unstructured text, context, and speech at enterprise scale is difficult.',
                cards: [
                    { title: 'Contextual Ambiguity', description: 'Polysemy, idioms, and context-dependent semantics make raw text parsing complex.' },
                    { title: 'Unstructured Data Volume', description: 'Over 80% of enterprise data is locked in unstructured emails, PDFs, and chats.' },
                    { title: 'Multilingual Complexity', description: 'Low-resource languages and dialect variations lack robust training corpora.' }
                ]
            },
            {
                slideNumber: 3,
                type: 'solution',
                badge: 'SOLUTION & INNOVATION',
                title: 'Transformers & Deep Neural Architectures',
                subtitle: 'Self-attention mechanisms enabling parallelized language understanding.',
                points: [
                    'Self-attention mechanisms for long-range contextual dependencies',
                    'Pre-trained Large Language Models (LLMs) with domain fine-tuning',
                    'Real-time sentiment analysis, entity extraction & automated summarization'
                ]
            },
            {
                slideNumber: 4,
                type: 'market',
                badge: 'MARKET & ADOPTION',
                title: '$200 Billion TAM Across Text-Heavy Industries',
                subtitle: 'Accelerating enterprise adoption across healthcare, legal, finance, and customer support.',
                stats: [
                    { value: '$200B+', label: 'Total Addressable Market (TAM)', desc: 'Global NLP & language AI market' },
                    { value: '35%', label: 'Compound Annual Growth (CAGR)', desc: '2024 - 2030 growth rate' },
                    { value: '85%', label: 'Enterprise Adoption', desc: 'Top Fortune 500 integration' }
                ]
            },
            {
                slideNumber: 5,
                type: 'business_model',
                badge: 'ARCHITECTURE & DEPLOYMENT',
                title: 'NLP Implementation Pipeline & Tiers',
                subtitle: 'Scalable deployment from lightweight embeddings to custom fine-tuned LLMs.',
                tiers: [
                    { name: 'Phase 1: Tokenization & Embeddings', price: 'Foundational', features: ['Vector database indexing', 'Entity & keyword extraction'] },
                    { name: 'Phase 2: Transformer Fine-Tuning', price: 'Advanced', features: ['Domain adaptation (LoRA/QLoRA)', 'Retrieval-Augmented Generation (RAG)'], popular: true },
                    { name: 'Phase 3: Autonomous AI Agents', price: 'Enterprise', features: ['Multi-agent orchestration', '24/7 automated reasoning'] }
                ]
            },
            {
                slideNumber: 6,
                type: 'traction',
                badge: 'PERFORMANCE METRICS',
                title: 'Proven Accuracy & Speed Benchmarks',
                subtitle: 'SOTA performance across standard NLP evaluation benchmarks.',
                stats: [
                    { value: '99.2%', label: 'Intent Recognition Accuracy' },
                    { value: '10x', label: 'Processing Speedup' },
                    { value: '60%', label: 'Support Ticket Automation' },
                    { value: '45+', label: 'Supported Languages' }
                ]
            },
            {
                slideNumber: 7,
                type: 'team',
                badge: 'ROADMAP & MILESTONES',
                title: 'Next-Generation NLP Innovations',
                subtitle: 'Pushing the boundaries of multimodal language understanding.',
                cards: [
                    { title: 'Multimodal LLMs', role: 'Q3 Focus', description: 'Integrating vision, audio, and text in a unified transformer backbone.' },
                    { title: 'Sub-10ms Inference', role: 'Q4 Focus', description: 'Model quantization & edge deployment for real-time speech translation.' }
                ]
            },
            {
                slideNumber: 8,
                type: 'ask',
                badge: 'SUMMARY & TAKEAWAYS',
                title: 'Key Takeaways & Strategic Next Steps',
                subtitle: 'Unlocking unstructured language data to drive enterprise productivity.',
                points: [
                    'NLP is transforming unstructured text into structured, actionable business intelligence',
                    'Transformers and RAG architectures provide enterprise-grade accuracy and privacy',
                    'Early adopters gain a competitive advantage in automated customer and document workflows'
                ]
            }
        ];
    }

    // Default 8 slides tailored to any custom prompt
    return [
        {
            slideNumber: 1,
            type: 'title',
            badge: 'PRESENTATION OVERVIEW',
            title: cleanTopic.toUpperCase(),
            subtitle: `Comprehensive Overview & Strategic Insights for ${cleanTopic}`,
            metrics: [
                { label: 'Topic Category', value: cleanTopic },
                { label: 'Target Scope', value: 'Global Industry' },
                { label: 'Growth Status', value: 'High Acceleration' }
            ]
        },
        {
            slideNumber: 2,
            type: 'problem',
            badge: 'KEY CHALLENGES',
            title: `Core Challenges in ${cleanTopic}`,
            subtitle: `Understanding the primary pain points and friction surrounding ${cleanTopic}.`,
            cards: [
                { title: 'Operational Friction', description: 'Legacy methods are slow, manual, and prone to human error.' },
                { title: 'High Cost Overhead', description: 'Traditional execution requires excessive capital and engineering hours.' },
                { title: 'Scalability Barriers', description: 'Difficulty scaling operations across diverse environments.' }
            ]
        },
        {
            slideNumber: 3,
            type: 'solution',
            badge: 'SOLUTION & INNOVATION',
            title: `Innovative Approach to ${cleanTopic}`,
            subtitle: `How modern AI strategies and technology solve the core challenges.`,
            points: [
                `Automated workflows tailored specifically to ${cleanTopic}`,
                'Sub-second data processing and real-time insights',
                'Enterprise-grade security, scalability, and seamless integration'
            ]
        },
        {
            slideNumber: 4,
            type: 'market',
            badge: 'MARKET & IMPACT',
            title: `Market Opportunity in ${cleanTopic}`,
            subtitle: 'Substantial market potential and industry adoption trends.',
            stats: [
                { value: '$120B+', label: 'Total Addressable Market (TAM)', desc: 'Global market potential' },
                { value: '28%', label: 'Annual CAGR Growth', desc: 'Compound annual growth rate' },
                { value: '80%+', label: 'Enterprise Interest', desc: 'Target sector adoption' }
            ]
        },
        {
            slideNumber: 5,
            type: 'business_model',
            badge: 'STRATEGY & TIERS',
            title: 'Implementation Strategy & Tiers',
            subtitle: 'Structured roadmap for successful rollout and adoption.',
            tiers: [
                { name: 'Phase 1: Foundation', price: 'Assessment', features: ['Core infrastructure', 'Initial pilot testing'] },
                { name: 'Phase 2: Scale', price: 'Deployment', features: ['Full integration', 'Team training & SLAs'], popular: true },
                { name: 'Phase 3: Optimization', price: 'Enterprise', features: ['Continuous AI tuning', 'Global expansion'] }
            ]
        },
        {
            slideNumber: 6,
            type: 'traction',
            badge: 'METRICS & BENCHMARKS',
            title: 'Proven Results & Key Performance Metrics',
            subtitle: `Empirical benchmarks demonstrating the power of ${cleanTopic}.`,
            stats: [
                { value: '98.8%', label: 'System Reliability / Metric' },
                { value: '8x', label: 'Efficiency Gain' },
                { value: '55%', label: 'Cost Reduction' },
                { value: '24/7', label: 'Automated Operations' }
            ]
        },
        {
            slideNumber: 7,
            type: 'team',
            badge: 'ROADMAP & MILESTONES',
            title: 'Future Horizons & Key Milestones',
            subtitle: 'Upcoming product developments and strategic goals.',
            cards: [
                { title: 'Near-Term Phase', role: 'Q3 Milestone', description: 'Expanding core features and API capabilities.' },
                { title: 'Long-Term Vision', role: 'Q4 Milestone', description: 'Global scaling and autonomous ecosystem integration.' }
            ]
        },
        {
            slideNumber: 8,
            type: 'ask',
            badge: 'SUMMARY & CALL TO ACTION',
            title: 'Key Takeaways & Next Steps',
            subtitle: `Final summary of key insights for ${cleanTopic}.`,
            points: [
                `${cleanTopic} presents a massive strategic opportunity for modern organizations`,
                'Early adoption unlocks significant efficiency, speed, and competitive advantage',
                'Next step: Launch implementation and deploy continuous feedback loops'
            ]
        }
    ];
}

// Helper: Extract complete or partial slide objects from streaming text
// Uses bracket-depth counting so nested objects (metrics, cards, stats, tiers) are captured correctly
function parseStreamingSlides(text: string): SlideData[] {
    const slides: SlideData[] = [];
    try {
        // Try to extract JSON from a code block first, or find the raw array
        const rawJsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        const strToSearch = rawJsonMatch ? (rawJsonMatch[1] || rawJsonMatch[0]) : text;

        // Try parsing the entire array at once first (fastest path)
        try {
            const fullArray = JSON.parse(strToSearch.trim());
            if (Array.isArray(fullArray) && fullArray.length > 0) {
                return fullArray.filter((s: any) => s && s.title);
            }
        } catch (_) {
            // Not a complete array yet — fall through to object-by-object extraction
        }

        // Object-by-object extraction using bracket-depth counting
        // This correctly handles nested objects like { metrics: [ { label: ... } ] }
        const slideMarker = '"slideNumber"';
        let searchStart = 0;
        while (searchStart < strToSearch.length) {
            const markerIdx = strToSearch.indexOf(slideMarker, searchStart);
            if (markerIdx === -1) break;

            // Walk backward to find the opening '{' for this slide object
            let braceStart = markerIdx;
            while (braceStart > searchStart && strToSearch[braceStart] !== '{') {
                braceStart--;
            }
            if (strToSearch[braceStart] !== '{') {
                searchStart = markerIdx + slideMarker.length;
                continue;
            }

            // Walk forward counting brace depth to find the matching closing '}'
            let depth = 0;
            let braceEnd = -1;
            for (let i = braceStart; i < strToSearch.length; i++) {
                if (strToSearch[i] === '{') depth++;
                else if (strToSearch[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        braceEnd = i;
                        break;
                    }
                }
            }

            if (braceEnd === -1) {
                // Incomplete object (still streaming) — stop here
                break;
            }

            const objStr = strToSearch.substring(braceStart, braceEnd + 1);
            searchStart = braceEnd + 1;

            try {
                const slideObj = JSON.parse(objStr);
                if (slideObj && slideObj.title) {
                    slides.push(slideObj);
                }
            } catch (e) {
                // Skip malformed JSON chunks
            }
        }
    } catch (e) {
        // Fallback
    }
    return slides;
}

export interface SelectedField {
    slideIndex: number;
    field: string;
    value: string;
    tag: string;
}

function findFieldPath(obj: any, targetValue: string, path = ""): string | null {
    if (!obj || typeof obj !== 'object') return null;
    for (const key in obj) {
        if (typeof obj[key] === 'string' && obj[key].trim().toLowerCase() === targetValue.trim().toLowerCase()) {
            return path ? `${path}.${key}` : key;
        }
    }
    for (const key in obj) {
        if (typeof obj[key] === 'object') {
            const nestedPath = path ? `${path}.${key}` : key;
            const result = findFieldPath(obj[key], targetValue, nestedPath);
            if (result) return result;
        }
    }
    return null;
}

function getFriendlyTagName(path: string): string {
    if (!path) return "Element";
    const parts = path.split('.');
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    const parent = parts[0];
    const index = parseInt(parts[1], 10);
    const indexStr = isNaN(index) ? "" : ` ${index + 1}`;
    const child = parts[2] ? parts[2] : "";
    const childStr = child ? ` ${child.charAt(0).toUpperCase() + child.slice(1)}` : "";
    const parentSingular = parent.endsWith('s') ? parent.slice(0, -1) : parent;
    const parentName = parentSingular.charAt(0).toUpperCase() + parentSingular.slice(1);
    return `${parentName}${indexStr}${childStr}`;
}

function setFieldByPath(obj: any, path: string, value: any): any {
    const clone = JSON.parse(JSON.stringify(obj));
    const parts = path.split('.');
    let current = clone;
    for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const idx = parseInt(key, 10);
        if (!isNaN(idx)) {
            current = current[idx];
        } else {
            current = current[key];
        }
        if (!current) return clone;
    }
    const lastKey = parts[parts.length - 1];
    const lastIdx = parseInt(lastKey, 10);
    if (!isNaN(lastIdx)) {
        current[lastIdx] = value;
    } else {
        current[lastKey] = value;
    }
    return clone;
}

export function PresentationDeck() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userPrompt = searchParams.get('userprompt');
    const projectId = searchParams.get('projectId');
    const { selectedModel, refreshUser } = useAuth();

    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(searchParams.get('play') === 'true');
    const [showGrid, setShowGrid] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);
    const { theme } = useTheme();
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Sync isDarkMode with global header theme / ThemeProvider
    useEffect(() => {
        const checkDarkMode = () => {
            if (typeof window !== 'undefined') {
                const isDarkClass = document.documentElement.classList.contains('dark');
                setIsDarkMode(isDarkClass || theme === 'dark');
            }
        };

        checkDarkMode();

        if (typeof window !== 'undefined') {
            const observer = new MutationObserver(() => {
                checkDarkMode();
            });

            observer.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class'],
            });

            return () => observer.disconnect();
        }
    }, [theme]);

    const [isExporting, setIsExporting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [liveStreamText, setLiveStreamText] = useState('');


    // Design Chat and Visual Edits States
    const [messages, setMessages] = useState<Messages[]>([]);
    const [chatLoader, setchatLoader] = useState(false);
    const [liveThinking, setLiveThinking] = useState('');
    const [visualEditsActive, setVisualEditsActive] = useState(false);
    const [selectedField, setSelectedField] = useState<SelectedField | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Always initialize with 8 complete slides tailored to the prompt, or start empty if no prompt/project is provided
    const [slidesData, setSlidesData] = useState<SlideData[]>(() => {
        if (projectId) return [];
        if (userPrompt) return generate8SlidesForPrompt(userPrompt);
        return [];
    });

    const streamLogRef = useRef<HTMLDivElement>(null);
    const activeThumbnailRef = useRef<HTMLButtonElement>(null);
    const deckContainerRef = useRef<HTMLDivElement>(null);
    const slideStageRef = useRef<HTMLElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const activeHoverEl = useRef<HTMLElement | null>(null);
    const activeSelectedEl = useRef<HTMLElement | null>(null);

    // Track native fullscreen mode changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-scroll active thumbnail into view
    useEffect(() => {
        if (activeThumbnailRef.current) {
            activeThumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [currentSlide]);

    // Auto-scroll stream log as AI streams
    useEffect(() => {
        if (streamLogRef.current) {
            streamLogRef.current.scrollTop = streamLogRef.current.scrollHeight;
        }
    }, [liveStreamText]);

    // Token deduction API call
    const deductTokens = async (amount: number) => {
        try {
            const res = await fetch('/api/tokens/deduct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, feature: 'presentation-generation', model: selectedModel })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Insufficient tokens");
            }

            await refreshUser();
            return true;
        } catch (error: any) {
            toast.error(error.message || "Failed to deduct tokens");
            return false;
        }
    };

    // Live AI Streaming Slide Generator
    const streamGenerateSlides = useCallback(async (promptMsg: string) => {
        if (!promptMsg.trim()) return;

        const hasTokens = await deductTokens(500);
        if (!hasTokens) {
            return;
        }

        const userMsg = {
            role: 'user',
            content: promptMsg
        };
        setMessages([userMsg]);
        setIsGenerating(true);
        setchatLoader(true);
        setCurrentSlide(0); // Reset to first slide for fresh deck
        setLiveStreamText(`[AI Stream Active] Generating 8 custom presentation slides for: "${promptMsg}"...\n`);
        setLiveThinking(`Generating 8 custom presentation slides for: "${promptMsg}"...\n`);

        // Set loading placeholder slides — NOT old template defaults
        const slideTypes = ['title', 'problem', 'solution', 'market', 'business_model', 'traction', 'team', 'ask'];
        const loadingSlides: SlideData[] = slideTypes.map((type, i) => ({
            slideNumber: i + 1,
            type,
            badge: '⏳ GENERATING...',
            title: `Creating Slide ${i + 1} with AI...`,
            subtitle: `AI is generating unique content about "${promptMsg}"`,
        }));
        setSlidesData(loadingSlides);

        const apiMessages = [
            { role: 'system', content: PRESENTATION_SYSTEM_PROMPT },
            userMsg
        ];

        let aiSlidesReceived = false;

        try {
            const stream = await streamGeminiResponse(apiMessages, selectedModel);
            let accumulatedResponse = "";

            for await (const chunk of stream) {
                const chunkText = chunk.text || "";
                accumulatedResponse += chunkText;
                setLiveStreamText(accumulatedResponse);
                setLiveThinking(accumulatedResponse);

                // Incremental parser: merge parsed slides on top of loading placeholders to keep deck length at 8
                const parsedPartial = parseStreamingSlides(accumulatedResponse);
                if (parsedPartial.length >= 1) {
                    aiSlidesReceived = true;
                    setSlidesData(prev => {
                        const merged = [...prev];
                        for (let i = 0; i < parsedPartial.length; i++) {
                            if (parsedPartial[i]) {
                                merged[i] = parsedPartial[i];
                            }
                        }
                        return merged;
                    });
                }
            }

            const finalParsed = parseStreamingSlides(accumulatedResponse);
            if (finalParsed.length >= 1) {
                aiSlidesReceived = true;
                setSlidesData(prev => {
                    const merged = [...prev];
                    for (let i = 0; i < finalParsed.length; i++) {
                        if (finalParsed[i]) {
                            merged[i] = finalParsed[i];
                        }
                    }
                    return merged;
                });
                toast.success(`Successfully generated ${finalParsed.length} presentation slides!`);
            }
            setMessages(prev => [...prev, { role: 'model', content: accumulatedResponse }]);
        } catch (error: any) {
            console.warn("AI stream note:", error.message);
        } finally {
            // Only fall back to template slides if AI completely failed to generate any content
            if (!aiSlidesReceived) {
                const fallbackSlides = generate8SlidesForPrompt(promptMsg);
                setSlidesData(fallbackSlides);
                toast.info("Using pre-built template slides for this topic.");
                setMessages(prev => [...prev, { role: 'model', content: "Here is a pre-built template deck for your topic." }]);
            }
            setIsGenerating(false);
            setchatLoader(false);
            setLiveThinking("");
        }
    }, [selectedModel]);

    // Send chat messages to AI to edit slides
    const SendChatMessage = async (input: string, image?: string | null) => {
        if (!input && !image) return;

        const userMsg: Messages = {
            role: 'user',
            content: input,
            image: image || undefined,
            elementTag: selectedField ? selectedField.tag : undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setIsGenerating(true);
        setchatLoader(true);

        const hasTokens = await deductTokens(10);
        if (!hasTokens) {
            setMessages(prev => prev.slice(0, -1));
            setIsGenerating(false);
            setchatLoader(false);
            return;
        }

        // ── TARGETED FIELD EDIT (surgical single-field update) ──
        if (selectedField && selectedField.field !== 'custom') {
            const targetSlide = slidesData[selectedField.slideIndex];
            const systemPrompt = `
You are an expert Presentation AI text editor.
The user selected a SINGLE field on Slide ${selectedField.slideIndex + 1}.
Field path: "${selectedField.field}"
Current value: "${selectedField.value}"
Slide context (type: ${targetSlide?.type || 'unknown'}):
${JSON.stringify(targetSlide, null, 2)}

The user's request: "${input}"

CRITICAL RULES:
1. Return ONLY the new replacement value for this single field. Nothing else.
2. Do NOT return a JSON array of slides. Do NOT return the full slide object.
3. Return the updated text value as a single plain string (no quotes, no JSON wrapping).
4. If the user requests style changes (color, bold, italic etc), wrap the text in inline HTML (e.g. <span style="color: red;">Text</span>).
5. Keep the meaning and context of the original value intact unless the user explicitly asks to change it.
6. After the updated value, on a new line write "Up Next:" followed by a contextual suggestion for further improvement.

Examples of correct output:
<span style="color: green;">Global Industry</span>
Up Next: Make the title text bold and larger

Another example:
Revolutionary AI Platform
Up Next: Update the subtitle to match the new title
`;

            const apiMessages = [
                { role: 'system', content: systemPrompt },
                userMsg
            ];

            try {
                const stream = await streamGeminiResponse(apiMessages, selectedModel);
                let accumulatedResponse = "";

                for await (const chunk of stream) {
                    const chunkText = chunk.text || "";
                    accumulatedResponse += chunkText;
                    setLiveThinking(accumulatedResponse);
                }

                // Extract the updated value (everything before "Up Next:")
                const upNextMatch = accumulatedResponse.match(/Up\s*Next:/i);
                let newValue = upNextMatch
                    ? accumulatedResponse.substring(0, upNextMatch.index).trim()
                    : accumulatedResponse.trim();

                // Clean up: remove any accidental code fences or quotes
                newValue = newValue.replace(/^```[a-z]*\n?/gm, '').replace(/```$/gm, '').replace(/^"|"$/g, '').trim();

                if (newValue) {
                    setSlidesData(prev => {
                        const updated = [...prev];
                        const updatedSlide = setFieldByPath(updated[selectedField.slideIndex], selectedField.field, newValue);
                        updated[selectedField.slideIndex] = updatedSlide;
                        return updated;
                    });
                    toast.success(`Updated ${selectedField.tag} on Slide ${selectedField.slideIndex + 1}`);
                }

                // Store a clean chat message with the "built:" prefix for milestone card rendering
                const chatResponse = `built: Updated ${selectedField.tag} on Slide ${selectedField.slideIndex + 1}\n\n\`\`\`json\n${JSON.stringify({ field: selectedField.field, newValue }, null, 2)}\n\`\`\`\n\n${upNextMatch ? accumulatedResponse.substring(upNextMatch.index!) : 'Up Next: Try updating another element on this slide'}`;
                setMessages(prev => [...prev, { role: 'model', content: chatResponse }]);
            } catch (error: any) {
                toast.error(error.message || "Failed to update field");
            } finally {
                setIsGenerating(false);
                setchatLoader(false);
                setLiveThinking("");
                setSelectedField(null);
            }
            return;
        }

        const systemPrompt = `
You are an expert Presentation AI Designer.
The user wants to modify the presentation deck.
The current presentation data is:
${JSON.stringify(slidesData, null, 2)}

Your task is to apply the user's request: "${input}" to the presentation.
Update ONLY the relevant slide(s) to reflect the changes. Keep all other slides EXACTLY as they are.

OPTIONAL FIELDS AVAILABLE FOR YOU TO ADD/EDIT ON ANY SLIDE OBJECT:
- "image": A valid Unsplash image URL (e.g. "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=800&q=80" for beauty/marketing topics). Pick highly contextual, premium images.
- "backgroundGradient": A CSS gradient string (e.g. "linear-gradient(135deg, #f5f0ff 0%, #e8dff5 100%)"). Use soft, visual gradients matching any reference imagery.
- "backgroundColor": A solid CSS color code.
- "layout": Controls image placement. Options: "default", "image-right", "image-left", "image-full", "centered". Use "image-right" or "image-left" to create beautiful split layouts when an image is present.

CRITICAL RULES:
1. You MUST return the FULL, complete JSON array of EXACTLY ${slidesData.length} slides, retaining all slide numbers, structures, and layouts for slides you did NOT modify.
2. Wrap your updated JSON code inside a \`\`\`json and \`\`\` code block.
3. Output a brief, single-sentence summary of the design update before the JSON block (e.g. "built: Applied custom layout adjustments").
4. Output a recommended next design step after the JSON block, formatted exactly as: "Up Next: <recommendation>".
5. If the user requests style changes (such as color, background, weight, italicization), you MUST wrap the text in standard inline styled HTML elements (e.g. "<span style=\"color: red;\">Text</span>") directly inside the field's value string. Do NOT add custom keys to the slide JSON object structure.
6. IMPORTANT: Do NOT regenerate or rewrite content for slides the user did not mention. Copy them verbatim.
`;

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
                role: m.role === 'model' ? 'model' : 'user',
                content: m.content,
                image: m.image
            })),
            userMsg
        ];

        try {
            const stream = await streamGeminiResponse(apiMessages, selectedModel);
            let accumulatedResponse = "";

            for await (const chunk of stream) {
                const chunkText = chunk.text || "";
                accumulatedResponse += chunkText;
                setLiveThinking(accumulatedResponse);

                const parsedPartial = parseStreamingSlides(accumulatedResponse);
                if (parsedPartial.length >= 1) {
                    setSlidesData(prev => {
                        const merged = [...prev];
                        for (let i = 0; i < parsedPartial.length; i++) {
                            if (parsedPartial[i]) {
                                merged[i] = parsedPartial[i];
                            }
                        }
                        return merged;
                    });
                }
            }

            const finalParsed = parseStreamingSlides(accumulatedResponse);
            if (finalParsed.length >= 1) {
                setSlidesData(prev => {
                    const merged = [...prev];
                    for (let i = 0; i < finalParsed.length; i++) {
                        if (finalParsed[i]) {
                            merged[i] = finalParsed[i];
                        }
                    }
                    return merged;
                });
                toast.success("Successfully updated presentation!");
            }
            setMessages(prev => [...prev, { role: 'model', content: accumulatedResponse }]);
        } catch (error: any) {
            toast.error(error.message || "Failed to update presentation");
        } finally {
            setIsGenerating(false);
            setchatLoader(false);
            setLiveThinking("");
            setSelectedField(null);
        }
    };

    // Load presentation from database if projectId is in the URL
    const loadPresentation = useCallback(async (id: string) => {
        setIsGenerating(true);
        try {
            const res = await fetch(`/api/presentation/save?id=${id}`);
            if (res.ok) {
                const data = await res.json();
                const project = data.find ? data.find((p: any) => p.id === id) : data;
                if (project) {
                    setSlidesData(project.slides || []);
                    setMessages(project.messages || []);
                }
            } else {
                toast.error("Failed to load presentation project");
            }
        } catch (error) {
            toast.error("Error loading presentation project");
        } finally {
            setIsGenerating(false);
        }
    }, []);

    // Initial load handler
    useEffect(() => {
        if (projectId) {
            loadPresentation(projectId);
        } else if (userPrompt) {
            streamGenerateSlides(userPrompt);
        }
    }, [projectId, userPrompt, loadPresentation, streamGenerateSlides]);

    // Auto-fullscreen on play mode if allowed by browser
    useEffect(() => {
        if (searchParams.get('play') === 'true') {
            const timer = setTimeout(() => {
                if (!document.fullscreenElement) {
                    if (deckContainerRef.current?.requestFullscreen) {
                        deckContainerRef.current.requestFullscreen().catch(() => { });
                    } else if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen().catch(() => { });
                    }
                }
            }, 500); // Small timeout to ensure layout is mounted
            return () => clearTimeout(timer);
        }
    }, [searchParams]);

    // Save presentation
    const handleSavePresentation = async () => {
        setIsSaving(true);
        try {
            const rawTitle = slidesData[0]?.title || "Untitled Presentation";
            const firstSlideTitle = rawTitle.replace(/<\/?[^>]+(>|$)/g, "");
            const res = await fetch('/api/presentation/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: projectId || undefined,
                    name: firstSlideTitle,
                    slides: slidesData,
                    messages: messages
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success("Presentation saved successfully!");
                if (data.project?.id && !projectId) {
                    const newUrl = new URL(window.location.href);
                    newUrl.searchParams.set('projectId', data.project.id);
                    window.history.pushState({}, '', newUrl);
                }
            } else {
                toast.error(data.error || "Failed to save presentation");
            }
        } catch (e) {
            toast.error("Error saving presentation");
        } finally {
            setIsSaving(false);
        }
    };

    // Visual edits highlight event listeners
    useEffect(() => {
        if (!visualEditsActive) {
            if (activeSelectedEl.current) {
                activeSelectedEl.current.style.outline = "";
                activeSelectedEl.current.style.outlineOffset = "";
            }
            if (activeHoverEl.current) {
                activeHoverEl.current.style.outline = "";
                activeHoverEl.current.style.outlineOffset = "";
            }
            setSelectedField(null);
            return;
        }

        const container = slideStageRef.current;
        if (!container) return;

        const handleMouseOver = (e: MouseEvent) => {
            if (!visualEditsActive || slidesData.length === 0) return;
            const target = e.target as HTMLElement;
            if (target === container || !target.innerText?.trim() || target.children.length > 2) return;

            if (activeHoverEl.current && activeHoverEl.current !== target && activeHoverEl.current !== activeSelectedEl.current) {
                activeHoverEl.current.style.outline = "";
                activeHoverEl.current.style.outlineOffset = "";
            }

            activeHoverEl.current = target;
            if (target !== activeSelectedEl.current) {
                target.style.outline = "2px dashed #3b82f6";
                target.style.outlineOffset = "4px";
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            if (!visualEditsActive || slidesData.length === 0) return;
            const target = e.target as HTMLElement;
            if (activeHoverEl.current === target && target !== activeSelectedEl.current) {
                target.style.outline = "";
                target.style.outlineOffset = "";
                activeHoverEl.current = null;
            }
        };

        const handleClick = (e: MouseEvent) => {
            if (!visualEditsActive || slidesData.length === 0) return;

            const target = e.target as HTMLElement;
            if (target === container || !target.innerText?.trim() || target.children.length > 2) return;

            e.preventDefault();
            e.stopPropagation();

            if (activeSelectedEl.current) {
                activeSelectedEl.current.style.outline = "";
                activeSelectedEl.current.style.outlineOffset = "";
            }

            activeSelectedEl.current = target;
            target.style.outline = "2px solid #3b82f6";
            target.style.outlineOffset = "4px";

            const val = target.innerText.trim();
            const slide = slidesData[currentSlide];
            const path = findFieldPath(slide, val);
            if (path) {
                const tag = getFriendlyTagName(path);
                setSelectedField({
                    slideIndex: currentSlide,
                    field: path,
                    value: val,
                    tag: tag
                });
            } else {
                setSelectedField({
                    slideIndex: currentSlide,
                    field: "custom",
                    value: val,
                    tag: "Text Section"
                });
            }
        };

        container.addEventListener('mouseover', handleMouseOver);
        container.addEventListener('mouseout', handleMouseOut);
        container.addEventListener('click', handleClick, true);

        return () => {
            container.removeEventListener('mouseover', handleMouseOver);
            container.removeEventListener('mouseout', handleMouseOut);
            container.removeEventListener('click', handleClick, true);
        };
    }, [visualEditsActive, currentSlide, slidesData]);

    useEffect(() => {
        if (!selectedField && activeSelectedEl.current) {
            activeSelectedEl.current.style.outline = "";
            activeSelectedEl.current.style.outlineOffset = "";
            activeSelectedEl.current = null;
        }
    }, [selectedField]);


    const totalSlides = slidesData.length;

    const nextSlide = useCallback(() => {
        if (totalSlides === 0) return;
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, [totalSlides]);

    const prevSlide = useCallback(() => {
        if (totalSlides === 0) return;
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    }, [totalSlides]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') {
                e.preventDefault();
                nextSlide();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'Escape') {
                setShowGrid(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextSlide, prevSlide]);

    // Auto-play timer
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                nextSlide();
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, nextSlide]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (deckContainerRef.current?.requestFullscreen) {
                deckContainerRef.current.requestFullscreen().catch(() => { });
            } else if (document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => { });
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => { });
            }
        }
    };

    const handleExportPPTX = async () => {
        setIsExporting(true);
        try {
            await exportToPowerPoint(slidesData);
            toast.success("PowerPoint presentation (.pptx) downloaded successfully!");
        } catch (error) {
            toast.error("Failed to generate PowerPoint file.");
        } finally {
            setIsExporting(false);
        }
    };


    const activeSlide = slidesData[currentSlide] || slidesData[0];

    return (
        <div ref={deckContainerRef} className={`relative w-full h-[calc(100vh-4rem)] flex flex-col overflow-hidden font-sans select-none transition-colors duration-300 ${isFullscreen ? (isDarkMode ? 'dark bg-black text-white p-0' : 'bg-slate-100 text-slate-900 p-0') : (isDarkMode ? 'dark bg-[#090D16] text-white' : 'bg-slate-50 text-slate-900')
            }`}>
            {/* FULLSCREEN PRESENTATION MODE: Renders ONLY the PPT slide */}
            {isFullscreen ? (
                <div className={`relative w-full h-full flex flex-col justify-between p-6 md:p-12 overflow-hidden select-none transition-colors duration-300 ${isDarkMode ? 'dark bg-[#05070d] text-white' : 'bg-slate-100 text-slate-900'
                    }`}>
                    {/* Top Status & Exit Button */}
                    <div className="relative z-50 flex items-center justify-between opacity-60 hover:opacity-100 transition-opacity duration-300">
                        <div className={`flex items-center gap-2.5 text-xs font-bold tracking-widest uppercase font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'
                            }`}>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Presentation Mode — Slide {currentSlide + 1} of {totalSlides}</span>
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition shadow-md ${isDarkMode
                                ? 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                                : 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 border-slate-300'
                                }`}
                            title="Exit Full Screen (Esc)"
                        >
                            <X size={15} />
                            <span>Exit (Esc)</span>
                        </button>
                    </div>

                    {/* Main Stage: PPT Slide Only */}
                    <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.04 }}
                                transition={{ duration: 0.35, ease: 'easeOut' }}
                                className={`w-full max-w-6xl aspect-video max-h-[85vh] rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col justify-center overflow-hidden relative border ${isDarkMode
                                    ? 'dark bg-[#090D16] text-white border-white/15'
                                    : 'bg-white text-slate-900 border-slate-200'
                                    }`}
                                style={{
                                    ...(activeSlide?.backgroundGradient ? { background: activeSlide.backgroundGradient } : {}),
                                    ...(activeSlide?.backgroundColor && !activeSlide?.backgroundGradient ? { backgroundColor: activeSlide.backgroundColor } : {}),
                                }}
                            >
                                {activeSlide ? (
                                    <DynamicSlideRenderer slide={activeSlide} slideIndex={currentSlide} isDarkMode={isDarkMode} />
                                ) : null}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Bottom Floating Nav Controls */}
                    <div className="relative z-50 flex items-center justify-center gap-4 opacity-75 hover:opacity-100 transition-opacity duration-300 pb-2">
                        <button
                            onClick={prevSlide}
                            className={`p-3 rounded-full backdrop-blur-md border transition shadow-lg ${isDarkMode
                                ? 'bg-white/10 hover:bg-white/25 text-white border-white/20'
                                : 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 border-slate-300'
                                }`}
                            title="Previous Slide (←)"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <span className={`text-xs font-extrabold font-mono px-4 py-1.5 rounded-full border backdrop-blur-md ${isDarkMode
                            ? 'text-white/90 bg-white/10 border-white/20'
                            : 'text-slate-800 bg-slate-900/10 border-slate-300'
                            }`}>
                            Slide {currentSlide + 1} / {totalSlides}
                        </span>

                        <button
                            onClick={nextSlide}
                            className={`p-3 rounded-full backdrop-blur-md border transition shadow-lg ${isDarkMode
                                ? 'bg-white/10 hover:bg-white/25 text-white border-white/20'
                                : 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 border-slate-300'
                                }`}
                            title="Next Slide (→)"
                        >
                            <ChevronRight size={20} />
                        </button>

                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`p-3 rounded-full backdrop-blur-md border transition shadow-lg ${isPlaying
                                ? (isDarkMode ? 'bg-amber-500/25 text-amber-300 border-amber-500/50' : 'bg-amber-500/20 text-amber-700 border-amber-500/40')
                                : (isDarkMode ? 'bg-white/10 hover:bg-white/25 text-white border-white/20' : 'bg-slate-900/10 hover:bg-slate-900/20 text-slate-800 border-slate-300')
                                }`}
                            title={isPlaying ? "Pause Auto-Play" : "Start Auto-Play"}
                        >
                            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Font Import */}
                    <style dangerouslySetInnerHTML={{
                        __html: `
                @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
            `}} />

                    {/* Grid background */}
                    <div
                        className="absolute inset-0 pointer-events-none z-0"
                        style={{
                            backgroundImage: `
                        linear-gradient(to right, ${isDarkMode ? 'rgba(148,163,184,0.05)' : 'rgba(148,163,184,0.15)'} 1px, transparent 1px),
                        linear-gradient(to bottom, ${isDarkMode ? 'rgba(148,163,184,0.05)' : 'rgba(148,163,184,0.15)'} 1px, transparent 1px)
                    `,
                            backgroundSize: '36px 36px',
                        }}
                    />

                    {/* Ambient light glow */}
                    <div
                        className="absolute inset-0 pointer-events-none z-0"
                        style={{
                            background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(124, 58, 237, 0.08), transparent)',
                        }}
                    />

                    {/* Floating emojis */}
                    {floatingIcons.map((icon, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.7, delay: 0.2 + icon.delay }}
                            className="absolute select-none pointer-events-none z-0 hidden lg:block"
                            style={{
                                top: icon.top,
                                left: icon.left,
                                right: icon.right,
                                bottom: icon.bottom,
                                fontSize: '2rem'
                            }}
                        >
                            <motion.span
                                animate={{ y: [0, -8, 0] }}
                                transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                                className="inline-block"
                            >
                                {icon.emoji}
                            </motion.span>
                        </motion.div>
                    ))}





                    {/* Main Content Area with Left Slide Thumbnails Sidebar + Center Stage */}
                    <div className="relative flex-1 z-10 flex overflow-hidden">
                        {/* Left Slide Thumbnails Sidebar */}
                        <AnimatePresence initial={false}>
                            {showSidebar && (
                                <motion.aside
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: '17rem', opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                    className="h-full border-r border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#0c1220]/80 backdrop-blur-md flex flex-col shrink-0 overflow-hidden z-20"
                                >
                                    {/* Sidebar Header */}
                                    <div className="px-3.5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                            <Layers size={15} className="text-violet-500" />
                                            <span>Slides ({totalSlides})</span>
                                        </div>
                                        {totalSlides > 0 && (
                                            <button
                                                onClick={() => setShowSidebar(false)}
                                                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition"
                                                title="Collapse Slide Panel"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Scrollable Thumbnails List */}
                                    <div className="flex-1 overflow-y-auto p-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                                        {totalSlides === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400 dark:text-slate-500">
                                                No slides generated yet.
                                            </div>
                                        ) : (
                                            slidesData.map((slideItem, idx) => {
                                                const isActive = currentSlide === idx;
                                                return (
                                                    <div key={idx} className="flex items-start gap-2.5 group">
                                                        {/* Slide Index Number on Left */}
                                                        <span className={`w-5 text-right text-xs font-bold pt-2.5 flex-shrink-0 transition-colors ${isActive
                                                            ? 'text-blue-600 dark:text-blue-400 scale-110 font-extrabold'
                                                            : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                                                            }`}>
                                                            {idx + 1}
                                                        </span>

                                                        {/* Thumbnail Card */}
                                                        <button
                                                            ref={isActive ? activeThumbnailRef : null}
                                                            onClick={() => setCurrentSlide(idx)}
                                                            className={`relative flex-1 aspect-video rounded-xl sm:rounded-2xl border-2 text-left transition-all duration-200 overflow-hidden shadow-sm ${isActive
                                                                ? 'border-blue-600 dark:border-blue-500 ring-4 ring-blue-500/20 shadow-blue-500/10 shadow-lg scale-[1.02] bg-white dark:bg-[#131B2E]'
                                                                : 'border-slate-200 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/30 bg-white dark:bg-[#131B2E] opacity-85 hover:opacity-100'
                                                                }`}
                                                        >
                                                            <MiniSlidePreview slide={slideItem} slideIndex={idx} isDarkMode={isDarkMode} />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.aside>
                            )}
                        </AnimatePresence>

                        {/* Show Sidebar Toggle Button when collapsed */}
                        {!showSidebar && (
                            <button
                                onClick={() => setShowSidebar(true)}
                                className="absolute top-4 left-4 z-30 px-3 py-2 rounded-xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 shadow-md text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition flex items-center gap-1.5 text-xs font-bold"
                                title="Show Slide Panel"
                            >
                                <Layers size={15} className="text-violet-500" />
                                <span>Slides</span>
                                <ChevronRight size={14} />
                            </button>
                        )}                        {/* Main Stage */}
                        <main ref={slideStageRef} className="relative flex-1 h-full flex items-center justify-center p-4 md:p-8 overflow-hidden">
                            {slidesData.length > 0 ? (
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentSlide}
                                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 1.04, y: -12 }}
                                        transition={{ duration: 0.4, ease: 'easeOut' }}
                                        className="w-full max-w-5xl h-full flex flex-col justify-center"
                                        style={{
                                            ...(activeSlide?.backgroundGradient ? { background: activeSlide.backgroundGradient, borderRadius: '1.5rem', padding: '2rem' } : {}),
                                            ...(activeSlide?.backgroundColor && !activeSlide?.backgroundGradient ? { backgroundColor: activeSlide.backgroundColor, borderRadius: '1.5rem', padding: '2rem' } : {}),
                                        }}
                                    >
                                        {activeSlide ? (
                                            <DynamicSlideRenderer slide={activeSlide} slideIndex={currentSlide} isDarkMode={isDarkMode} />
                                        ) : null}
                                    </motion.div>
                                </AnimatePresence>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-8 space-y-6 max-w-md mx-auto relative z-10">
                                    <div className="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shadow-lg shadow-blue-500/5 rotate-6 hover:rotate-0 transition-transform duration-300">
                                        <Sparkles size={40} className="animate-pulse text-blue-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Create a Presentation</h2>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Type a topic below or use the Design Chat on the right to generate a beautiful 8-slide presentation with AI.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </main>

                        {/* Right AI Design Chat Sidebar */}
                        <ChatSection
                            messages={messages}
                            chatLoader={chatLoader}
                            onSend={(input: string, image: string | null) => {
                                if (slidesData.length === 0) {
                                    streamGenerateSlides(input);
                                } else {
                                    SendChatMessage(input, image);
                                }
                            }}
                            loading={isGenerating}
                            liveThinking={liveThinking}
                            visualEditsActive={visualEditsActive}
                            setVisualEditsActive={setVisualEditsActive}
                            selectedElementTag={selectedField ? selectedField.tag : null}
                            clearSelection={() => setSelectedField(null)}
                        />
                    </div>

                    {/* Bottom Toolbar */}
                    <footer className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-t border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#090D16]/90 backdrop-blur-md">
                        {/* Left Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/pitch-deck')}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 transition"
                                title="Back to Pitch Deck Prompts"
                            >
                                <ArrowLeft size={16} />
                            </button>

                            <div className="h-4 w-px bg-slate-300 dark:bg-white/15 mx-1" />

                            <button
                                onClick={prevSlide}
                                disabled={totalSlides === 0}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-55 disabled:cursor-not-allowed transition text-xs font-semibold"
                            >
                                <ChevronLeft size={16} />
                                <span>Prev</span>
                            </button>

                            <button
                                onClick={nextSlide}
                                disabled={totalSlides === 0}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-55 disabled:cursor-not-allowed transition text-xs font-semibold"
                            >
                                <span>Next</span>
                                <ChevronRight size={16} />
                            </button>

                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                disabled={totalSlides === 0}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border disabled:opacity-55 disabled:cursor-not-allowed transition ${isPlaying
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                                    }`}
                            >
                                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                                <span>{isPlaying ? 'Pause' : 'Auto-Play'}</span>
                            </button>
                        </div>
                        {/* Center: Slide Counter */}
                        {totalSlides > 0 ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">
                                <span>Slide {currentSlide + 1} of {totalSlides}</span>
                            </div>
                        ) : (
                            <div className="flex-1" />
                        )}

                        {/* Right Action Controls */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleSavePresentation}
                                disabled={isSaving || totalSlides === 0}
                                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-white/5 disabled:text-slate-400 dark:disabled:text-slate-650 disabled:cursor-not-allowed shadow-md shadow-emerald-600/20 disabled:shadow-none transition-all duration-200"
                            >
                                {isSaving ? (
                                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                                ) : (
                                    <Check size={14} />
                                )}
                                <span>{isSaving ? 'Saving...' : 'Save Presentation'}</span>
                            </button>

                            <button
                                onClick={handleExportPPTX}
                                disabled={isExporting || totalSlides === 0}
                                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-white/5 dark:disabled:to-white/5 disabled:text-slate-400 dark:disabled:text-slate-650 disabled:cursor-not-allowed shadow-md shadow-violet-600/20 disabled:shadow-none transition-all duration-200"
                            >
                                {isExporting ? (
                                    <Loader2 size={14} className="animate-spin flex-shrink-0" />
                                ) : (
                                    <Download size={14} />
                                )}
                                <span>{isExporting ? 'Exporting...' : 'Export PPTX'}</span>
                            </button>

                            <button
                                onClick={() => setShowGrid(!showGrid)}
                                disabled={totalSlides === 0}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-55 disabled:cursor-not-allowed transition"
                                title="Slide Grid View"
                            >
                                <Grid size={16} />
                            </button>

                            <button
                                onClick={toggleFullscreen}
                                disabled={totalSlides === 0}
                                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 disabled:opacity-55 disabled:cursor-not-allowed transition"
                                title="Toggle Fullscreen"
                            >
                                <Maximize2 size={16} />
                            </button>
                        </div>
                    </footer>

                </>
            )}

            {/* Grid Overview Modal */}
            <AnimatePresence>
                {showGrid && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xl p-6 md:p-12 overflow-y-auto"
                    >
                        <div className="max-w-6xl mx-auto">
                            <div className="flex justify-between items-center mb-8 border-b border-white/20 pb-4">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Grid size={20} className="text-violet-400" /> 8-Slide Overview Grid
                                </h2>
                                <button
                                    onClick={() => setShowGrid(false)}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                                {slidesData.map((sl, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setCurrentSlide(idx);
                                            setShowGrid(false);
                                        }}
                                        className={`relative aspect-video rounded-xl border p-4 text-left flex flex-col justify-between transition group overflow-hidden ${currentSlide === idx
                                            ? 'border-violet-500 bg-violet-950/40 ring-2 ring-violet-500/50'
                                            : 'border-white/10 bg-[#131B2E] hover:border-white/30'
                                            }`}
                                    >
                                        <div className="text-xs font-semibold text-violet-400 mb-1 truncate">
                                            {sl.title}
                                        </div>
                                        <div className="text-[10px] text-slate-300 line-clamp-2">
                                            {sl.subtitle || sl.badge || `Slide ${idx + 1}`}
                                        </div>
                                        <div className="text-[10px] text-slate-500 mt-2 font-mono">
                                            Slide {idx + 1} of {totalSlides}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* -------------------------------------------------------------------
 * PARSE HTML STRINGS IN REACT TREE (renders dynamic styles in slide nodes)
 * ------------------------------------------------------------------- */

function parseHTMLStringsInReactTree(node: React.ReactNode): React.ReactNode {
    if (node === null || node === undefined || typeof node === 'boolean') {
        return node;
    }
    if (typeof node === 'number') {
        return node;
    }
    if (typeof node === 'string') {
        const hasHTML = /<[a-z][\s\S]*>/i.test(node);
        if (hasHTML) {
            return <span dangerouslySetInnerHTML={{ __html: node }} />;
        }
        return node;
    }
    if (React.isValidElement(node)) {
        const element = node as React.ReactElement<any>;
        const children = element.props.children;
        if (children !== undefined && children !== null) {
            const parsedChildren = React.Children.map(children, child =>
                parseHTMLStringsInReactTree(child)
            );
            return React.cloneElement(element, { ...element.props, children: parsedChildren });
        }
        return element;
    }
    if (Array.isArray(node)) {
        return node.map(child => parseHTMLStringsInReactTree(child));
    }
    return node;
}

/* -------------------------------------------------------------------
 * MINI SLIDE PREVIEW (Rendered inside Left Sidebar Thumbnails)
 * ------------------------------------------------------------------- */

function MiniSlidePreview({ slide, slideIndex, isDarkMode }: { slide: SlideData; slideIndex: number; isDarkMode: boolean }) {
    const renderContent = () => {
        const slideType = slide.type || (
            slideIndex === 0 ? 'title' :
                slideIndex === 1 ? 'problem' :
                    slideIndex === 2 ? 'solution' :
                        slideIndex === 3 ? 'market' :
                            slideIndex === 4 ? 'business_model' :
                                slideIndex === 5 ? 'traction' :
                                    slideIndex === 6 ? 'team' : 'ask'
        );

        if (slide.image) {
            return (
                <div
                    className="w-full h-full p-2 flex justify-between gap-1.5 select-none pointer-events-none overflow-hidden relative text-left"
                    style={{
                        ...(slide.backgroundGradient ? { background: slide.backgroundGradient } : {}),
                        ...(slide.backgroundColor && !slide.backgroundGradient ? { backgroundColor: slide.backgroundColor } : {}),
                    }}
                >
                    <div className="flex-1 flex flex-col justify-between h-full min-w-0">
                        <span className="px-1 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 font-extrabold text-[6px] uppercase tracking-wider truncate w-fit">
                            {slide.badge || slideType}
                        </span>
                        <div className="font-extrabold text-slate-900 dark:text-white truncate leading-tight text-[8px] sm:text-[9px] mt-1">
                            {slide.title}
                        </div>
                        {slide.subtitle && (
                            <div className="text-slate-500 dark:text-slate-400 truncate text-[6px] leading-tight">
                                {slide.subtitle}
                            </div>
                        )}
                    </div>
                    <div className="w-[30%] h-full rounded overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 shrink-0">
                        <img
                            src={slide.image || "/1.jpg"}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.endsWith('/1.jpg')) {
                                    target.src = '/1.jpg';
                                }
                            }}
                        />
                    </div>
                </div>
            );
        }

        return (
            <div
                className="w-full h-full p-2 flex flex-col justify-between select-none pointer-events-none overflow-hidden relative text-left"
                style={{
                    ...(slide.backgroundGradient ? { background: slide.backgroundGradient } : {}),
                    ...(slide.backgroundColor && !slide.backgroundGradient ? { backgroundColor: slide.backgroundColor } : {}),
                }}
            >
                {/* Background ambient gradient accent */}
                {!slide.backgroundGradient && <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-violet-500/10 via-transparent to-pink-500/10" />}

                {/* Header Badge */}
                <div className="relative z-10 flex items-center justify-between gap-1">
                    <span className="px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-300 font-extrabold text-[8px] uppercase tracking-wider truncate max-w-[85%]">
                        {slide.badge || slideType}
                    </span>
                </div>

                {/* Slide Title & Subtitle preview */}
                <div className="relative z-10 my-auto space-y-0.5">
                    <div className="font-extrabold text-slate-900 dark:text-white truncate leading-tight text-[9px] sm:text-[10px]">
                        {slide.title}
                    </div>
                    {slide.subtitle && (
                        <div className="text-slate-500 dark:text-slate-400 truncate text-[7px] leading-tight">
                            {slide.subtitle}
                        </div>
                    )}
                </div>

                {/* Content Graphic Preview */}
                <div className="relative z-10 pt-1 border-t border-slate-100 dark:border-white/10">
                    {slideType === 'title' && (
                        <div className="grid grid-cols-3 gap-1">
                            <div className="p-0.5 rounded bg-slate-100 dark:bg-white/5 text-[6px] font-bold text-violet-600 dark:text-violet-400 truncate text-center">
                                {slide.metrics?.[0]?.value || '16:9'}
                            </div>
                            <div className="p-0.5 rounded bg-slate-100 dark:bg-white/5 text-[6px] font-bold text-pink-600 dark:text-pink-400 truncate text-center">
                                {slide.metrics?.[1]?.value || 'SOTA'}
                            </div>
                            <div className="p-0.5 rounded bg-slate-100 dark:bg-white/5 text-[6px] font-bold text-cyan-600 dark:text-cyan-400 truncate text-center">
                                {slide.metrics?.[2]?.value || 'PPTX'}
                            </div>
                        </div>
                    )}

                    {slideType === 'problem' && (
                        <div className="grid grid-cols-3 gap-1">
                            <div className="h-3 rounded bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[6px] font-bold text-rose-500">01</div>
                            <div className="h-3 rounded bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[6px] font-bold text-rose-500">02</div>
                            <div className="h-3 rounded bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[6px] font-bold text-rose-500">03</div>
                        </div>
                    )}

                    {slideType === 'solution' && (
                        <div className="space-y-0.5">
                            <div className="h-2 rounded bg-cyan-500/20 flex items-center px-1 text-[6px] font-bold text-cyan-600 dark:text-cyan-400">
                                ✓ Core Architecture
                            </div>
                            <div className="h-2 rounded bg-slate-100 dark:bg-white/5 flex items-center px-1 text-[6px] text-slate-500">
                                ✓ Real-time AI
                            </div>
                        </div>
                    )}

                    {slideType === 'market' && (
                        <div className="flex justify-between items-center text-[7px] font-extrabold">
                            <span className="text-violet-600 dark:text-violet-400">$200B+ TAM</span>
                            <span className="text-pink-600 dark:text-pink-400">35% CAGR</span>
                        </div>
                    )}

                    {slideType === 'business_model' && (
                        <div className="grid grid-cols-3 gap-1">
                            <div className="h-3 rounded bg-slate-100 dark:bg-white/5" />
                            <div className="h-3 rounded bg-violet-500/30 border border-violet-500" />
                            <div className="h-3 rounded bg-slate-100 dark:bg-white/5" />
                        </div>
                    )}

                    {slideType === 'traction' && (
                        <div className="grid grid-cols-2 gap-1 text-[6px] font-bold text-center">
                            <div className="bg-violet-500/15 text-violet-600 dark:text-violet-300 rounded py-0.5">99.4%</div>
                            <div className="bg-pink-500/15 text-pink-600 dark:text-pink-300 rounded py-0.5">10x Speed</div>
                        </div>
                    )}

                    {slideType === 'team' && (
                        <div className="grid grid-cols-2 gap-1">
                            <div className="h-3 rounded-full bg-cyan-500/20 border border-cyan-500/30" />
                            <div className="h-3 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30" />
                        </div>
                    )}

                    {slideType === 'ask' && (
                        <div className="text-center bg-gradient-to-r from-violet-500/20 to-pink-500/20 rounded py-0.5 font-extrabold text-[7px] text-pink-600 dark:text-pink-400">
                            ★ Key Takeaways
                        </div>
                    )}
                </div>
            </div>
        );
    };
    return parseHTMLStringsInReactTree(renderContent());
}

/* -------------------------------------------------------------------
 * DYNAMIC SLIDE RENDERER (8 Unique Layout Types for Each Slide)
 * ------------------------------------------------------------------- */

function DynamicSlideRenderer({ slide, slideIndex, isDarkMode }: { slide: SlideData; slideIndex: number; isDarkMode: boolean }) {
    const renderContent = () => {
        const slideType = slide.type || (
            slideIndex === 0 ? 'title' :
                slideIndex === 1 ? 'problem' :
                    slideIndex === 2 ? 'solution' :
                        slideIndex === 3 ? 'market' :
                            slideIndex === 4 ? 'business_model' :
                                slideIndex === 5 ? 'traction' :
                                    slideIndex === 6 ? 'team' : 'ask'
        );

        // LOADING SKELETON: Render shimmer loading animation for placeholder slides
        const isLoadingSlide = slide.badge === '⏳ GENERATING...' || slide.title?.startsWith('Creating Slide');
        if (isLoadingSlide) {
            return (
                <div className="h-full flex flex-col items-center justify-center gap-8 animate-pulse">
                    <div className="text-center space-y-5 w-full max-w-2xl">
                        {/* Badge shimmer */}
                        <div className="flex justify-center">
                            <div className="h-6 w-44 rounded-full bg-gradient-to-r from-violet-500/20 via-violet-500/40 to-violet-500/20 animate-shimmer" />
                        </div>
                        {/* Title shimmer */}
                        <div className="space-y-3">
                            <div className="h-10 w-[80%] mx-auto rounded-xl bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-white/10 dark:via-white/20 dark:to-white/10" />
                            <div className="h-10 w-[60%] mx-auto rounded-xl bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-white/10 dark:via-white/20 dark:to-white/10" />
                        </div>
                        {/* Subtitle shimmer */}
                        <div className="h-5 w-[70%] mx-auto rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-white/5 dark:via-white/10 dark:to-white/5" />
                    </div>

                    {/* Content cards shimmer */}
                    <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-3 bg-white/50 dark:bg-white/[0.03]"
                                style={{ animationDelay: `${i * 200}ms` }}
                            >
                                <div className="h-4 w-20 rounded bg-violet-500/15" />
                                <div className="h-3 w-full rounded bg-slate-200 dark:bg-white/10" />
                                <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-white/5" />
                            </div>
                        ))}
                    </div>

                    {/* Loading indicator */}
                    <div className="flex items-center gap-3 text-sm font-semibold text-violet-600 dark:text-violet-400">
                        <Loader2 size={18} className="animate-spin" />
                        <span>AI is generating Slide {slideIndex + 1}...</span>
                    </div>
                </div>
            );
        }

        // Determine layout variant (1, 2, or 3) based on slide contents so layout varies across slides and decks
        const variant = (function () {
            const seed = (slide.title || '') + (slide.badge || '') + String(slideIndex);
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                hash = seed.charCodeAt(i) + ((hash << 5) - hash);
            }
            return (Math.abs(hash) % 3) + 1; // 1, 2, or 3
        })();

        // ═══════════════════════════════════════════════════════════════
        // IMAGE LAYOUT: When a slide has an image, render a split layout
        // ═══════════════════════════════════════════════════════════════
        if (slide.image) {
            const isImageLeft = slide.layout === 'image-left';
            const isImageFull = slide.layout === 'image-full';

            if (isImageFull) {
                return (
                    <div className="relative h-full flex items-center justify-center">
                        <img
                            src={slide.image || "/1.jpg"}
                            alt={slide.title}
                            className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                if (!target.src.endsWith('/1.jpg')) {
                                    target.src = '/1.jpg';
                                } else {
                                    target.style.display = 'none';
                                }
                            }}
                        />
                        <div className="relative z-10 text-center space-y-4 p-8 bg-black/40 backdrop-blur-sm rounded-2xl max-w-2xl">
                            {slide.badge && (
                                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-widest text-white">
                                    <Sparkles size={14} className="text-amber-300" />
                                    <span>{slide.badge}</span>
                                </span>
                            )}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.05]">
                                {slide.title}
                            </h1>
                            {slide.subtitle && (
                                <p className="text-lg text-white/80 max-w-xl mx-auto leading-relaxed">
                                    {slide.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                );
            }

            const textContent = (
                <div className={`${isImageLeft ? 'lg:col-span-6' : 'lg:col-span-5'} space-y-5 flex flex-col justify-center`}>
                    {slide.badge && (
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300 w-fit">
                            <Sparkles size={14} className="text-pink-500" />
                            <span>{slide.badge}</span>
                        </span>
                    )}
                    <h1
                        className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08]"
                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                    >
                        {slide.title}
                    </h1>
                    {slide.subtitle && (
                        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-lg leading-relaxed font-medium">
                            {slide.subtitle}
                        </p>
                    )}
                    {(slide.metrics || slide.stats) && (
                        <div className="flex flex-wrap gap-3 pt-2">
                            {(slide.metrics || slide.stats || []).slice(0, 3).map((st: any, idx: number) => (
                                <div key={idx} className="px-3.5 py-2 rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-sm border border-slate-200/80 dark:border-white/10 shadow-sm">
                                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">{st.label}</div>
                                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">{st.value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {slide.points && (
                        <div className="space-y-2 pt-2">
                            {slide.points.map((pt: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                    <span>{pt}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {slide.cards && (
                        <div className="space-y-2 pt-2">
                            {slide.cards.slice(0, 2).map((cd: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{cd.title}</h3>
                                    {cd.description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{cd.description}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );

            const imageContent = (
                <div className={`${isImageLeft ? 'lg:col-span-6' : 'lg:col-span-7'} flex items-center justify-center`}>
                    <img
                        src={slide.image || "/1.jpg"}
                        alt={slide.title}
                        className="max-w-full max-h-[420px] w-auto h-auto object-contain rounded-2xl shadow-xl border border-slate-200/50 dark:border-white/10"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (!target.src.endsWith('/1.jpg')) {
                                target.src = '/1.jpg';
                            } else {
                                target.style.display = 'none';
                            }
                        }}
                    />
                </div>
            );

            return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                    {isImageLeft ? (
                        <>
                            {imageContent}
                            {textContent}
                        </>
                    ) : (
                        <>
                            {textContent}
                            {imageContent}
                        </>
                    )}
                </div>
            );
        }

        // LAYOUT 1: HERO TITLE SLIDE (Slide 1)
        if (slideType === 'title' || slideIndex === 0) {
            if (variant === 2) {
                // Variant 2: Centered Modern Glass
                return (
                    <div className="flex flex-col items-center justify-center text-center h-full max-w-4xl mx-auto space-y-6">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-600/10 to-pink-600/10 border border-violet-500/30 text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-300">
                            <Sparkles size={14} className="text-pink-500 animate-pulse" />
                            <span>{slide.badge || 'PRESENTATION OVERVIEW'}</span>
                        </span>
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05] bg-clip-text text-transparent bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600">
                            {slide.title}
                        </h1>
                        {slide.subtitle && (
                            <p className="text-lg text-slate-600 dark:text-slate-350 max-w-2xl mx-auto leading-relaxed">
                                {slide.subtitle}
                            </p>
                        )}
                        {(slide.metrics || slide.stats) && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-4">
                                {(slide.metrics || slide.stats || []).slice(0, 3).map((st: any, idx: number) => (
                                    <div key={idx} className="p-4 rounded-2xl bg-white/70 dark:bg-[#131B2E]/60 backdrop-blur-md border border-slate-200/80 dark:border-white/10 shadow-sm text-center">
                                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-1">{st.label}</div>
                                        <div className="text-lg font-black text-slate-900 dark:text-white">{st.value}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            } else if (variant === 3) {
                // Variant 3: Asymmetric Minimalist Accent
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                        <div className="lg:col-span-8 space-y-6 border-l-4 border-violet-600 pl-6">
                            <span className="text-xs font-mono font-bold tracking-widest text-violet-600 dark:text-cyan-400">
                            // {slide.badge || 'PRESENTATION OVERVIEW'}
                            </span>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                                {slide.title}
                            </h1>
                            {slide.subtitle && (
                                <p className="text-md sm:text-lg text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                                    {slide.subtitle}
                                </p>
                            )}
                        </div>
                        <div className="lg:col-span-4 space-y-3">
                            {(slide.metrics || slide.stats || []).slice(0, 3).map((st: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl bg-violet-500/5 dark:bg-white/[0.02] border border-violet-500/20 dark:border-white/5 shadow-inner">
                                    <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600">{st.value}</div>
                                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-1">{st.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Default / Variant 1: Split Hero
            return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                    <div className="lg:col-span-7 space-y-6">
                        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                            <Sparkles size={14} className="text-pink-500" />
                            <span>{slide.badge || 'PRESENTATION OVERVIEW'}</span>
                        </span>

                        <h1
                            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1]"
                            style={{ fontFamily: '"DM Sans", sans-serif' }}
                        >
                            {slide.title}
                        </h1>

                        {slide.subtitle && (
                            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                                {slide.subtitle}
                            </p>
                        )}

                        <div className="flex flex-wrap gap-3 pt-2">
                            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 shadow-sm font-semibold">
                                <CheckCircle2 size={16} className="text-emerald-500" /> 16:9 Widescreen Layout
                            </div>
                            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 shadow-sm font-semibold">
                                <CheckCircle2 size={16} className="text-emerald-500" /> Native PPTX Export
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <div className="relative rounded-2xl bg-white dark:bg-[#131B2E] border border-violet-500/30 p-6 shadow-lg space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">slide.ai-presentation.com</span>
                            </div>

                            {(slide.metrics || slide.stats) && (
                                <div className="space-y-3 pt-1">
                                    {(slide.metrics || slide.stats || []).slice(0, 3).map((st: any, idx: number) => (
                                        <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/10 flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{st.label}</span>
                                            <span className="text-sm font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600">{st.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // LAYOUT 2: PROBLEM & CHALLENGES LAYOUT (Slide 2)
        if (slideType === 'problem' || slideIndex === 1) {
            if (variant === 2) {
                // Variant 2: Warning Highlight Left
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                        <div className="lg:col-span-5 space-y-4">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                {slide.badge || 'KEY CHALLENGES'}
                            </span>
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">{slide.title}</h2>
                            {slide.subtitle && <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed">{slide.subtitle}</p>}
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                                ⚠️ Critical constraints and performance overhead limit scale across traditional workflows.
                            </div>
                        </div>
                        <div className="lg:col-span-7 space-y-4">
                            {(slide.cards || []).slice(0, 3).map((cd: any, idx: number) => (
                                <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md transition">
                                    <div className="w-8 h-8 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 font-bold text-sm flex-shrink-0">
                                        !
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{cd.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{cd.description || cd.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } else if (variant === 3) {
                // Variant 3: Linear Stream List
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center max-w-4xl mx-auto">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-mono font-bold tracking-widest text-rose-500 uppercase">{slide.badge || 'KEY CHALLENGES'}</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                            {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{slide.subtitle}</p>}
                        </div>
                        <div className="space-y-3">
                            {(slide.cards || []).slice(0, 3).map((cd: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#131B2E]/40 border border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-4 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="text-sm font-mono text-rose-500/50 font-bold">0{idx + 1}.</div>
                                        <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{cd.title}</div>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 text-right max-w-md">{cd.description || cd.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Default / Variant 1: 3 Column Grid
            return (
                <div className="space-y-8 h-full flex flex-col justify-center">
                    <div>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            {slide.badge || 'KEY CHALLENGES'}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">{slide.title}</h2>
                        {slide.subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-2 leading-relaxed">{slide.subtitle}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(slide.cards || [
                            { title: 'Operational Overhead', description: 'Manual workflows cause high labor costs and processing delays.' },
                            { title: 'Scalability Barriers', description: 'Legacy tools struggle to handle rapid data volume expansion.' },
                            { title: 'Integration Complexity', description: 'Fragmented tech stacks create data silos and security risks.' }
                        ]).map((cd: any, idx: number) => (
                            <div key={idx} className="rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 p-6 space-y-4 shadow-sm hover:shadow-md transition">
                                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 font-bold text-lg">
                                    0{idx + 1}
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cd.title}</h3>
                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{cd.description || cd.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // LAYOUT 3: SOLUTION & INNOVATION LAYOUT (Slide 3)
        if (slideType === 'solution' || slideIndex === 2) {
            if (variant === 2) {
                // Variant 2: Two-Column Clean Grid
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center max-w-5xl mx-auto">
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                                {slide.badge || 'SOLUTION & INNOVATION'}
                            </span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{slide.title}</h2>
                            {slide.subtitle && <p className="text-sm text-slate-600 dark:text-slate-350 mt-1 max-w-xl">{slide.subtitle}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(slide.points || []).map((pt: string, idx: number) => (
                                <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 shadow-sm flex items-start gap-3">
                                    <div className="mt-0.5 p-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex-shrink-0">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Core Principle {idx + 1}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{pt}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } else if (variant === 3) {
                // Variant 3: Glass Pillars
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase">{slide.badge || 'SOLUTION & INNOVATION'}</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                            {slide.subtitle && <p className="text-xs text-slate-550 dark:text-slate-400 max-w-xl mx-auto">{slide.subtitle}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(slide.points || []).slice(0, 3).map((pt: string, idx: number) => (
                                <div key={idx} className="p-6 rounded-2xl bg-gradient-to-b from-white to-slate-50 dark:from-[#131B2E] dark:to-[#0C1220] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between h-40">
                                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-500">
                                        <Sparkles size={18} />
                                    </div>
                                    <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-350 leading-relaxed">{pt}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Default / Variant 1: Left split text, right engine panel
            return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                    <div className="lg:col-span-6 space-y-6">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            {slide.badge || 'SOLUTION & INNOVATION'}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                        {slide.subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{slide.subtitle}</p>}

                        <div className="space-y-3 pt-2">
                            {(slide.points || [
                                'Sub-second automated data processing & AI execution',
                                'Self-attention mechanisms and long-range dependency modeling',
                                'Seamless REST & GraphQL API integrations across enterprise tools'
                            ]).map((pt: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-sm">
                                    <CheckCircle2 size={18} className="text-emerald-500 flex-shrink-0" />
                                    <span>{pt}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-6 flex justify-center">
                        <div className="w-full rounded-2xl bg-white dark:bg-[#131B2E] border border-cyan-500/30 p-6 shadow-lg space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">Core Engine Architecture</span>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white font-bold">Verified</span>
                            </div>
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#090D16] border border-slate-200 dark:border-white/10 space-y-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                                <div>✓ Autonomous Processing: Active</div>
                                <div>✓ Real-time Scaling: Sub-second</div>
                                <div>✓ Multi-modal Support: Enabled</div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // LAYOUT 4: MARKET & INDUSTRY OPPORTUNITY (Slide 4)
        if (slideType === 'market' || slideIndex === 3) {
            if (variant === 2) {
                // Variant 2: Split Stat Hero
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                        <div className="lg:col-span-5 space-y-4">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                                {slide.badge || 'MARKET OPPORTUNITY'}
                            </span>
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">{slide.title}</h2>
                            {slide.subtitle && <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed">{slide.subtitle}</p>}
                        </div>
                        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(slide.stats || []).map((st: any, idx: number) => (
                                <div key={idx} className={`p-6 rounded-3xl border shadow-sm space-y-2 ${idx === 0
                                        ? 'sm:col-span-2 bg-gradient-to-r from-violet-600 to-pink-600 text-white border-transparent'
                                        : 'bg-white dark:bg-[#131B2E] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
                                    }`}>
                                    <div className={`text-4xl font-black ${idx === 0 ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600'}`}>{st.value}</div>
                                    <div className={`text-sm font-bold ${idx === 0 ? 'text-white/90' : 'text-slate-800 dark:text-slate-200'}`}>{st.label}</div>
                                    {st.desc && <div className={`text-xs ${idx === 0 ? 'text-white/85 font-semibold' : 'text-slate-400 dark:text-slate-500'}`}>{st.desc}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } else if (variant === 3) {
                // Variant 3: Horizontal Stats Bar
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center max-w-4xl mx-auto">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-mono font-bold tracking-widest text-purple-500 uppercase">{slide.badge || 'MARKET OPPORTUNITY'}</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                            {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{slide.subtitle}</p>}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-6 rounded-2xl bg-slate-50 dark:bg-[#131B2E]/30 border border-slate-200 dark:border-white/10 shadow-inner">
                            {(slide.stats || []).map((st: any, idx: number) => (
                                <div key={idx} className="flex-1 text-center space-y-1">
                                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600">{st.value}</div>
                                    <div className="text-xs font-bold text-slate-850 dark:text-slate-200">{st.label}</div>
                                    {st.desc && <div className="text-[10px] text-slate-400 dark:text-slate-500">{st.desc}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Default / Variant 1: 3 column stat grid
            return (
                <div className="space-y-8 h-full flex flex-col justify-center">
                    <div>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                            {slide.badge || 'MARKET OPPORTUNITY'}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">{slide.title}</h2>
                        {slide.subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-2 leading-relaxed">{slide.subtitle}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(slide.stats || [
                            { value: '$200B+', label: 'Total Addressable Market (TAM)', desc: 'Global industry opportunity' },
                            { value: '35%+', label: 'Annual CAGR Growth', desc: 'Accelerating market expansion' },
                            { value: '85%', label: 'Enterprise Penetration', desc: 'Target sector adoption' }
                        ]).map((st: any, idx: number) => (
                            <div key={idx} className="rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 p-6 space-y-3 shadow-sm">
                                <div className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600">
                                    {st.value}
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{st.label}</div>
                                {st.desc && <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{st.desc}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // LAYOUT 5: STRATEGY & TIERS (Slide 5)
        if (slideType === 'business_model' || slideIndex === 4) {
            if (variant === 2) {
                // Variant 2: Horizontal Phase Progress
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center">
                        <div className="text-center space-y-2">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-500/10 text-pink-600 dark:text-pink-300 border border-pink-500/20">
                                {slide.badge || 'ARCHITECTURE & TIERS'}
                            </span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                            {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-455">{slide.subtitle}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                            {(slide.tiers || []).map((tr: any, idx: number) => (
                                <div key={idx} className="relative p-6 rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                                    {idx < 2 && (
                                        <div className="hidden md:block absolute top-1/2 -right-4 -translate-y-1/2 z-10 text-slate-300 dark:text-white/20">
                                            <ArrowRight size={24} />
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        <div className="text-xs font-mono font-bold tracking-widest text-violet-600 dark:text-cyan-405">PHASE 0{idx + 1}</div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tr.name}</h3>
                                        <div className="text-xl font-extrabold text-pink-500">{tr.price}</div>
                                        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                                            {(tr.features || []).slice(0, 2).map((ft: string, fIdx: number) => (
                                                <div key={fIdx} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <span>•</span> <span>{ft}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } else if (variant === 3) {
                // Variant 3: Vertical Accent Rows
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center max-w-4xl mx-auto">
                        <div>
                            <span className="text-xs font-mono font-bold tracking-widest text-pink-500 uppercase">{slide.badge || 'ARCHITECTURE & TIERS'}</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{slide.title}</h2>
                            {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{slide.subtitle}</p>}
                        </div>
                        <div className="space-y-3">
                            {(slide.tiers || []).map((tr: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 text-pink-500 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-250 font-semibold">{tr.name}</div>
                                            <div className="text-xs text-violet-500 dark:text-pink-400 font-semibold">{tr.price}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {(tr.features || []).slice(0, 2).map((ft: string, fIdx: number) => (
                                            <span key={fIdx} className="text-[10px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-semibold">✓ {ft}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Default / Variant 1: standard pricing tiers
            return (
                <div className="space-y-6 h-full flex flex-col justify-center">
                    <div className="text-center max-w-2xl mx-auto">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-pink-500/10 text-pink-600 dark:text-pink-300 border border-pink-500/20">
                            {slide.badge || 'ARCHITECTURE & TIERS'}
                        </span>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{slide.title}</h2>
                        {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{slide.subtitle}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {(slide.tiers || [
                            { name: 'Phase 1: Foundation', price: 'Starter', features: ['Core framework setup', 'Initial pilot deployment'] },
                            { name: 'Phase 2: Scale', price: 'Growth', features: ['Full pipeline integration', '24/7 SLAs & support'], popular: true },
                            { name: 'Phase 3: Enterprise', price: 'Full Suite', features: ['Custom model fine-tuning', 'Global edge deployment'] }
                        ]).map((tr: any, idx: number) => (
                            <div
                                key={idx}
                                className={`relative rounded-2xl p-6 flex flex-col justify-between transition ${tr.popular
                                    ? 'bg-white dark:bg-[#1C1638] border-2 border-violet-500 shadow-xl scale-105'
                                    : 'bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 shadow-sm'
                                    }`}
                            >
                                {tr.popular && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-[10px] font-bold text-white tracking-wider uppercase">
                                        Recommended
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{tr.name}</h3>
                                    <div className="text-2xl font-extrabold text-violet-600 dark:text-pink-400">{tr.price}</div>
                                    {tr.features && (
                                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/10">
                                            {tr.features.map((ft: string, fIdx: number) => (
                                                <div key={fIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                                                    <span>{ft}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // LAYOUT 6: TRACTION & METRICS (Slide 6)
        if (slideType === 'traction' || slideIndex === 5) {
            if (variant === 2) {
                // Variant 2: Left Hero Stat, Right Stack Rows
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                        <div className="lg:col-span-5 space-y-4">
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                                {slide.badge || 'PERFORMANCE METRICS'}
                            </span>
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">{slide.title}</h2>
                            {slide.subtitle && <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed">{slide.subtitle}</p>}
                        </div>
                        <div className="lg:col-span-7 space-y-4">
                            {(slide.stats || []).map((st: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-between">
                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{st.label}</span>
                                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-pink-600">{st.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } else if (variant === 3) {
                // Variant 3: Clean Grid Highlight Cards
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center max-w-4xl mx-auto">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-mono font-bold tracking-widest text-violet-500 uppercase">{slide.badge || 'PERFORMANCE METRICS'}</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                            {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{slide.subtitle}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(slide.stats || []).map((st: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-[#131B2E]/30 border border-slate-200 dark:border-white/10 flex items-center gap-4 shadow-sm">
                                    <div className="text-3xl font-black text-violet-600 dark:text-pink-500">{st.value}</div>
                                    <div className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-bold">{st.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Default / Variant 1: standard 4-grid stats
            return (
                <div className="space-y-8 h-full flex flex-col justify-center">
                    <div>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-violet-500/10 text-violet-600 dark:text-violet-300 border border-violet-500/20">
                            {slide.badge || 'PERFORMANCE METRICS'}
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mt-2">{slide.title}</h2>
                        {slide.subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-2 leading-relaxed">{slide.subtitle}</p>}
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                        {(slide.stats || [
                            { value: '99.4%', label: 'Model Accuracy' },
                            { value: '10x', label: 'Processing Speedup' },
                            { value: '60%', label: 'Cost Reduction' },
                            { value: '24/7', label: 'Automated SLA' }
                        ]).map((st: any, idx: number) => (
                            <div key={idx} className="rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 p-6 space-y-2 shadow-sm">
                                <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600">
                                    {st.value}
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-white">{st.label}</div>
                                {st.desc && <div className="text-xs text-slate-500 dark:text-slate-400">{st.desc}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // LAYOUT 7: TEAM & MILESTONES (Slide 7)
        if (slideType === 'team' || slideIndex === 6) {
            if (variant === 2) {
                // Variant 2: Vertical Connect Timeline
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center max-w-3xl mx-auto">
                        <div>
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/20">
                                {slide.badge || 'ROADMAP & MILESTONES'}
                            </span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{slide.title}</h2>
                            {slide.subtitle && <p className="text-sm text-slate-600 dark:text-slate-350 mt-1">{slide.subtitle}</p>}
                        </div>
                        <div className="relative border-l border-slate-200 dark:border-white/10 pl-6 ml-4 space-y-6">
                            {(slide.cards || []).slice(0, 2).map((cd: any, idx: number) => (
                                <div key={idx} className="relative">
                                    {/* Timeline bullet dot */}
                                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 border-4 border-white dark:border-[#090D16]" />
                                    <div className="space-y-1">
                                        <div className="text-xs font-bold text-cyan-600 dark:text-cyan-405">{cd.role || 'Milestone Target'}</div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{cd.title}</h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{cd.description || cd.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            } else if (variant === 3) {
                // Variant 3: Side-by-Side Modern Blocks
                return (
                    <div className="space-y-6 h-full flex flex-col justify-center">
                        <div className="text-center space-y-2">
                            <span className="text-xs font-mono font-bold tracking-widest text-fuchsia-500 uppercase">{slide.badge || 'ROADMAP & MILESTONES'}</span>
                            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                            {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{slide.subtitle}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(slide.cards || []).slice(0, 2).map((cd: any, idx: number) => (
                                <div key={idx} className="p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50 dark:from-[#131B2E] dark:to-[#0B111E] border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                                    <div className="text-xs font-bold px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 w-fit">{cd.role || 'Milestone'}</div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cd.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{cd.description || cd.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }

            // Default / Variant 1: standard 2 horizontal milestone cards
            return (
                <div className="space-y-6 h-full flex flex-col justify-center">
                    <div>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/20">
                            {slide.badge || 'ROADMAP & MILESTONES'}
                        </span>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{slide.title}</h2>
                        {slide.subtitle && <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl mt-2 leading-relaxed">{slide.subtitle}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(slide.cards || [
                            { title: 'Near-Term Phase', role: 'Q3 Milestone', description: 'Expanding core architecture & real-time streaming pipeline.' },
                            { title: 'Long-Term Vision', role: 'Q4 Milestone', description: 'Global ecosystem scaling & multi-agent orchestration.' }
                        ]).map((cd: any, idx: number) => (
                            <div key={idx} className="rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 p-6 flex items-start gap-4 shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-pink-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                    0{idx + 1}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cd.title}</h3>
                                    {cd.role && <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{cd.role}</div>}
                                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-1">{cd.description || cd.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // LAYOUT 8: CALL TO ACTION & SUMMARY (Slide 8)
        if (variant === 2) {
            // Variant 2: Left Hero Side, Right Points Stack
            return (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center h-full">
                    <div className="lg:col-span-5 space-y-4">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-bold text-pink-600 dark:text-pink-300">
                            <Sparkles size={14} /> {slide.badge || 'SUMMARY & TAKEAWAYS'}
                        </span>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">{slide.title}</h2>
                        {slide.subtitle && <p className="text-sm text-slate-650 dark:text-slate-355 leading-relaxed">{slide.subtitle}</p>}
                    </div>
                    <div className="lg:col-span-7 space-y-3">
                        {(slide.points || []).map((pt: string, idx: number) => (
                            <div key={idx} className="p-3.5 rounded-2xl bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-white/10 shadow-sm flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs flex-shrink-0">✓</div>
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">{pt}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        } else if (variant === 3) {
            // Variant 3: Horizontal Takeaway Columns
            return (
                <div className="space-y-6 h-full flex flex-col justify-center max-w-4xl mx-auto">
                    <div className="text-center space-y-2">
                        <span className="text-xs font-mono font-bold tracking-widest text-pink-500 uppercase">{slide.badge || 'SUMMARY & TAKEAWAYS'}</span>
                        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{slide.title}</h2>
                        {slide.subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">{slide.subtitle}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(slide.points || []).slice(0, 3).map((pt: string, idx: number) => (
                            <div key={idx} className="p-5 rounded-2xl bg-slate-50 dark:bg-[#131B2E]/40 border border-slate-200 dark:border-white/5 flex flex-col justify-between h-36">
                                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">✓</div>
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-305 leading-relaxed">{pt}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Default / Variant 1: standard centered Glass CTA block
        return (
            <div className="h-full flex items-center justify-center">
                <div className="w-full max-w-3xl rounded-3xl bg-white dark:bg-gradient-to-b dark:from-[#1C1538] dark:to-[#131B2E] border-2 border-violet-500/40 p-8 md:p-12 text-center space-y-6 shadow-xl relative overflow-hidden">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-xs font-bold text-pink-600 dark:text-pink-300">
                        <Sparkles size={14} /> {slide.badge || 'SUMMARY & TAKEAWAYS'}
                    </span>

                    <h2
                        className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight"
                        style={{ fontFamily: '"DM Sans", sans-serif' }}
                    >
                        {slide.title}
                    </h2>

                    {slide.subtitle && (
                        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
                            {slide.subtitle}
                        </p>
                    )}

                    {slide.points && slide.points.length > 0 && (
                        <div className="space-y-2 max-w-xl mx-auto text-left">
                            {slide.points.map((pt: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                    <span>{pt}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    return parseHTMLStringsInReactTree(renderContent());
}

export default PresentationDeck;
