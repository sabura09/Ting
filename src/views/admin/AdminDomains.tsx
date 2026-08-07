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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search,
    MoreHorizontal,
    Loader2,
    Trash2,
    Globe,
    ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface Domain {
    id: string;
    subdomain: string;
    name: string;
    userEmail: string;
    createdAt: string;
}

export default function AdminDomains() {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        fetchDomains();
    }, []);

    const fetchDomains = async () => {
        try {
            const res = await fetch("/api/admin/domains");
            if (!res.ok) throw new Error("Failed to fetch domains");
            const data = await res.json();
            setDomains(data.domains || []);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to load domains",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDomain = async (domain: Domain) => {
        if (!confirm(`Are you sure you want to delete the domain ${domain.subdomain}?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/domains?id=${domain.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setDomains(domains.filter((d) => d.id !== domain.id));
                toast({ title: "Success", description: "Domain deleted successfully" });
            } else {
                throw new Error("Failed to delete domain");
            }
        } catch (error: any) {
            console.error("API delete failed", error);
            toast({ title: "Error", description: error?.message || "Failed to delete domain", variant: "destructive" });
        }
    };

    const filteredDomains = domains.filter((domain) => {
        if (!domain) return false;
        const query = searchQuery.toLowerCase();
        return (
            (domain.subdomain && domain.subdomain.toLowerCase().includes(query)) ||
            (domain.userEmail && domain.userEmail.toLowerCase().includes(query)) ||
            (domain.name && domain.name.toLowerCase().includes(query))
        );
    });

    if (loading) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Domain Management</h1>
                    <p className="text-muted-foreground">
                        Manage all domains and websites created in the playground.
                    </p>
                </div>
            </div>

            {/* Filters & Search */}
            <Card>
                <CardContent className="p-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by subdomain, name, or user email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Domains Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subdomain</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>User Email</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDomains.map((domain) => (
                                <TableRow key={domain.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Globe className="w-4 h-4 text-muted-foreground" />
                                            <span className="font-medium">{domain.subdomain || "—"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{domain.name || "—"}</TableCell>
                                    <TableCell className="text-muted-foreground">{domain.userEmail}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {new Date(domain.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon-sm">
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem asChild>
                                                    <Link href={`https://${domain.subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'localhost:3000'}`} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        Preview Domain
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                                                    onClick={() => handleDeleteDomain(domain)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete Domain
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {filteredDomains.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Globe className="w-12 h-12 text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">No domains found</p>
                            <p className="text-sm text-muted-foreground">
                                Try adjusting your search or there are no generated domains yet.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
