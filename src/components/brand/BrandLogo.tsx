import { cn } from "@/lib/utils";

type BrandLogoProps = {
    variant?: "full" | "mark";
    className?: string;
    imageClassName?: string;
};

export function BrandLogo({ variant = "full", className, imageClassName }: BrandLogoProps) {
    if (variant === "mark") {
        return (
            <img
                src="/brand/tingai-mark.png"
                alt="TingAi"
                className={cn("h-9 w-9 rounded-xl object-cover", className)}
            />
        );
    }

    return (
        <span className={cn("inline-flex items-center", className)}>
            <img
                src="/brand/tingai-logo-light.png"
                alt="TingAi"
                className={cn("block h-9 w-auto object-contain dark:hidden", imageClassName)}
            />
            <img
                src="/brand/tingai-logo-dark.png"
                alt="TingAi"
                className={cn("hidden h-9 w-auto object-contain dark:block", imageClassName)}
            />
        </span>
    );
}
