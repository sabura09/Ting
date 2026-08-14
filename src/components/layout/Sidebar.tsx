"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, type User } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { navigationCategories, type NavItem, type NavCategory } from "@/lib/sidebar-routes";

interface NavItemComponentProps {
    item: NavItem;
    isActive: boolean;
    isCollapsed: boolean;
    isMobile: boolean;
    onClose?: () => void;
}

function NavItemComponent({ item, isActive, isCollapsed, isMobile, onClose }: NavItemComponentProps) {
    const activeRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        if (isActive && activeRef.current) {
            activeRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, []);

    const content = (
        <Link
            ref={activeRef}
            href={item.isComingSoon ? "#" : item.url}
            onClick={(e) => {
                if (item.isComingSoon) {
                    e.preventDefault();
                    return;
                }
                if (isMobile && onClose) {
                    onClose();
                }
            }}
            className={cn(
                "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-[background-color,color,box-shadow,transform,border-color] duration-200",
                "border border-transparent hover:bg-sidebar-accent hover:border-sidebar-border/80 hover:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]",
                isActive
                    ? "bg-gradient-to-r from-primary/[0.22] via-primary/[0.12] to-ai-secondary/10 text-sidebar-foreground border-primary/30 shadow-[0_0_24px_hsl(var(--primary)/0.12),inset_0_1px_0_hsl(0_0%_100%/0.06)]"
                    : "text-sidebar-foreground/[0.64] hover:text-sidebar-foreground",
                isCollapsed && !isMobile && "justify-center px-2",
                item.isComingSoon && "opacity-50 cursor-not-allowed select-none hover:bg-transparent"
            )}
        >
            {/* Active indicator line */}
            {isActive && (!isCollapsed || isMobile) && (
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full z-10"
                />
            )}

            <item.icon
                className={cn(
                    "flex-shrink-0 w-[18px] h-[18px] transition-all duration-200",
                    !item.isComingSoon && "group-hover:scale-105",
                    isActive ? "text-ai-secondary drop-shadow-[0_0_10px_hsl(var(--ai-secondary)/0.35)]" : "group-hover:text-ai-secondary"
                )}
            />

            {(!isCollapsed || isMobile) && (
                <span className="text-[13px] font-medium truncate flex-1">{item.title}</span>
            )}

            {/* Badges */}
            {(!isCollapsed || isMobile) && (
                <div className="flex items-center gap-1">
                    {item.isComingSoon && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-gray-500/15 text-gray-500 rounded-md uppercase tracking-wide">
                            Soon
                        </span>
                    )}
                    {item.isNew && !item.isComingSoon && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/15 text-emerald-500 rounded-md uppercase tracking-wide">
                            New
                        </span>
                    )}
                    {item.isPro && !item.isComingSoon && (
                        <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-500/15 text-amber-500 rounded-md uppercase tracking-wide">
                            Pro
                        </span>
                    )}
                </div>
            )}
        </Link>
    );

    if (item.isComingSoon) {
        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="w-full">{content}</div>
                    </TooltipTrigger>
                    <TooltipContent side={isCollapsed && !isMobile ? "right" : "top"} className="flex items-center gap-2 font-medium">
                        {isCollapsed && !isMobile ? `${item.title} (Coming Soon)` : "Coming Soon"}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    if (isCollapsed && !isMobile) {
        return (
            <TooltipProvider delayDuration={0}>
                <Tooltip>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2 font-medium">
                        {item.title}
                        {item.isNew && (
                            <span className="px-1 py-0.5 text-[9px] font-semibold bg-emerald-500 text-white rounded">
                                NEW
                            </span>
                        )}
                        {item.isPro && (
                            <span className="px-1 py-0.5 text-[9px] font-semibold bg-amber-500 text-white rounded">
                                PRO
                            </span>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}

interface CategorySectionProps {
    category: NavCategory;
    pathname: string;
    isCollapsed: boolean;
    isMobile: boolean;
    onClose?: () => void;
    user: User | null;
    settingsFeatures?: Record<string, boolean>;
    freeTools?: Record<string, boolean>;
}

function CategorySection({ category, pathname, isCollapsed, isMobile, onClose, user, settingsFeatures, freeTools }: CategorySectionProps) {
    const [isOpen, setIsOpen] = useState(true);

    const filteredItems = category.items.filter((item) => {
        // System level check (unless admin)
        if (user?.role !== 'admin' && settingsFeatures && settingsFeatures[item.id] === false) return false;

        // User level feature check
        if (user?.disabledFeatures?.includes(item.id)) return false;

        // Coming soon items bypass package checks so they are visible to everyone
        if (item.isComingSoon) return true;

        // If it's a free tool, it bypasses the package check
        const isFreeTool = freeTools?.[item.id] === true;

        // Package allowed tools check
        if (!isFreeTool && user && user.role !== 'admin' && user.planName !== 'Enterprise' && user.aiTools && item.id !== 'dashboard') {
            if (!user.aiTools.includes(item.id)) return false;
        }

        return true;
    });

    if (filteredItems.length === 0) return null;

    const CategoryIcon = category.icon;

    if (isCollapsed && !isMobile) {
        return (
            <div className="space-y-0.5">
                {filteredItems.map((item) => (
                    <NavItemComponent
                        key={item.id}
                        item={item}
                        isActive={pathname === item.url}
                        isCollapsed={isCollapsed}
                        isMobile={isMobile}
                        onClose={onClose}
                    />
                ))}
            </div>
        );
    }

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider hover:text-muted-foreground transition-colors">
                <div className="flex items-center gap-2">
                    <CategoryIcon className="w-3.5 h-3.5" />
                    <span>{category.title}</span>
                </div>
                <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200",
                    isOpen && "rotate-180"
                )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-0.5 mt-1">
                {filteredItems.map((item) => (
                    <NavItemComponent
                        key={item.id}
                        item={item}
                        isActive={pathname === item.url}
                        isCollapsed={isCollapsed}
                        isMobile={isMobile}
                        onClose={onClose}
                    />
                ))}
            </CollapsibleContent>
        </Collapsible>
    );
}

interface SidebarContentProps {
    isCollapsed: boolean;
    isMobile: boolean;
    onClose?: () => void;
    onToggleCollapse?: () => void;
}

function SidebarContent({ isCollapsed, isMobile, onClose, onToggleCollapse }: SidebarContentProps) {
    const pathname = usePathname();
    const { user } = useAuth();

    const { settings } = useSettings();

    // Count total features
    const totalFeatures = navigationCategories.reduce((acc, cat) => acc + cat.items.length, 0);

    return (
        <div className="flex flex-col h-full border-r border-sidebar-border/80 bg-sidebar/[0.88] backdrop-blur-2xl shadow-[18px_0_60px_-44px_rgb(0_0_0)]">
            {/* Header */}
            <div className={cn(
                "flex items-center h-16 px-4 relative",
                isCollapsed && !isMobile ? "justify-center" : "justify-between"
            )}>
                {(!isCollapsed || isMobile) && (
                    <Link href="/" className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-sky-400 to-ai-secondary flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-white/10 overflow-hidden">
                            {settings?.metadata?.logoUrl ? (
                                <img src={settings.metadata.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <Sparkles className="w-5 h-5 text-white" />
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg tracking-tight">
                                    {settings?.metadata?.siteName || "AI Suite"}
                                </span>
                            </div>
                        </div>
                    </Link>
                )}

                {isCollapsed && !isMobile && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary via-sky-400 to-ai-secondary flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-white/10 overflow-hidden">
                        {settings?.metadata?.logoUrl ? (
                            <img src={settings.metadata.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Sparkles className="w-5 h-5 text-white" />
                        )}
                    </div>
                )}

                {!isMobile && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onToggleCollapse}
                        className={cn(
                            "h-8 w-8 text-muted-foreground hover:text-foreground transition-all duration-300",
                            isCollapsed
                                ? "absolute -right-4 top-1/2 -translate-y-1/2 bg-card/95 shadow-xl z-50 hover:bg-accent rounded-full border border-border/70"
                                : "rounded-lg"
                        )}
                    >
                        {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <ChevronLeft className="w-4 h-4" />
                        )}
                    </Button>
                )}
            </div>


            {/* Navigation */}
            <ScrollArea className="flex-1 px-2 py-4">
                <nav className="space-y-6">
                    {navigationCategories.map((category) => (
                        <CategorySection
                            key={category.id}
                            category={category}
                            pathname={pathname}
                            isCollapsed={isCollapsed}
                            isMobile={isMobile}
                            onClose={onClose}
                            user={user}
                            settingsFeatures={settings?.metadata?.features}
                            freeTools={settings?.metadata?.freeTools}
                        />
                    ))}

                    {/* Upgrade Prompt for Unsubscribed Users */}
                    {!user?.planName && user?.role !== 'admin' && (!isCollapsed || isMobile) && (
                        <div className="mx-2 px-4 py-6 mt-4 rounded-2xl bg-gradient-to-br from-primary/[0.14] to-ai-secondary/10 border border-primary/25 shadow-[0_0_32px_hsl(var(--primary)/0.12)] animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mb-1">
                                    <Crown className="w-6 h-6 text-primary" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold tracking-tight">Unlock AI Tools</p>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed px-2">
                                        Please upgrade your account to start using our premium AI tools.
                                    </p>
                                </div>
                                <Button 
                                    asChild 
                                    size="sm" 
                                    className="w-full mt-2 bg-primary hover:bg-primary/90 text-white rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                                >
                                    <Link href="/pricing" onClick={onClose}>Upgrade Now</Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </nav>
            </ScrollArea>

            {/* Footer - Token Progress */}
            {(!isCollapsed || isMobile) && user && (
                <div className="p-3 mt-auto">
                    <div className="relative p-4 rounded-2xl overflow-hidden bg-sidebar-accent/[0.45] border border-sidebar-border/70 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-muted-foreground">Monthly Tokens</span>
                            <span className="text-xs font-bold text-primary">
                                {user.tokens?.toLocaleString() || 0} left
                            </span>
                        </div>

                        <Progress value={Math.min(((user.tokens || 0) / (user.tokenLimit || 1000)) * 100, 100)} className="h-2 mb-2" />

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/70">
                            <span>{user.planName || ""}</span>
                            <Link href="/pricing" className="text-primary hover:underline">
                                Upgrade
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const handleCollapse = (e: Event) => {
            const customEvent = e as CustomEvent;
            setIsCollapsed(!!customEvent.detail);
        };
        window.addEventListener('force-sidebar-collapse', handleCollapse);
        return () => window.removeEventListener('force-sidebar-collapse', handleCollapse);
    }, []);

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('sidebar-collapse-changed', { detail: isCollapsed }));
    }, [isCollapsed]);

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden lg:flex flex-col h-full sticky top-0 transition-all duration-300 ease-out z-30",
                    isCollapsed ? "w-[70px]" : "w-[260px]"
                )}
            >
                <SidebarContent
                    isCollapsed={isCollapsed}
                    isMobile={false}
                    onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
                />
            </aside>

            {/* Mobile Sidebar */}
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <SidebarContent
                        isCollapsed={false}
                        isMobile={true}
                        onClose={onClose}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}

export default Sidebar;
