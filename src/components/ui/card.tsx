import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
    "rounded-2xl border bg-card text-card-foreground shadow-[0_20px_54px_-42px_rgb(0_0_0)] transition-all duration-300",
    {
        variants: {
            variant: {
                // Default card - subtle and clean
                default: "border-border/70 bg-card/[0.72] backdrop-blur-xl shadow-sm shadow-black/20 hover:border-primary/[0.24] hover:shadow-lg hover:shadow-black/25",
                // Elevated card with more shadow
                elevated: "border-border/70 bg-card/[0.82] backdrop-blur-xl shadow-lg shadow-black/[0.24] hover:shadow-xl",
                // Glass effect card
                glass: "bg-white/[0.055] backdrop-blur-2xl border-white/[0.12] shadow-lg shadow-black/[0.24]",
                // Gradient border card
                gradient:
                    "relative before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:bg-gradient-to-r before:from-primary before:via-ai-secondary before:to-ai-tertiary before:-z-10 shadow-lg",
                // Interactive card with hover lift
                interactive: "border-border/70 bg-card/[0.72] backdrop-blur-xl hover:border-primary/[0.35] hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 cursor-pointer",
                // Soft colored background
                soft: "bg-muted/[0.65] border-border/[0.45] hover:bg-muted/80",
                // Outline only
                outline: "bg-transparent border-border hover:border-primary/50",
                // Feature card with top accent
                feature: "border-border/50 relative overflow-hidden before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-primary before:to-ai-secondary before:scale-x-0 before:transition-transform hover:before:scale-x-100",
                // Stats card
                stats: "bg-gradient-to-br from-card to-muted/30 border-border/50",
                // Premium card with glow
                premium: "bg-card/80 backdrop-blur-sm border-primary/20 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30",
                // Ghost - minimal styling
                ghost: "border-transparent bg-transparent hover:bg-muted/50",
                // Pricing card
                pricing: "bg-gradient-to-br from-primary/5 to-ai-secondary/5 border-primary/20 shadow-lg shadow-primary/5",
                // Dashboard card
                dashboard: "bg-card/[0.72] backdrop-blur-xl border-border/70 hover:border-primary/25 hover:shadow-lg hover:shadow-primary/[0.08]",
                // Gradient filled
                "gradient-filled": "border-0 bg-gradient-to-br from-primary to-ai-secondary text-white shadow-lg shadow-primary/25",
            },
            padding: {
                default: "",
                none: "p-0",
                sm: "[&>div]:p-4",
                md: "[&>div]:p-6",
                lg: "[&>div]:p-8",
            },
        },
        defaultVariants: {
            variant: "default",
            padding: "default",
        },
    }
);

export interface CardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> { }

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant, padding, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(cardVariants({ variant, padding, className }))}
            {...props}
        />
    )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "text-lg font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

// Premium Card - with animated gradient border
const PremiumCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
    <div className="relative group">
        {/* Animated gradient border */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-primary via-ai-secondary to-ai-tertiary rounded-2xl opacity-60 blur-sm group-hover:opacity-100 transition-opacity duration-500" />
        <div
            ref={ref}
            className={cn(
                "relative rounded-2xl bg-card/90 p-6 transition-all duration-300 backdrop-blur-xl shadow-2xl shadow-black/30",
                className
            )}
            {...props}
        >
            {children}
        </div>
    </div>
));
PremiumCard.displayName = "PremiumCard";

// Glass Card - glassmorphism effect
const GlassCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "rounded-2xl p-6 transition-all duration-300",
            "bg-white/[0.055] backdrop-blur-2xl",
            "border border-white/[0.12]",
            "shadow-xl shadow-black/25",
            className
        )}
        {...props}
    />
));
GlassCard.displayName = "GlassCard";

// Stats Card - for dashboard stats
const StatsCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        gradient?: string;
    }
>(({ className, gradient = "from-primary to-ai-secondary", ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "relative rounded-2xl p-5 text-white overflow-hidden",
            `bg-gradient-to-br ${gradient}`,
            "shadow-lg",
            className
        )}
        style={{
            boxShadow: "0 10px 40px -10px hsl(var(--primary) / 0.35)",
        }}
        {...props}
    />
));
StatsCard.displayName = "StatsCard";

// Feature Card - for feature showcases
const FeatureCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "group relative rounded-2xl border border-border/70 bg-card/[0.72] p-6 backdrop-blur-xl transition-all duration-300",
            "hover:border-primary/[0.35] hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10",
            "cursor-pointer overflow-hidden",
            className
        )}
        {...props}
    />
));
FeatureCard.displayName = "FeatureCard";

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
    cardVariants,
    PremiumCard,
    GlassCard,
    StatsCard,
    FeatureCard,
};
