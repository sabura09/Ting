"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, Check, Plus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { showDemoAlert } from "@/components/ui/demo-alert-dialog";

interface Product {
    id: string;
    name: string;
    image_url: string;
}

interface ProductPickerProps {
    selectedId?: string;
    onSelect: (product: Product | null) => void;
}

export function ProductPicker({ selectedId, onSelect }: ProductPickerProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/marketing?action=list-products');
            const data = await res.json();
            if (Array.isArray(data)) {
                setProducts(data);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error("Failed to load products", error);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (typeof window !== "undefined" && window.location.href.includes("mounikai.com")) {
            showDemoAlert();
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Please upload an image file");
            return;
        }

        setUploading(true);
        const reader = new FileReader();
        reader.onload = async () => {
            const base64 = reader.result as string;
            try {
                const res = await fetch('/api/marketing', {
                    method: 'POST',
                    body: JSON.stringify({
                        action: 'upload',
                        base64,
                        fileName: file.name,
                        saveAsProduct: true,
                        productName: file.name.split('.')[0]
                    })
                });
                const data = await res.json();
                if (data.success) {
                    toast.success("Product uploaded successfully");
                    fetchProducts();
                } else {
                    toast.error(data.error || "Upload failed");
                }
            } catch (error) {
                toast.error("An error occurred during upload");
            } finally {
                setUploading(false);
                if (e.target) e.target.value = "";
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    Select Product Reference
                </h3>
                <div className="relative">
                    <input
                        ref={fileInputRef}
                        type="file"
                        id="product-upload-input"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUpload}
                    />
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs gap-1" 
                        disabled={uploading}
                        onClick={() => {
                            if (typeof window !== "undefined" && window.location.href.includes("mounikai.com")) {
                                showDemoAlert();
                                return;
                            }
                            fileInputRef.current?.click();
                        }}
                    >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Upload Product
                    </Button>
                </div>
            </div>

            <ScrollArea className="w-full whitespace-nowrap rounded-xl border bg-muted/30">
                <div className="flex gap-4 p-4 w-max min-w-full">
                    {loading ? (
                        <div className="flex items-center gap-2 py-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs text-muted-foreground">Loading products...</span>
                        </div>
                    ) : products.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-2 px-4 border rounded-xl border-dashed border-muted-foreground/20 text-center">
                            <p className="text-[10px] text-muted-foreground">No products uploaded yet.</p>
                        </div>
                    ) : (
                        products.map((product) => (
                            <motion.button
                                key={product.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => onSelect(product)}
                                className="relative flex-shrink-0 w-24 group flex flex-col items-center bg-transparent hover:bg-transparent border-none p-0 outline-none focus:ring-0"
                            >
                                <div className={`p-2 rounded-2xl transition-all group-hover:bg-primary/10 ${
                                    selectedId === product.id ? 'bg-primary/15 shadow-sm' : ''
                                }`}>
                                    <div className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                                        selectedId === product.id ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                                    }`}>
                                        <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "/placeholder.svg";
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity flex items-center justify-center">
                                            <Check className={`w-6 h-6 text-white ${selectedId === product.id ? 'opacity-100' : 'opacity-0'}`} />
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-[10px] text-center truncate font-medium text-muted-foreground w-full px-1">
                                    {product.name}
                                </p>
                                {selectedId === product.id && (
                                    <motion.div
                                        layoutId="product-check"
                                        className="absolute top-1 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-lg z-10"
                                    >
                                        <Check className="w-3 h-3 text-white" />
                                    </motion.div>
                                )}
                            </motion.button>
                        ))
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </div>
    );
}
