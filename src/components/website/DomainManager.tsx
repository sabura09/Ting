import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { X, CheckCircle, RefreshCw, Trash2, Globe, Server } from 'lucide-react';

interface DomainManagerProps {
    projectId: string;
    currentSubdomain?: string;
    onClose: () => void;
    onUpdate: () => void;
}

export const DomainManager: React.FC<DomainManagerProps> = ({ projectId, currentSubdomain, onClose, onUpdate }) => {
    const [subdomain, setSubdomain] = useState(currentSubdomain || '');
    const [domains, setDomains] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [activeTab, setActiveTab] = useState<'subdomain' | 'custom'>('subdomain');
    const [isLoading, setIsLoading] = useState(false);

    const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'ai-suite.com';
    const cnameRecord = process.env.NEXT_PUBLIC_APP_CNAME || 'cname.vercel-dns.com';
    const aRecordIp = process.env.NEXT_PUBLIC_APP_IP || '76.76.21.21';

    useEffect(() => {
        if (activeTab === 'custom') {
            fetchDomains();
        }
    }, [activeTab]);

    const fetchDomains = async () => {
        try {
            const res = await fetch(`/api/website/domain?websiteId=${projectId}`);
            if (res.ok) {
                const data = await res.json();
                setDomains(data);
            }
        } catch (err) {
            toast.error("Failed to fetch domains");
        }
    };

    const handleSaveSubdomain = async () => {
        if (!subdomain) return toast.error("Please enter a subdomain");
        setIsLoading(true);
        try {
            const res = await fetch('/api/website/subdomain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: projectId, subdomain })
            });

            if (res.ok) {
                toast.success("Subdomain updated successfully");
                onUpdate();
            } else {
                const err = await res.text();
                toast.error(err);
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddDomain = async () => {
        if (!newDomain) return toast.error("Please enter a domain");
        setIsLoading(true);
        try {
            const res = await fetch('/api/website/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ websiteId: projectId, domain: newDomain })
            });

            if (res.ok) {
                toast.success("Domain added");
                setNewDomain('');
                fetchDomains();
            } else {
                const err = await res.text();
                toast.error(err);
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyDomain = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/website/domain/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, websiteId: projectId })
            });
            const data = await res.json();
            if (data.status === 'active') {
                toast.success("Domain verified successfully!");
            } else {
                toast.info(data.message || "Domain pending verification. Please check DNS settings.");
            }
            fetchDomains();
        } catch (error) {
            toast.error("Verification failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteDomain = async (id: string) => {
        if (!confirm("Are you sure you want to remove this domain?")) return;
        setIsLoading(true);
        try {
            const res = await fetch(`/api/website/domain?id=${id}&websiteId=${projectId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                toast.success("Domain removed");
                fetchDomains();
            } else {
                toast.error("Failed to remove domain");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Globe className="w-5 h-5 text-primary" />
                        Domain Management
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex border-b">
                    <button
                        className={`flex-1 py-3 font-medium text-sm transition ${activeTab === 'subdomain' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('subdomain')}
                    >
                        Subdomain
                    </button>
                    <button
                        className={`flex-1 py-3 font-medium text-sm transition ${activeTab === 'custom' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setActiveTab('custom')}
                    >
                        Custom Domain
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'subdomain' && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Choose a unique subdomain for your project on {baseDomain}.
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={subdomain}
                                    onChange={(e) => setSubdomain(e.target.value)}
                                    placeholder="your-project"
                                    className="flex-1 bg-muted border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <span className="text-muted-foreground text-sm">.{baseDomain}</span>
                            </div>
                            <button
                                onClick={handleSaveSubdomain}
                                disabled={isLoading}
                                className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-50"
                            >
                                {isLoading ? "Saving..." : "Save Subdomain"}
                            </button>
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div className="space-y-6">
                            <div className="flex items-end gap-2">
                                <div className="flex-1 space-y-1">
                                    <label className="text-sm font-medium">Add Custom Domain</label>
                                    <input
                                        type="text"
                                        value={newDomain}
                                        onChange={(e) => setNewDomain(e.target.value)}
                                        placeholder="www.yourdomain.com"
                                        className="w-full bg-muted border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                </div>
                                <button
                                    onClick={handleAddDomain}
                                    disabled={isLoading || !newDomain}
                                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition disabled:opacity-50 h-10"
                                >
                                    Add
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {domains.map(domain => (
                                    <div key={domain.id} className="border rounded-lg p-4 bg-muted/30">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold">{domain.domain}</h4>
                                                {domain.status === 'active' ? (
                                                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                                        <CheckCircle className="w-3 h-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                                                        <RefreshCw className="w-3 h-3 animate-spin" /> Pending
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {domain.status !== 'active' && (
                                                    <button
                                                        onClick={() => handleVerifyDomain(domain.id)}
                                                        disabled={isLoading}
                                                        className="text-xs bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded transition"
                                                    >
                                                        Verify
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDeleteDomain(domain.id)}
                                                    disabled={isLoading}
                                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {domain.status !== 'active' && (
                                            <div className="bg-background border rounded p-3 text-sm space-y-3">
                                                <p className="text-muted-foreground flex items-center gap-1">
                                                    <Server className="w-4 h-4" />
                                                    Configure your DNS records
                                                </p>
                                                <div className="grid grid-cols-[1fr_2fr] gap-2 items-center bg-muted/50 p-2 rounded">
                                                    <span className="text-xs font-semibold text-muted-foreground">Type</span>
                                                    <span className="text-xs font-semibold text-muted-foreground">Value</span>
                                                    <span className="font-mono text-xs font-medium">CNAME</span>
                                                    <span className="font-mono text-xs">{cnameRecord}</span>
                                                    <span className="font-mono text-xs font-medium">A Record</span>
                                                    <span className="font-mono text-xs">{aRecordIp}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Add either the CNAME (recommended) or the A Record to your domain provider's DNS settings. It may take up to 24 hours to propagate.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {domains.length === 0 && (
                                    <p className="text-sm text-center text-muted-foreground py-4">No custom domains added yet.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
