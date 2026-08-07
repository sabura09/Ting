"use client";

import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useSettings, SystemSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { navigationCategories } from "@/lib/sidebar-routes";
import { getFeatureById } from "@/lib/features";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Settings,
    Palette,
    Mail,
    Shield,
    Zap,
    Globe,
    Database,
    Key,
    Bell,
    Server,
    Save,
    Loader2,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    LayoutTemplate,
    Share2,
    Search
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STRIPE_CURRENCIES = [
    "USD", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
    "BAM", "BBD", "BDT", "BGN", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BWP",
    "BZD", "CAD", "CDF", "CHF", "CLP", "CNY", "COP", "CRC", "CVE", "CZK", "DJF",
    "DKK", "DOP", "DZD", "EGP", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GIP",
    "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF", "IDR", "ILS", "INR",
    "ISK", "JMD", "JPY", "KES", "KGS", "KHR", "KMF", "KRW", "KYD", "KZT", "LAK",
    "LBP", "LKR", "LRD", "LSL", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP",
    "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK",
    "NPR", "NZD", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON",
    "RSD", "RUB", "RWF", "SAR", "SBD", "SCR", "SEK", "SGD", "SHP", "SLL", "SOS",
    "SRD", "SZL", "THB", "TJS", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH",
    "UGX", "UYU", "UZS", "VND", "VUV", "WST", "XAF", "XCD", "XOF", "XPF", "YER",
    "ZAR", "ZMW"
];

