"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeatureGuardProps {
    featureId: string;
    children: React.ReactNode;
}

export default function FeatureGuard({ featureId, children }: FeatureGuardProps) {
    const { user, loading } = useAuth();
    const { settings } = useSettings();
    const router = useRouter();

    if (loading) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!user) {
        return null; // AuthGuard typically handles this, but safe to return null
    }

    // 1. Is it globally disabled?
    const isGloballyDisabled = user.disabledFeatures?.includes(featureId);

    // 2. Is it out of their plan scope?
    // Exclude 'dashboard' and 'support-agent' (or 'chat/rag') since they aren't standard chargeable tools in this context usually
    const isBasicTool = featureId === 'dashboard' || featureId === 'support-agent';
    const isFreeTool = settings?.metadata?.freeTools?.[featureId] === true;
    const isEnterprise = user.planName === 'Enterprise';
    const hasTool = user.role === 'admin' || isEnterprise || isBasicTool || isFreeTool || (user.aiTools && user.aiTools.includes(featureId));

    if (isGloballyDisabled || !hasTool) {
        return (
            <div className="flex h-full w-full items-center justify-center p-8">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                            <Lock className="w-6 h-6 text-destructive" />
                        </div>
                        <CardTitle className="text-xl">Access Restricted</CardTitle>
                        <CardDescription>
                            {isGloballyDisabled 
                                ? "Your organization has disabled access to this feature." 
                                : "This AI tool is not included in your current plan. Please upgrade to access it."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                        {!isGloballyDisabled && (
                             <Button variant="default" onClick={() => router.push("/pricing")}>
                                Upgrade Plan
                             </Button>
                        )}
                        <Button variant="secondary" onClick={() => router.push("/dashboard")}>
                            Return to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
}
