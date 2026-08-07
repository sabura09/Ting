import { TOOLS_COUNT_DISPLAY } from "./constants";

export interface PricingPlan {
    id: string;
    name: string;
    price: number;
    tokens: number;
    interval: 'month' | 'year';
    features: string[];
    aiTools?: string[];
    isActive: boolean;
    description?: string;
    popular?: boolean;
    cta?: string;
}

export const DEMO_PRICING_PLANS: PricingPlan[] = [
    {
        id: "demo-free",
        name: "Free",
        price: 0,
        tokens: 1000,
        interval: 'month',
        features: [
            "1,000 tokens",
            "Access to 10 AI tools",
            "Standard response time",
            "Community support",
        ],
        isActive: true,
        description: "Perfect for trying out AI Suite",
        cta: "Get Started"
    },
    {
        id: "demo-pro",
        name: "Pro",
        price: 19,
        tokens: 50000,
        interval: 'month',
        features: [
            "50,000 tokens/month",
            `Access to all ${TOOLS_COUNT_DISPLAY} AI tools`,
            "Priority response time",
            "API access",
            "Priority support",
            "Custom templates",
        ],
        isActive: true,
        popular: true,
        description: "Best for professionals and creators",
        cta: "Start Free Trial"
    },
    {
        id: "demo-enterprise",
        name: "Enterprise",
        price: 0, // Using 0 to denote "Custom" or handled separately if price is used for payment
        tokens: 1000000,
        interval: 'month',
        features: [
            "Unlimited tokens",
            "All Pro features",
            "Dedicated account manager",
            "Custom AI training",
            "SLA guarantee",
            "On-premise deployment",
        ],
        isActive: true,
        popular: true,
        description: "For teams and organizations",
        cta: "Contact Sales"
    }
];
