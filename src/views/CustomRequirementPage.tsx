"use client";

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import {
    Sparkles,
    Mail,
    DollarSign,
    UploadCloud,
    FileText,
    CheckCircle2,
    X,
    Loader2,
    ArrowLeft,
    AlertTriangle,
    ShieldCheck,
    Briefcase,
    ChevronRight,
    HelpCircle
} from "lucide-react";

export default function CustomRequirementPage() {
    const { settings } = useSettings();
    const { toast } = useToast();
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(true);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const hasMounikai = window.location.href.includes("mounikai");
            if (!hasMounikai) {
                setIsAuthorized(false);
                router.replace("/");
            }
        }
    }, [router]);

    // Form states
    const [email, setEmail] = useState("");
    const [requirement, setRequirement] = useState("");
    const [budget, setBudget] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [honeypot, setHoneypot] = useState(""); // Bot honeypot

    // UI States
    const [isDragActive, setIsDragActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Validation errors
    const [errors, setErrors] = useState<{
        email?: string;
        requirement?: string;
        budget?: string;
        file?: string;
    }>({});

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Client-side validations
    const validateForm = () => {
        const tempErrors: typeof errors = {};
        let isValid = true;

        // Email validation
        if (!email) {
            tempErrors.email = "Email address is required.";
            isValid = false;
        } else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                tempErrors.email = "Please enter a valid email address.";
                isValid = false;
            }
        }

        // Requirement validation
        if (!requirement) {
            tempErrors.requirement = "Requirement details are required.";
            isValid = false;
        } else if (requirement.trim().length < 20) {
            tempErrors.requirement = `Requirement must be at least 20 characters long. (Current: ${requirement.trim().length})`;
            isValid = false;
        }

        // Budget validation
        if (!budget) {
            tempErrors.budget = "Estimated budget is required.";
            isValid = false;
        } else {
            const budgetNum = parseFloat(budget);
            if (isNaN(budgetNum) || budgetNum <= 0) {
                tempErrors.budget = "Budget must be a positive number greater than 0.";
                isValid = false;
            }
        }

        // File validation
        if (file) {
            const extension = file.name.split(".").pop()?.toLowerCase();
            const allowedExtensions = ["pdf", "doc", "docx"];
            if (!allowedExtensions.includes(extension || "")) {
                tempErrors.file = "Only PDF, DOC, and DOCX files are allowed.";
                isValid = false;
            }
            if (file.size > 10 * 1024 * 1024) {
                tempErrors.file = "File size exceeds the maximum limit of 10MB.";
                isValid = false;
            }
        }

        setErrors(tempErrors);
        return isValid;
    };

    // File Drag & Drop handlers
    const handleDrag = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragActive(true);
        } else if (e.type === "dragleave") {
            setIsDragActive(false);
        }
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            processUploadedFile(droppedFile);
        }
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0]);
        }
    };

    const processUploadedFile = (selectedFile: File) => {
        const extension = selectedFile.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["pdf", "doc", "docx"];

        if (!allowedExtensions.includes(extension || "")) {
            setErrors(prev => ({ ...prev, file: "Invalid file format. Please upload PDF, DOC, or DOCX only." }));
            toast({
                title: "Unsupported File Format",
                description: "Only PDF, DOC, and DOCX formats are supported.",
                variant: "destructive"
            });
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, file: "File is too large. Maximum size is 10MB." }));
            toast({
                title: "File Too Large",
                description: "Maximum file size limit is 10MB.",
                variant: "destructive"
            });
            return;
        }

        // Clear previous file errors
        setErrors(prev => {
            const next = { ...prev };
            delete next.file;
            return next;
        });

        setFile(selectedFile);
    };

    const removeFile = () => {
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    // Form Submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!validateForm()) {
            toast({
                title: "Form Validation Failed",
                description: "Please check the errors in the form.",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        const formData = new FormData();
        formData.append("email", email);
        formData.append("requirement", requirement);
        formData.append("budget", budget);
        if (file) {
            formData.append("file", file);
        }
        // Honeypot field for bot checking
        formData.append("honeypot", honeypot);

        try {
            const response = await fetch("/api/custom-requirement", {
                method: "POST",
                body: formData
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setIsSuccess(true);
                toast({
                    title: "Success",
                    description: "Your requirement has been submitted successfully!"
                });
            } else {
                setErrorMsg(data.error || "An error occurred while submitting your requirement.");
                toast({
                    title: "Submission Failed",
                    description: data.error || "Please check server details.",
                    variant: "destructive"
                });
            }
        } catch (error) {
            setErrorMsg("Failed to connect to the server. Please check your internet connection.");
            toast({
                title: "Network Error",
                description: "Failed to connect to the server.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setEmail("");
        setRequirement("");
        setBudget("");
        setFile(null);
        setIsSuccess(false);
        setErrorMsg(null);
        setErrors({});
    };

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col justify-between overflow-x-hidden">
            {/* Background elements */}
            <div className="fixed inset-0 -z-10">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/20 to-transparent blur-3xl opacity-50" />
                <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-radial from-ai-secondary/15 to-transparent blur-3xl opacity-50" />
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-radial from-ai-tertiary/10 to-transparent blur-3xl opacity-40" />
            </div>

            {/* Header */}
            <header className="w-full border-b border-border/40 bg-background/60 backdrop-blur-xl py-4 sticky top-0 z-50">
                <div className="container mx-auto px-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/30 rounded-xl blur-lg group-hover:bg-primary/40 transition-all" />
                            <div className="relative p-2 bg-gradient-to-br from-primary to-ai-secondary rounded-xl overflow-hidden w-9 h-9 flex items-center justify-center">
                                {settings?.metadata?.logoUrl ? (
                                    <img src={settings.metadata.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                ) : (
                                    <Sparkles className="w-5 h-5 text-white" />
                                )}
                            </div>
                        </div>
                        <span className="text-xl font-bold gradient-text-primary">
                            {settings?.metadata?.siteName || "AI Suite"}
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <Link href="/dashboard">
                            <Button variant="outline" size="sm">
                                Go to App
                            </Button>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 flex items-center justify-center p-4 md:p-8">
                <div className="w-full max-w-3xl">
                    {/* Header branding / intro */}
                    <div className="text-center mb-8">
                        <motion.h1 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight mb-3 whitespace-normal sm:whitespace-nowrap"
                        >
                            <span className="gradient-text bg-gradient-to-r from-primary via-ai-secondary to-ai-tertiary bg-clip-text text-transparent">
                                Submit Customisation Requirement
                            </span>
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto"
                        >
                            Need a custom AI model, specialized agent, unique integration, or tailor-made feature? Share your requirements and budget, and our core engineering team will contact you.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.15 }}
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-semibold max-w-md mx-auto"
                        >
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Note: Customisation work is only accepted if you have purchased the project.</span>
                        </motion.div>
                    </div>

                    {/* Form / Success Card */}
                    <AnimatePresence mode="wait">
                        {!isSuccess ? (
                            <motion.div
                                key="form-container"
                                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.98, y: -15 }}
                                transition={{ duration: 0.4 }}
                            >
                                <Card className="glass-card overflow-hidden border-border/50 shadow-2xl relative">
                                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-ai-secondary to-ai-tertiary animate-pulse-slow" />
                                    
                                    <CardContent className="p-6 md:p-10 space-y-6">
                                        {errorMsg && (
                                            <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-start gap-3 animate-shake">
                                                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="font-semibold">Submission Error:</span>
                                                    <p className="mt-0.5 opacity-90">{errorMsg}</p>
                                                </div>
                                            </div>
                                        )}

                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            {/* Honeypot field (hidden for users, filled by bots) */}
                                            <div className="absolute opacity-0 w-0 h-0 -z-50 pointer-events-none">
                                                <label htmlFor="website">Website</label>
                                                <input
                                                    id="website"
                                                    type="text"
                                                    value={honeypot}
                                                    onChange={(e) => setHoneypot(e.target.value)}
                                                    autoComplete="off"
                                                />
                                            </div>

                                            {/* Email Address */}
                                            <div className="space-y-2">
                                                <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-1.5">
                                                    <Mail className="w-4 h-4 text-primary" />
                                                    Email Address <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="relative">
                                                    <Input
                                                        id="email"
                                                        type="email"
                                                        placeholder="you@example.com"
                                                        className={`bg-background/40 pl-4 py-6 text-base ${
                                                            errors.email ? "border-destructive focus-visible:ring-destructive" : ""
                                                        }`}
                                                        value={email}
                                                        onChange={(e) => {
                                                            setEmail(e.target.value);
                                                            if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                                                        }}
                                                        disabled={isSubmitting}
                                                    />
                                                </div>
                                                {errors.email && (
                                                    <p className="text-destructive text-xs font-medium flex items-center gap-1">
                                                        <span>•</span> {errors.email}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Budget field */}
                                            <div className="space-y-2">
                                                <Label htmlFor="budget" className="text-sm font-semibold flex items-center gap-1.5">
                                                    <DollarSign className="w-4 h-4 text-primary" />
                                                    Estimated Budget (USD) <span className="text-destructive">*</span>
                                                </Label>
                                                <div className="relative flex items-center">
                                                    <span className="absolute left-4 text-muted-foreground font-semibold">$</span>
                                                    <Input
                                                        id="budget"
                                                        type="number"
                                                        min="1"
                                                        placeholder="Enter amount (e.g. 1500)"
                                                        className={`bg-background/40 pl-8 py-6 text-base ${
                                                            errors.budget ? "border-destructive focus-visible:ring-destructive" : ""
                                                        }`}
                                                        value={budget}
                                                        onChange={(e) => {
                                                            setBudget(e.target.value);
                                                            if (errors.budget) setErrors(prev => ({ ...prev, budget: undefined }));
                                                        }}
                                                        disabled={isSubmitting}
                                                    />
                                                </div>
                                                {errors.budget && (
                                                    <p className="text-destructive text-xs font-medium flex items-center gap-1">
                                                        <span>•</span> {errors.budget}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Custom Requirement Details */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <Label htmlFor="requirement" className="text-sm font-semibold flex items-center gap-1.5">
                                                        <Briefcase className="w-4 h-4 text-primary" />
                                                        Requirement Details <span className="text-destructive">*</span>
                                                    </Label>
                                                    <span className={`text-xs font-medium ${requirement.trim().length < 20 ? "text-muted-foreground" : "text-emerald-500"}`}>
                                                        {requirement.trim().length} / 20 min chars
                                                    </span>
                                                </div>
                                                <Textarea
                                                    id="requirement"
                                                    placeholder="Please explain the details of the custom feature or implementation you are looking for in depth. Provide any context on technologies, APIs, and business cases..."
                                                    className={`bg-background/40 min-h-[160px] p-4 text-base leading-relaxed ${
                                                        errors.requirement ? "border-destructive focus-visible:ring-destructive" : ""
                                                    }`}
                                                    value={requirement}
                                                    onChange={(e) => {
                                                        setRequirement(e.target.value);
                                                        if (errors.requirement) setErrors(prev => ({ ...prev, requirement: undefined }));
                                                    }}
                                                    disabled={isSubmitting}
                                                />
                                                {errors.requirement && (
                                                    <p className="text-destructive text-xs font-medium flex items-center gap-1">
                                                        <span>•</span> {errors.requirement}
                                                    </p>
                                                )}
                                            </div>

                                            {/* File upload zone */}
                                            <div className="space-y-2">
                                                <Label className="text-sm font-semibold flex items-center gap-1.5">
                                                    <UploadCloud className="w-4 h-4 text-primary" />
                                                    Attachments (Optional)
                                                </Label>
                                                <div
                                                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
                                                        isDragActive 
                                                            ? "border-primary bg-primary/5 scale-[0.99]" 
                                                            : "border-border hover:border-primary/40 hover:bg-muted/10"
                                                    } ${errors.file ? "border-destructive bg-destructive/5" : ""}`}
                                                    onDragEnter={handleDrag}
                                                    onDragOver={handleDrag}
                                                    onDragLeave={handleDrag}
                                                    onDrop={handleDrop}
                                                    onClick={() => !file && fileInputRef.current?.click()}
                                                >
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept=".pdf,.doc,.docx"
                                                        className="hidden"
                                                        onChange={handleFileChange}
                                                        disabled={isSubmitting}
                                                    />

                                                    <AnimatePresence mode="wait">
                                                        {!file ? (
                                                            <motion.div 
                                                                key="upload-prompt"
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                exit={{ opacity: 0 }}
                                                                className="flex flex-col items-center space-y-2"
                                                            >
                                                                <UploadCloud className="w-10 h-10 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-sm font-medium">
                                                                        Drag and drop file here, or <span className="text-primary hover:underline">browse</span>
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground mt-1">
                                                                        Supports PDF, DOC, DOCX files up to 10MB
                                                                    </p>
                                                                </div>
                                                            </motion.div>
                                                        ) : (
                                                            <motion.div 
                                                                key="file-info"
                                                                initial={{ opacity: 0, scale: 0.95 }}
                                                                animate={{ opacity: 1, scale: 1 }}
                                                                exit={{ opacity: 0, scale: 0.95 }}
                                                                className="flex items-center justify-between bg-card p-4 rounded-xl border"
                                                            >
                                                                <div className="flex items-center gap-3 text-left">
                                                                    <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
                                                                        <FileText className="w-6 h-6" />
                                                                    </div>
                                                                    <div className="max-w-[200px] sm:max-w-xs md:max-w-md truncate">
                                                                        <p className="text-sm font-semibold truncate">{file.name}</p>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon-sm"
                                                                    className="text-muted-foreground hover:text-foreground"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        removeFile();
                                                                    }}
                                                                    disabled={isSubmitting}
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                {errors.file && (
                                                    <p className="text-destructive text-xs font-medium flex items-center gap-1">
                                                        <span>•</span> {errors.file}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Submit button */}
                                            <Button
                                                type="submit"
                                                className="w-full btn-premium py-6 hover:shadow-glow text-base font-bold transition-all"
                                                disabled={isSubmitting}
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                                        Submitting Requirement...
                                                    </>
                                                ) : (
                                                    <>
                                                        Submit Custom Request
                                                        <ChevronRight className="w-5 h-5 ml-1" />
                                                    </>
                                                )}
                                            </Button>
                                        </form>

                                        {/* Security Notice */}
                                        <div className="pt-4 border-t border-border/40 flex items-center gap-2 justify-center text-xs text-muted-foreground">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            <span>Secure submission. Your data is encrypted and kept private.</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-container"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.4 }}
                            >
                                <Card className="glass-card text-center overflow-hidden border-border/50 shadow-2xl relative">
                                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
                                    <CardContent className="p-8 md:p-12 space-y-6">
                                        <div className="flex justify-center">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                                                className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center"
                                            >
                                                <CheckCircle2 className="w-12 h-12" />
                                            </motion.div>
                                        </div>

                                        <div className="space-y-2">
                                            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground">
                                                Requirement Submitted!
                                            </h2>
                                            <p className="text-muted-foreground text-sm md:text-base max-w-md mx-auto leading-relaxed">
                                                Thank you for reaching out. We have successfully received your custom requirement details and forwarded them to our development team.
                                            </p>
                                        </div>

                                        <div className="bg-muted/40 border border-border/50 rounded-2xl p-6 text-left max-w-md mx-auto space-y-3 text-sm">
                                            <p className="font-semibold text-foreground flex items-center gap-1.5">
                                                <HelpCircle className="w-4 h-4 text-primary" />
                                                What happens next?
                                            </p>
                                            <ul className="space-y-2 text-muted-foreground">
                                                <li className="flex gap-2">
                                                    <span className="text-primary font-bold">1.</span>
                                                    <span>An engineer will review your application and estimated budget.</span>
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="text-primary font-bold">2.</span>
                                                    <span>We will email you at <strong className="text-foreground">{email}</strong> to confirm the details.</span>
                                                </li>
                                                <li className="flex gap-2">
                                                    <span className="text-primary font-bold">3.</span>
                                                    <span>If aligned, we'll provide a statement of work (SOW) and kick off.</span>
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                                            <Link href="/">
                                                <Button className="w-full sm:w-auto flex items-center justify-center gap-1.5">
                                                    <ArrowLeft className="w-4 h-4" />
                                                    Back to Home
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                onClick={resetForm}
                                                className="w-full sm:w-auto"
                                            >
                                                Submit Another
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/40 bg-background pt-12 pb-6 mt-12 w-full">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
                        <div className="space-y-1">
                            <span className="text-sm font-semibold block text-foreground">
                                © 2026 {settings?.metadata?.siteName || "AI Suite"}. All rights reserved.
                            </span>
                            <span className="text-xs text-muted-foreground block">
                                Custom Development Platform & Autonomous Agent Systems.
                            </span>
                        </div>

                        <div className="flex gap-6 text-sm">
                            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                                Home
                            </Link>
                            <Link href="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                                Sign In
                            </Link>
                            <Link href="/register" className="text-muted-foreground hover:text-foreground transition-colors">
                                Create Account
                            </Link>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