export default function AdminSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testingEmail, setTestingEmail] = useState(false);
    const [testingPaypal, setTestingPaypal] = useState(false);
    const [testingFlutterwave, setTestingFlutterwave] = useState(false);
    const [testingRazorpay, setTestingRazorpay] = useState(false);
    const [testingPaystack, setTestingPaystack] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = searchParams.get("tab") || "general";
    const { refreshSettings } = useSettings();
    const { user } = useAuth();

    // State for all settings
    const [settings, setSettings] = useState<SystemSettings>({
        defaultTokens: 1000,
        aiLimits: {},
        paymentEnabled: false,
        metadata: {}
    });

    // Form States
    // General
    const [siteName, setSiteName] = useState("Platform");

    const [siteUrl, setSiteUrl] = useState("");
    const [siteDescription, setSiteDescription] = useState("");
    const [siteKeywords, setSiteKeywords] = useState("");

    // Appearance
    const [primaryColor, setPrimaryColor] = useState("#4f46e5");
    const [defaultTheme, setDefaultTheme] = useState("system");
    const [logoUrl, setLogoUrl] = useState("");

    // Social
    const [socialLinks, setSocialLinks] = useState({
        facebook: "",
        twitter: "",
        instagram: "",
        linkedin: "",
        github: ""
    });

    // Features
    const [features, setFeatures] = useState<Record<string, boolean>>({});
    const [freeTools, setFreeTools] = useState<Record<string, boolean>>({});

    // Tokens
    const [defaultTokens, setDefaultTokens] = useState("1000");
    const [aiLimits, setAiLimits] = useState<Record<string, number>>({
        chat: 10,
        image: 50,
        code: 15,
        writer: 20
    });

    // Payment
    const [platformCurrency, setPlatformCurrency] = useState("USD");
    const [paymentEnabled, setPaymentEnabled] = useState(false);
    const [paymentGateway, setPaymentGateway] = useState("stripe");
    const [stripePublicKey, setStripePublicKey] = useState("");
    const [stripeSecretKey, setStripeSecretKey] = useState("");
    const [paypalClientId, setPaypalClientId] = useState("");
    const [paypalClientSecret, setPaypalClientSecret] = useState("");
    const [paypalMode, setPaypalMode] = useState("sandbox");
    const [flutterwavePublicKey, setFlutterwavePublicKey] = useState("");
    const [flutterwaveSecretKey, setFlutterwaveSecretKey] = useState("");
    const [flutterwaveEncryptionKey, setFlutterwaveEncryptionKey] = useState("");
    const [razorpayKeyId, setRazorpayKeyId] = useState("");
    const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
    const [paystackSecretKey, setPaystackSecretKey] = useState("");
    const [paystackCurrency, setPaystackCurrency] = useState("NGN");
    const [showAiSettings, setShowAiSettings] = useState(true);
    const [showDemoMode, setShowDemoMode] = useState(true);


    // Security
    const [enableRecaptcha, setEnableRecaptcha] = useState(false);
    const [enableEmailVerification, setEnableEmailVerification] = useState(false);

    // Email
    const [smtp, setSmtp] = useState({
        host: "",
        port: "587",
        user: "",
        pass: "",
        from: ""
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings");
            if (res.ok) {
                const data: SystemSettings = await res.json();
                setSettings(data);

                // Hydrate state
                setDefaultTokens(String(data.defaultTokens || 1000));
                setPaymentEnabled(data.paymentEnabled || false);
                setPaymentGateway(data.paymentGateway || "stripe");
                setStripePublicKey(data.stripePublicKey || "");
                setStripeSecretKey(data.stripeSecretKey || "");
                setPaypalClientId(data.paypalClientId || "");
                setPaypalClientSecret(data.paypalClientSecret || "");
                setPaypalMode(data.paypalMode || "sandbox");
                setFlutterwavePublicKey(data.flutterwavePublicKey || "");
                setFlutterwaveSecretKey(data.flutterwaveSecretKey || "");
                setFlutterwaveEncryptionKey(data.flutterwaveEncryptionKey || "");
                setRazorpayKeyId(data.razorpayKeyId || "");
                setRazorpayKeySecret(data.razorpayKeySecret || "");
                setPaystackSecretKey(data.paystackSecretKey || "");
                setPaystackCurrency(data.paystackCurrency || "NGN");
                setShowAiSettings(data.showAiSettings ?? true);
                setShowDemoMode(data.showDemoMode ?? false);

                setAiLimits({ ...aiLimits, ...data.aiLimits });

                const meta = data.metadata || {};
                setSiteName(meta.siteName || "Platform");

                setSiteUrl(meta.siteUrl || "");
                setSiteDescription(meta.siteDescription || "");
                setSiteKeywords(meta.siteKeywords || "");
                setPlatformCurrency(meta.platformCurrency || "USD");
                setPrimaryColor(meta.primaryColor || "#4f46e5");
                setDefaultTheme(meta.defaultTheme || "system");
                setLogoUrl(meta.logoUrl || "");
                setSocialLinks({ ...socialLinks, ...meta.social });
                setFeatures(meta.features || {});
                setFreeTools(meta.freeTools || {});
                setSmtp({ ...smtp, ...meta.smtp });
                setEnableRecaptcha(meta.enableRecaptcha || false);
                setEnableEmailVerification(meta.enableEmailVerification || false);
            }
        } catch (error: any) {
            console.error("Failed to fetch settings:", error);
            toast({ title: "Error", description: error?.message || "Failed to load settings", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {

        if (window.location.href.includes('mounikai')) {
            toast({ title: "Demo mode", description: "we disable this feature in demo mode" })
            return
        }

        setSaving(true);
        try {
            const payload: SystemSettings = {
                defaultTokens: parseInt(defaultTokens),
                aiLimits: aiLimits,
                paymentEnabled,
                paymentGateway,
                stripePublicKey,
                stripeSecretKey,
                paypalClientId,
                paypalClientSecret,
                paypalMode,
                flutterwavePublicKey,
                flutterwaveSecretKey,
                flutterwaveEncryptionKey,
                razorpayKeyId,
                razorpayKeySecret,
                paystackSecretKey,
                paystackCurrency,
                showAiSettings,
                showDemoMode,

                metadata: {
                    siteName,
                    siteUrl,
                    siteDescription,
                    siteKeywords,
                    primaryColor,
                    defaultTheme: defaultTheme as any,
                    logoUrl,
                    platformCurrency,
                    social: socialLinks,
                    features,
                    freeTools,
                    smtp,
                    enableRecaptcha,
                    enableEmailVerification
                }
            };

            const res = await fetch("/api/admin/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to save settings");

            await refreshSettings(); // Update global context

            toast({
                title: "Settings saved",
                description: "Your changes have been applied successfully.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to save settings. Please try again.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        setTestingEmail(true);
        try {
            const res = await fetch("/api/admin/test-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ smtp }),
            });
            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Test email sent successfully!",
                });
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to send test email.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setTestingEmail(false);
        }
    };

    const handleTestPaypal = async () => {
        setTestingPaypal(true);
        try {
            const res = await fetch("/api/admin/test-paypal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paypalClientId,
                    paypalClientSecret,
                    paypalMode
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "PayPal connection verified successfully!",
                });
            } else {
                toast({
                    title: "Connection Failed",
                    description: data.error || "Failed to connect to PayPal.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setTestingPaypal(false);
        }
    };

    const handleTestFlutterwave = async () => {
        setTestingFlutterwave(true);
        try {
            const res = await fetch("/api/admin/test-flutterwave", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    flutterwaveSecretKey,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Flutterwave connection verified successfully!",
                });
            } else {
                toast({
                    title: "Connection Failed",
                    description: data.error || "Failed to connect to Flutterwave.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setTestingFlutterwave(false);
        }
    };

    const handleTestRazorpay = async () => {
        setTestingRazorpay(true);
        try {
            const res = await fetch("/api/admin/test-razorpay", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    razorpayKeyId,
                    razorpayKeySecret,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Razorpay connection verified successfully!",
                });
            } else {
                toast({
                    title: "Connection Failed",
                    description: data.error || "Failed to connect to Razorpay.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setTestingRazorpay(false);
        }
    };

    const handleTestPaystack = async () => {
        setTestingPaystack(true);
        try {
            const res = await fetch("/api/admin/test-paystack", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    paystackSecretKey,
                }),
            });
            const data = await res.json();

            if (res.ok) {
                toast({
                    title: "Success",
                    description: "Paystack connection verified successfully!",
                });
            } else {
                toast({
                    title: "Connection Failed",
                    description: data.error || "Failed to connect to Paystack.",
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Something went wrong.",
                variant: "destructive",
            });
        } finally {
            setTestingPaystack(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                    <p className="text-muted-foreground">
                        Manage your platform configuration, appearance, and features.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} size="lg">
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2 " />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={(val) => router.push(`/admin/settings?tab=${val}`)}
                className="space-y-6"
            >
                <TabsList className="bg-muted/50 p-1 w-full justify-start overflow-x-auto hidden md:flex">
                    <TabsTrigger value="general"><Globe className="w-4 h-4 mr-2" /> General</TabsTrigger>
                    <TabsTrigger value="appearance"><Palette className="w-4 h-4 mr-2" /> Appearance</TabsTrigger>
                    <TabsTrigger value="features"><LayoutTemplate className="w-4 h-4 mr-2" /> Features</TabsTrigger>
                    <TabsTrigger value="tokens"><Zap className="w-4 h-4 mr-2" /> Tokens & Limits</TabsTrigger>
                    <TabsTrigger value="payment"><Database className="w-4 h-4 mr-2" /> Payment</TabsTrigger>
                    <TabsTrigger value="email"><Mail className="w-4 h-4 mr-2" /> Email & SMTP</TabsTrigger>
                    <TabsTrigger value="security"><Shield className="w-4 h-4 mr-2" /> Security</TabsTrigger>
                </TabsList>

                {/* Mobile Tab Selector - Visible only on mobile since tabs are in sidebar now */}
                <div className="md:hidden w-full mb-6">
                    <Select value={activeTab} onValueChange={(val) => router.push(`/admin/settings?tab=${val}`)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="appearance">Appearance</SelectItem>
                            <SelectItem value="features">Features</SelectItem>
                            <SelectItem value="tokens">Tokens & Limits</SelectItem>
                            <SelectItem value="payment">Payment</SelectItem>
                            <SelectItem value="email">Email & SMTP</SelectItem>
                            <SelectItem value="security">Security</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* General Settings */}
                <TabsContent value="general">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Site Identity</CardTitle>
                                <CardDescription>Basic information about your platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Site Name</Label>
                                    <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={siteDescription}
                                        onChange={(e) => setSiteDescription(e.target.value)}
                                        placeholder="Brief description for SEO..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Keywords</Label>
                                    <Input
                                        value={siteKeywords}
                                        onChange={(e) => setSiteKeywords(e.target.value)}
                                        placeholder="ai, tools, generator, writing..."
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>AI Configuration Display</CardTitle>
                                <CardDescription>Control visibility of AI model and API settings in the header.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-semibold">Show AI Model & API Settings</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable this to show the "Select AI Model" and "API Key Configuration" in the header globally.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={showAiSettings}
                                        onCheckedChange={setShowAiSettings}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Demo Mode Configuration</CardTitle>
                                <CardDescription>Control visibility of demo, discount, and buy buttons on the landing page.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-semibold">Enable Demo Mode Buttons</Label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable this to show "Watch Demo", "GET DISCOUNTED PRICE", and "Buy Now" buttons on the landing page.
                                        </p>
                                    </div>
                                    <Switch
                                        checked={showDemoMode}
                                        onCheckedChange={setShowDemoMode}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Configuration</CardTitle>
                            <CardDescription>Manage global security policies for the platform.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-semibold">Enforce reCAPTCHA</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Require reCAPTCHA verification for logins, registrations, and password resets.
                                    </p>
                                </div>
                                <Switch
                                    checked={enableRecaptcha}
                                    onCheckedChange={setEnableRecaptcha}
                                />
                            </div>


                            <div className="flex items-center justify-between p-4 border rounded-lg bg-card/50">
                                <div className="space-y-0.5">
                                    <Label className="text-base font-semibold">Enforce Email Verification</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Require new users to verify their email address before accessing the platform.
                                    </p>
                                </div>
                                <Switch
                                    checked={enableEmailVerification}
                                    onCheckedChange={setEnableEmailVerification}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Appearance Settings */}
                <TabsContent value="appearance">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Branding & Theme</CardTitle>
                                <CardDescription>Customize the look and feel of your app.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Primary Color</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="w-12 h-10 p-1 cursor-pointer"
                                            />
                                            <Input
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Default Theme</Label>
                                        <Select value={defaultTheme} onValueChange={setDefaultTheme}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="light">Light</SelectItem>
                                                <SelectItem value="dark">Dark</SelectItem>
                                                <SelectItem value="system">System Default</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo URL</Label>
                                    <Input
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        placeholder="https://..."
                                    />
                                    <p className="text-xs text-muted-foreground">URL to your logo image (PNG/SVG recommended)</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Social Media Links</CardTitle>
                                <CardDescription>Links displayed in the footer and contact pages.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Facebook</Label>
                                        <Input value={socialLinks.facebook} onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Twitter / X</Label>
                                        <Input value={socialLinks.twitter} onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Instagram</Label>
                                        <Input value={socialLinks.instagram} onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>LinkedIn</Label>
                                        <Input value={socialLinks.linkedin} onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Feature Flags */}
                <TabsContent value="features">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tool Management</CardTitle>
                            <CardDescription>Enable or disable specific AI tools globally.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full space-y-4">
                                {navigationCategories
                                    .filter(category => !['main', 'other'].includes(category.id))
                                    .map((category) => {
                                        const nonComingSoonItems = category.items.filter(item => !item.isComingSoon);
                                        return (
                                            <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4 bg-card/50">
                                                <AccordionTrigger className="hover:no-underline py-4">
                                                    <div className="flex items-center gap-2">
                                                        <category.icon className="w-5 h-5 text-muted-foreground" />
                                                        <span className="font-semibold">{category.title}</span>
                                                        <Badge variant="secondary" className="ml-2 font-normal text-xs">
                                                            {nonComingSoonItems.length} tools
                                                        </Badge>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="pt-2 pb-4">
                                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {nonComingSoonItems.map((feature) => (
                                                            <div key={feature.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent/5 transition-colors">
                                                                <div className="space-y-0.5 max-w-[80%]">
                                                                    <Label className="text-sm font-medium truncate block">{feature.title}</Label>
                                                                    <p className="text-[10px] text-muted-foreground font-mono truncate">{feature.id}</p>
                                                                </div>
                                                                <Switch
                                                                    checked={features[feature.id] !== false}
                                                                    onCheckedChange={(checked) => setFeatures({ ...features, [feature.id]: checked })}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                            </Accordion>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tokens & Limits */}
                <TabsContent value="tokens">
                    <div className="grid gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Token Economics</CardTitle>
                                <CardDescription>Configure costs and default allocations.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label>Default Signup Tokens</Label>
                                    <Input
                                        type="number"
                                        value={defaultTokens}
                                        onChange={(e) => setDefaultTokens(e.target.value)}
                                    />
                                    <p className="text-xs text-muted-foreground">Tokens given to new users for free.</p>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h3 className="text-sm font-medium">Cost Per Tool (Tokens)</h3>
                                    <Accordion type="multiple" className="w-full space-y-4">
                                        {navigationCategories
                                            .filter(category => !['main', 'other'].includes(category.id))
                                            .map((category) => {
                                                const nonComingSoonItems = category.items.filter(item => !item.isComingSoon);
                                                return (
                                                    <AccordionItem key={category.id} value={category.id} className="border rounded-lg px-4 bg-card/50">
                                                        <AccordionTrigger className="hover:no-underline py-4">
                                                            <div className="flex items-center gap-2">
                                                                <category.icon className="w-5 h-5 text-muted-foreground" />
                                                                <span className="font-semibold">{category.title}</span>
                                                                <Badge variant="secondary" className="ml-2 font-normal text-xs">
                                                                    {nonComingSoonItems.length} tools
                                                                </Badge>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent className="pt-2 pb-4">
                                                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                                {nonComingSoonItems.map((feature) => (
                                                                    <div key={feature.id} className="flex items-center justify-between p-3 border rounded-md bg-background hover:bg-accent/5 transition-colors">
                                                                        <div className="space-y-0.5 max-w-[60%]">
                                                                            <Label className="text-sm font-medium truncate block">{feature.title}</Label>
                                                                            <p className="text-[10px] text-muted-foreground font-mono truncate">{feature.id}</p>
                                                                        </div>
                                                                        <div className="flex items-center justify-end gap-3">
                                                                            <div className="flex flex-col items-center gap-1">
                                                                                <Label className="text-[10px] text-muted-foreground leading-none">Free</Label>
                                                                                <Switch
                                                                                    checked={freeTools[feature.id] || false}
                                                                                    onCheckedChange={(checked) => setFreeTools({ ...freeTools, [feature.id]: checked })}
                                                                                    className="scale-75 data-[state=checked]:bg-green-500"
                                                                                />
                                                                            </div>
                                                                            <div className="w-[70px]">
                                                                                <Input
                                                                                    type="number"
                                                                                    className="h-8 text-right"
                                                                                    value={aiLimits[feature.id] !== undefined ? aiLimits[feature.id] : (getFeatureById(feature.id)?.tokenCost ?? 10)}
                                                                                    onChange={(e) => {
                                                                                        const val = parseInt(e.target.value);
                                                                                        if (!isNaN(val)) {
                                                                                            setAiLimits({ ...aiLimits, [feature.id]: val });
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                );
                                            })}
                                    </Accordion>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Payment */}
                <TabsContent value="payment">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment Gateway Configuration</CardTitle>
                            <CardDescription>Select and configure your payment gateway.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Platform Currency</Label>
                                <Select value={platformCurrency} onValueChange={setPlatformCurrency}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(paymentGateway === 'paystack' ? ['ZAR', 'GHS', 'KES', 'USD'] : STRIPE_CURRENCIES).map(code => {
                                            let label = code;
                                            try {
                                                const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).formatToParts(0);
                                                const symbol = parts.find(p => p.type === 'currency')?.value;
                                                label = symbol ? `${code} (${symbol})` : code;
                                            } catch (e) {
                                                label = code;
                                            }
                                            return <SelectItem key={code} value={code}>{label}</SelectItem>;
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <Label className="text-base">Enable Payments</Label>
                                <Switch checked={paymentEnabled} onCheckedChange={setPaymentEnabled} />
                            </div>

                            {paymentEnabled && (
                                <>
                                    <Separator />

                                    <div className="space-y-2">
                                        <Label>Payment Gateway</Label>
                                        <Select value={paymentGateway} onValueChange={(val) => {
                                            setPaymentGateway(val);
                                            if (val === 'paystack') {
                                                const paystackCurrencies = ['ZAR', 'GHS', 'KES', 'USD'];
                                                if (!paystackCurrencies.includes(platformCurrency.toUpperCase())) {
                                                    setPlatformCurrency('ZAR');
                                                }
                                            }
                                        }}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Gateway" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="stripe">Stripe</SelectItem>
                                                <SelectItem value="paypal">PayPal</SelectItem>
                                                <SelectItem value="flutterwave">Flutterwave</SelectItem>
                                                <SelectItem value="razorpay">Razorpay</SelectItem>
                                                <SelectItem value="paystack">Paystack</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <Separator />

                                    {/* Stripe Config */}
                                    {paymentGateway === 'stripe' && (
                                        <div className="space-y-4 p-4 border rounded-lg bg-card/50">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Key className="w-4 h-4" /> Stripe Configuration
                                            </h3>
                                            <div className="space-y-2">
                                                <Label>Publishable Key</Label>
                                                <Input
                                                    value={stripePublicKey}
                                                    onChange={(e) => setStripePublicKey(e.target.value)}
                                                    placeholder="pk_live_..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Secret Key</Label>
                                                <Input
                                                    type="password"
                                                    value={stripeSecretKey}
                                                    onChange={(e) => setStripeSecretKey(e.target.value)}
                                                    placeholder="sk_live_..."
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Webhook URL: <code className="bg-muted px-1 rounded">{`{your-domain}/api/webhook/stripe`}</code>
                                            </p>
                                        </div>
                                    )}

                                    {/* PayPal Config */}
                                    {paymentGateway === 'paypal' && (
                                        <div className="space-y-4 p-4 border rounded-lg bg-card/50">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Key className="w-4 h-4" /> PayPal Configuration
                                            </h3>
                                            <div className="space-y-2">
                                                <Label>Mode</Label>
                                                <Select value={paypalMode} onValueChange={setPaypalMode}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="sandbox">Sandbox (Test)</SelectItem>
                                                        <SelectItem value="live">Live (Production)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Client ID</Label>
                                                <Input
                                                    value={paypalClientId}
                                                    onChange={(e) => setPaypalClientId(e.target.value)}
                                                    placeholder="AV...."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Client Secret</Label>
                                                <Input
                                                    type="password"
                                                    value={paypalClientSecret}
                                                    onChange={(e) => setPaypalClientSecret(e.target.value)}
                                                    placeholder="EL...."
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleTestPaypal}
                                                    disabled={testingPaypal || !paypalClientId || !paypalClientSecret}
                                                    className="w-full"
                                                >
                                                    {testingPaypal ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Testing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Test Connection
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Webhook URL: <code className="bg-muted px-1 rounded">{`{your-domain}/api/webhook/paypal`}</code>
                                            </p>
                                        </div>
                                    )}

                                    {/* Flutterwave Config */}
                                    {paymentGateway === 'flutterwave' && (
                                        <div className="space-y-4 p-4 border rounded-lg bg-card/50">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Key className="w-4 h-4" /> Flutterwave Configuration
                                            </h3>
                                            <div className="space-y-2">
                                                <Label>Public Key</Label>
                                                <Input
                                                    value={flutterwavePublicKey}
                                                    onChange={(e) => setFlutterwavePublicKey(e.target.value)}
                                                    placeholder="FLWPUBK_..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Secret Key</Label>
                                                <Input
                                                    type="password"
                                                    value={flutterwaveSecretKey}
                                                    onChange={(e) => setFlutterwaveSecretKey(e.target.value)}
                                                    placeholder="FLWSECK_..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Encryption Key (Optional)</Label>
                                                <Input
                                                    type="password"
                                                    value={flutterwaveEncryptionKey}
                                                    onChange={(e) => setFlutterwaveEncryptionKey(e.target.value)}
                                                    placeholder="Encryption Key"
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleTestFlutterwave}
                                                    disabled={testingFlutterwave || !flutterwaveSecretKey}
                                                    className="w-full"
                                                >
                                                    {testingFlutterwave ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Testing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Test Connection
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Webhook URL: <code className="bg-muted px-1 rounded">{`{your-domain}/api/webhook/flutterwave`}</code>
                                            </p>
                                        </div>
                                    )}

                                    {/* Razorpay Config */}
                                    {paymentGateway === 'razorpay' && (
                                        <div className="space-y-4 p-4 border rounded-lg bg-card/50">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Key className="w-4 h-4" /> Razorpay Configuration
                                            </h3>
                                            <div className="space-y-2">
                                                <Label>Key ID</Label>
                                                <Input
                                                    value={razorpayKeyId}
                                                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                                                    placeholder="rzp_test_... or rzp_live_..."
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Key Secret</Label>
                                                <Input
                                                    type="password"
                                                    value={razorpayKeySecret}
                                                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                                                    placeholder="Your Razorpay Key Secret"
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleTestRazorpay}
                                                    disabled={testingRazorpay || !razorpayKeyId || !razorpayKeySecret}
                                                    className="w-full"
                                                >
                                                    {testingRazorpay ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Testing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Test Connection
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Webhook URL: <code className="bg-muted px-1 rounded">{`{your-domain}/api/webhook/razorpay`}</code>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Set <code className="bg-muted px-1 rounded">RAZORPAY_WEBHOOK_SECRET</code> in your environment variables for signature verification.
                                            </p>
                                        </div>
                                    )}

                                    {/* Paystack Config */}
                                    {paymentGateway === 'paystack' && (
                                        <div className="space-y-4 p-4 border rounded-lg bg-card/50">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <Key className="w-4 h-4" /> Paystack Configuration
                                            </h3>
                                            <div className="space-y-2">
                                                <Label>Secret Key</Label>
                                                <Input
                                                    type="password"
                                                    value={paystackSecretKey}
                                                    onChange={(e) => setPaystackSecretKey(e.target.value)}
                                                    placeholder="sk_test_... or sk_live_..."
                                                />
                                            </div>
                                            <div className="pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleTestPaystack}
                                                    disabled={testingPaystack || !paystackSecretKey}
                                                    className="w-full"
                                                >
                                                    {testingPaystack ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Testing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <RefreshCw className="w-4 h-4 mr-2" />
                                                            Test Connection
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Webhook URL: <code className="bg-muted px-1 rounded">{`{your-domain}/api/webhook/paystack`}</code>
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Set <code className="bg-muted px-1 rounded">PAYSTACK_WEBHOOK_SECRET</code> in your environment variables for signature verification.
                                            </p>
                                        </div>
                                    )}

                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Email */}
                <TabsContent value="email">
                    <Card>
                        <CardHeader>
                            <CardTitle>SMTP Configuration</CardTitle>
                            <CardDescription>Setup email delivery for notifications.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>SMTP Host</Label>
                                    <Input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} placeholder="smtp.example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Port</Label>
                                    <Input value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: e.target.value })} placeholder="587" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Username</Label>
                                    <Input value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input type="password" value={smtp.pass} onChange={(e) => setSmtp({ ...smtp, pass: e.target.value })} />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label>From Email</Label>
                                    <Input value={smtp.from} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })} placeholder="noreply@..." />
                                </div>
                                <div className="md:col-span-2 mt-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleTestEmail}
                                        disabled={testingEmail || !smtp.host || !smtp.user || !smtp.pass}
                                    >
                                        {testingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                                        Test Mail
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
