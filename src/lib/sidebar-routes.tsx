
import {
    MessageSquare,
    PenTool,
    Code,
    FileText,
    Mail,
    Image,
    Database,
    CheckSquare,
    Menu,
    X,
    Sparkles,
    Languages,
    BookOpen,
    Brain,
    FileUser,
    Share2,
    ChefHat,
    PiggyBank,
    Calendar,
    Heart,
    Users,
    FileEdit,
    ImageIcon,
    Bot,
    LayoutDashboard,
    Gamepad2,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Crown,
    Zap,
    Settings,
    HelpCircle,
    Globe,
    Mic,
    Video,
    FileSearch,
    Briefcase,
    GraduationCap,
    Lightbulb,
    TrendingUp,
    ShieldCheck,
    Palette,
    Search,
    Shield,
    Newspaper,
    FileType,
    Hash,
    Target,
    BarChart3,
    DollarSign,
    ClipboardList,
    FileCheck,
    Bug,
    GitBranch,
    Terminal,
    TestTube,
    BookMarked,
    FlaskConical,
    History,
    Film,
    Feather,
    Music,
    Laugh,
    Quote,
    Tag,
    ScrollText,
    Cookie,
    Scale,
    FileWarning,
    Receipt,
    Link2,
    Layout,
    Compass,
    NotebookPen,
    ThumbsUp,
    Star,
    Focus,
    Moon,
    Flame,
    Eye,
    Cpu,
    FileSpreadsheet,
    Gauge,
    Type,
    ScanEye,
    LayoutTemplate,
    RefreshCw,
    ArrowLeftRight,
    UserCircle,
    CreditCard,
    Presentation,
    ListChecks,
    Clock,
    Container,
    FileKey,
    TableProperties,
    BookA,
    Swords,
    Activity,
    Apple,
    Dumbbell,
    HeartHandshake,
    Handshake,
    Megaphone,
    Youtube,
    type LucideIcon,
    Phone,
    CandlestickChart,
    Instagram,
    Facebook,
} from "lucide-react";

// Navigation structure
export interface NavItem {
    id: string;
    title: string;
    url: string;
    icon: LucideIcon;
    isNew?: boolean;
    isPro?: boolean;
    isComingSoon?: boolean;
}

export interface NavCategory {
    id: string;
    title: string;
    icon: LucideIcon;
    items: NavItem[];
}

