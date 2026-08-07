"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import AdminTokenUsage from "@/views/admin/AdminTokenUsage";

export default function TokenUsagePage() {
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                router.push("/login");
            } else if (user?.role !== "admin") {
                router.push("/dashboard");
            }
        }
    }, [isAuthenticated, loading, user, router]);

    if (loading || !isAuthenticated || user?.role !== "admin") {
        return null;
    }

    return (
        <AdminLayout>
            <AdminTokenUsage />
        </AdminLayout>
    );
}
