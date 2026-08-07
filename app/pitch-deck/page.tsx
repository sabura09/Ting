"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout/Layout";
import { PitchDeckHero } from "@/components/presentation/PitchDeckHero";
import FeatureGuard from "@/components/auth/FeatureGuard";

export default function PitchDeckPage() {
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
        <Layout noPadding={true}>
            <FeatureGuard featureId="pitch-deck">
                <PitchDeckHero />
            </FeatureGuard>
        </Layout>
    );
}