// Build navigation from features
export const navigationCategories: NavCategory[] = [
    {
        id: "main",
        title: "Main",
        icon: LayoutDashboard,
        items: [
            { id: "dashboard", title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        ],
    },
    {
        id: "ai-marketing",
        title: "AI Marketing",
        icon: Megaphone,
        items: [
            { id: "marketing-dashboard", title: "Marketing Studio", url: "/ai-marketing", icon: Megaphone },
            { id: "marketing-image", title: "Image Generator", url: "/ai-marketing/image-generator", icon: ImageIcon, isNew: true },
            { id: "marketing-video", title: "Video Generator", url: "/ai-marketing/video-generator", icon: Video, isNew: true },
            { id: "reel-generator", title: "Reels Generator", url: "/ai-marketing/reel-generator", icon: Film, isNew: true },
            { id: "avatar-studio", title: "Avatar Generator", url: "/ai-marketing/avatar-studio", icon: UserCircle, isNew: true },
            { id: "logo-generator", title: "Logo Generator", url: "/ai-marketing/logo-generator", icon: Palette, isNew: true },
            { id: "manga-generator", title: "Manga Generator", url: "/ai-marketing/manga-generator", icon: ScrollText, isNew: true },
            { id: "thumbnail-maker", title: "Thumbnail Maker", url: "/ai-marketing/youtube-thumbnail", icon: Youtube, isNew: true },
            { id: "flyer-designer", title: "Flyer Designer", url: "/ai-marketing/flyer-designer", icon: ImageIcon, isNew: true },
            { id: "business-card-designer", title: "Business Card Designer", url: "/ai-marketing/business-card-designer", icon: Palette, isNew: true },
            { id: "brochure-designer", title: "Brochure Designer", url: "/ai-marketing/brochure-designer", icon: ScrollText, isNew: true },
        ],
    },
    {
        id: "core",
        title: "Core Tools",
        icon: Sparkles,
        items: [
            { id: "website", title: "Website Builder", url: "/website", icon: Globe, isNew: true },
            { id: "pitch-deck", title: "Pitch Deck", url: "/pitch-deck", icon: Presentation, isNew: true },
            { id: "browser-control", title: "Browser Control", url: "/browser-control", icon: Globe, isNew: true, isPro: true },
            { id: "voice-agent", title: "AI Voice Agent", url: "/voice-agent", icon: Phone, isNew: true },
            { id: "music-generator", title: "Music Generator", url: "/music-generator", icon: Music, isNew: true },
            { id: "support-agent", title: "Live Chat", url: "/support-agent", icon: HelpCircle, isNew: true },
            { id: "ai-meeting", title: "AI Meeting", url: "/ai-meeting", icon: Presentation, isNew: true },
            { id: "game-maker", title: "Game Developer", url: "/game-maker", icon: Gamepad2, isNew: true },
            { id: "chat", title: "AI Chat", url: "/chat", icon: MessageSquare },
            { id: "code", title: "Code Generator", url: "/code", icon: Code },
            { id: "translator", title: "Translation Hub", url: "/translator", icon: Languages },
            { id: "website-wiki", title: "Website Wiki", url: "/website-wiki", icon: BookMarked, isNew: true },
        ],
    },
    {
        id: "social-auto-reply",
        title: "Social Media auto reply",
        icon: Share2,
        items: [
            { id: "whatsapp-agent", title: "WhatsApp Agent", url: "/social/whatsapp", icon: MessageSquare, isNew: true },
            { id: "instagram-agent", title: "Instagram Agent", url: "/social/instagram", icon: Instagram, isNew: true, isComingSoon: true },
            { id: "facebook-agent", title: "Facebook Agent", url: "/social/facebook", icon: Facebook, isNew: true, isComingSoon: true },
        ],
    },
    {
        id: "trading",
        title: "Trading & Markets",
        icon: CandlestickChart,
        items: [
            { id: "trading-terminal", title: "Trading Terminal", url: "/trading", icon: CandlestickChart, isNew: true },
        ],
    },
    {
        id: "writing",
        title: "Writing",
        icon: PenTool,
        items: [
            { id: "writer", title: "Content Writer", url: "/writer", icon: PenTool },
            { id: "blog-post", title: "Blog Post", url: "/blog-post", icon: Newspaper, isNew: true },
            { id: "article-writer", title: "Article Writer", url: "/article-writer", icon: FileText, isNew: true },
            { id: "summary", title: "Summarizer", url: "/summary", icon: FileText },
            { id: "headline-generator", title: "Headlines", url: "/headline-generator", icon: Zap, isNew: true },
            { id: "content-improver", title: "Content Improver", url: "/content-improver", icon: Sparkles, isNew: true },
            { id: "story", title: "Story Writer", url: "/story", icon: BookOpen },
            { id: "poem-generator", title: "Poem Generator", url: "/poem-generator", icon: Feather, isNew: true },
            { id: "grammar", title: "Grammar Check", url: "/grammar", icon: CheckSquare },
            { id: "paraphraser", title: "Paraphraser", url: "/paraphraser", icon: RefreshCw, isNew: true },
            { id: "tone-converter", title: "Tone Converter", url: "/tone-converter", icon: ArrowLeftRight, isNew: true },
        ],
    },
    {
        id: "social",
        title: "Social Media",
        icon: Share2,
        items: [
            { id: "social", title: "Social Suite", url: "/social", icon: Share2 },
            { id: "instagram-caption", title: "Instagram", url: "/instagram-caption", icon: ImageIcon, isNew: true },
            { id: "twitter-thread", title: "Twitter/X Thread", url: "/twitter-thread", icon: MessageSquare, isNew: true },
            { id: "linkedin-post", title: "LinkedIn", url: "/linkedin-post", icon: Briefcase, isNew: true },
            { id: "youtube-description", title: "YouTube", url: "/youtube-description", icon: Video, isNew: true },
            { id: "hashtag-generator", title: "Hashtags", url: "/hashtag-generator", icon: Hash, isNew: true },
            { id: "content-calendar", title: "Content Calendar", url: "/content-calendar", icon: Calendar, isNew: true },
        ],
    },
    {
        id: "marketing",
        title: "Marketing",
        icon: TrendingUp,
        items: [
            { id: "email", title: "Email Assistant", url: "/email", icon: Mail },
            { id: "google-ads", title: "Google Ads", url: "/google-ads", icon: Target, isNew: true },
            { id: "facebook-ads", title: "Facebook Ads", url: "/facebook-ads", icon: Target, isNew: true },
            { id: "landing-page-copy", title: "Landing Page", url: "/landing-page", icon: Layout, isNew: true },
            { id: "sales-pitch", title: "Sales Pitch", url: "/sales-pitch", icon: DollarSign, isNew: true },
            { id: "marketing-plan", title: "Marketing Plan", url: "/marketing-plan", icon: BarChart3, isNew: true },
            { id: "competitor-analysis", title: "Competitor Analysis", url: "/competitor-analysis", icon: Search, isNew: true },
            { id: "ab-test-copy", title: "A/B Test Copy", url: "/ab-test-copy", icon: FlaskConical, isNew: true },
            { id: "buyer-persona", title: "Buyer Persona", url: "/buyer-persona", icon: UserCircle, isNew: true },
            { id: "pricing-page-copy", title: "Pricing Page Copy", url: "/pricing-page-copy", icon: CreditCard, isNew: true },
        ],
    },
    {
        id: "business",
        title: "Business",
        icon: Briefcase,
        items: [
            { id: "business-plan", title: "Business Plan", url: "/business-plan", icon: Briefcase, isNew: true },
            { id: "meeting", title: "Meeting Notes", url: "/meeting", icon: Calendar },
            { id: "job-description", title: "Job Description", url: "/job-description", icon: Users, isNew: true },
            { id: "resume", title: "Resume Builder", url: "/resume", icon: FileUser },
            { id: "interview", title: "Interview Prep", url: "/interview", icon: Users },
            { id: "finance", title: "Finance Helper", url: "/finance", icon: PiggyBank },
            { id: "contract-generator", title: "Contracts", url: "/contract-generator", icon: FileCheck, isNew: true, isPro: true },
            { id: "swot-analysis", title: "SWOT Analysis", url: "/swot-analysis", icon: Target, isNew: true },
            { id: "invoice-memo", title: "Invoice Memo", url: "/invoice-memo", icon: Receipt, isNew: true },
            { id: "onboarding-checklist", title: "Onboarding Checklist", url: "/onboarding-checklist", icon: ListChecks, isNew: true },
        ],
    },
    {
        id: "development",
        title: "Development",
        icon: Code,
        items: [
            { id: "sql", title: "SQL Builder", url: "/sql", icon: Database },
            { id: "bug-fix", title: "Bug Fix", url: "/bug-fix", icon: Bug, isNew: true },
            { id: "code-reviewer", title: "Code Review", url: "/code-reviewer", icon: Eye, isNew: true },
            { id: "api-docs", title: "API Docs", url: "/api-docs", icon: FileText, isNew: true },
            { id: "readme-generator", title: "README", url: "/readme-generator", icon: FileText, isNew: true },
            { id: "regex-generator", title: "Regex", url: "/regex-generator", icon: Code, isNew: true },
            { id: "unit-test", title: "Unit Tests", url: "/unit-test", icon: TestTube, isNew: true },
            { id: "ocr", title: "OCR Tool", url: "/ocr", icon: FileSearch },
            { id: "cron-expression", title: "Cron Builder", url: "/cron-expression", icon: Clock, isNew: true },
            { id: "docker-compose", title: "Docker Compose", url: "/docker-compose", icon: Container, isNew: true },
            { id: "env-template", title: ".env Template", url: "/env-template", icon: FileKey, isNew: true },
            { id: "gitignore-generator", title: "Git Ignore", url: "/gitignore-generator", icon: GitBranch, isNew: true },
        ],
    },
    {
        id: "education",
        title: "Education",
        icon: GraduationCap,
        items: [
            { id: "quiz", title: "Quiz Generator", url: "/quiz", icon: GraduationCap },
            { id: "lesson-plan", title: "Lesson Plan", url: "/lesson-plan", icon: BookMarked, isNew: true },
            { id: "study-guide", title: "Study Guide", url: "/study-guide", icon: BookOpen, isNew: true },
            { id: "flashcard-generator", title: "Flashcards", url: "/flashcard-generator", icon: FileEdit, isNew: true },
            { id: "math-solver", title: "Math Solver", url: "/math-solver", icon: Cpu, isNew: true },
            { id: "rubric-generator", title: "Rubric Generator", url: "/rubric-generator", icon: TableProperties, isNew: true },
            { id: "vocabulary-builder", title: "Vocabulary Builder", url: "/vocabulary-builder", icon: BookA, isNew: true },
            { id: "debate-prep", title: "Debate Prep", url: "/debate-prep", icon: Swords, isNew: true },
        ],
    },
    {
        id: "creative",
        title: "Creative",
        icon: Palette,
        items: [
            { id: "recipe", title: "Recipe Generator", url: "/recipe", icon: ChefHat },
            { id: "story-ideas", title: "Story Ideas", url: "/story-ideas", icon: Lightbulb, isNew: true },
            { id: "character-creator", title: "Characters", url: "/character-creator", icon: Users, isNew: true },
            { id: "song-lyrics", title: "Song Lyrics", url: "/song-lyrics", icon: Music, isNew: true },
            { id: "joke-generator", title: "Jokes", url: "/joke-generator", icon: Laugh, isNew: true },
            { id: "name-generator", title: "Name Generator", url: "/name-generator", icon: Tag, isNew: true },
        ],
    },
    {
        id: "legal",
        title: "Legal",
        icon: Shield,
        items: [
            { id: "privacy-policy", title: "Privacy Policy", url: "/privacy-policy", icon: Shield, isNew: true, isPro: true },
            { id: "terms-of-service", title: "Terms of Service", url: "/terms-of-service", icon: ScrollText, isNew: true, isPro: true },
            { id: "disclaimer-generator", title: "Disclaimer", url: "/disclaimer-generator", icon: FileWarning, isNew: true },
            { id: "refund-policy", title: "Refund Policy", url: "/refund-policy", icon: Receipt, isNew: true },
        ],
    },
    {
        id: "seo",
        title: "SEO",
        icon: Search,
        items: [
            { id: "meta-description", title: "Meta Description", url: "/meta-description", icon: FileText, isNew: true },
            { id: "keyword-research", title: "Keywords", url: "/keyword-research", icon: Search, isNew: true },
            { id: "seo-audit", title: "SEO Audit", url: "/seo-audit", icon: Search, isNew: true },
            { id: "schema-markup", title: "Schema Markup", url: "/schema-markup", icon: Code, isNew: true },
        ],
    },
    {
        id: "personal",
        title: "Personal",
        icon: Heart,
        items: [
            { id: "sentiment", title: "Sentiment Analysis", url: "/sentiment", icon: Heart },
            { id: "journal-prompt", title: "Journal Prompts", url: "/journal-prompt", icon: NotebookPen, isNew: true },
            { id: "goal-setting", title: "Goal Setting", url: "/goal-setting", icon: Target, isNew: true },
            { id: "motivation-booster", title: "Motivation", url: "/motivation-booster", icon: Flame, isNew: true },
        ],
    },
    {
        id: "agents",
        title: "AI Agents",
        icon: Bot,
        items: [
            { id: "research-agent", title: "Research Agent", url: "/research-agent", icon: Search, isNew: true, isPro: true },
            { id: "writing-agent", title: "Writing Agent", url: "/writing-agent", icon: PenTool, isNew: true, isPro: true },
            { id: "code-agent", title: "Code Agent", url: "/code-agent", icon: Code, isNew: true, isPro: true },
            { id: "marketing-agent", title: "Marketing Agent", url: "/marketing-agent", icon: TrendingUp, isNew: true, isPro: true },
        ],
    },
    {
        id: "data-analytics",
        title: "Data & Analytics",
        icon: BarChart3,
        items: [
            { id: "data-visualizer", title: "Data Visualizer", url: "/data-visualizer", icon: BarChart3, isNew: true },
            { id: "csv-analyzer", title: "CSV Analyzer", url: "/csv-analyzer", icon: FileSpreadsheet, isNew: true },
            { id: "survey-builder", title: "Survey Builder", url: "/survey-builder", icon: ClipboardList, isNew: true },
            { id: "kpi-dashboard", title: "KPI Dashboard", url: "/kpi-dashboard", icon: Gauge, isNew: true },
        ],
    },
    {
        id: "design-ux",
        title: "Design & UX",
        icon: Palette,
        items: [
            { id: "color-palette", title: "Color Palette", url: "/color-palette", icon: Palette, isNew: true },
            { id: "ui-copy-writer", title: "UI Copy Writer", url: "/ui-copy-writer", icon: Type, isNew: true },
            { id: "accessibility-checker", title: "Accessibility", url: "/accessibility-checker", icon: ScanEye, isNew: true },
            { id: "wireframe-describer", title: "Wireframe Spec", url: "/wireframe-describer", icon: LayoutTemplate, isNew: true },
        ],
    },
    {
        id: "health-wellness",
        title: "Health & Wellness",
        icon: Activity,
        items: [
            { id: "symptom-journal", title: "Symptom Journal", url: "/symptom-journal", icon: Activity, isNew: true },
            { id: "meal-plan", title: "Meal Plan", url: "/meal-plan", icon: Apple, isNew: true },
            { id: "workout-routine", title: "Workout Builder", url: "/workout-routine", icon: Dumbbell, isNew: true },
        ],
    },
    {
        id: "communication",
        title: "Communication",
        icon: Megaphone,
        items: [
            { id: "apology-drafter", title: "Apology Drafter", url: "/apology-drafter", icon: HeartHandshake, isNew: true },
            { id: "negotiation-script", title: "Negotiation Script", url: "/negotiation-script", icon: Handshake, isNew: true },
            { id: "elevator-pitch", title: "Elevator Pitch", url: "/elevator-pitch", icon: Megaphone, isNew: true },
        ],
    },
    {
        id: "other",
        title: "Other",
        icon: Gamepad2,
        items: [
            { id: "playground", title: "Playground", url: "/playground", icon: Gamepad2 },
            { id: "ppt-playground", title: "PPT Playground", url: "/ppt-playground", icon: Presentation, isNew: true },
            { id: "blank", title: "Blank Template", url: "/blank", icon: FileEdit },
        ],
    },
];

export function getAllSidebarTools() {
    // Exclude 'Main', 'Other', and 'Settings' from tool count if desired
    // Assuming we want to count actual functional AI tools
    return navigationCategories.flatMap(category => {
        if (category.id === 'main' || category.id === 'other') return [];
        return category.items
            .filter(item => !item.isComingSoon)
            .map(item => ({
                ...item,
                category: category.id,
                // Include category label for filtering/display logic if needed
                categoryLabel: category.title
            }));
    });
}

export function getSidebarToolsCount() {
    return getAllSidebarTools().length;
}
