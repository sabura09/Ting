"use client";

import { Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { PresentationDeck } from "@/components/presentation/PresentationDeck";
import FeatureGuard from "@/components/auth/FeatureGuard";

function PPTPlaygroundContent() {
    return (
        <Layout noPadding={true} fullHeight={true}>
            <FeatureGuard featureId="ppt-playground">
                <PresentationDeck />
            </FeatureGuard>
        </Layout>
    );
}

export default function PPTPlaygroundPage() {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);

    if (loading || !isAuthenticated) {
        return null;
    }

    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Presentation Studio...</div>}>
            <PPTPlaygroundContent />
        </Suspense>
    );
}
