"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export function showDemoAlert() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-demo-alert"));
    }
}

export function DemoAlertDialog() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleShow = () => setIsOpen(true);
        window.addEventListener("show-demo-alert", handleShow);
        return () => window.removeEventListener("show-demo-alert", handleShow);
    }, []);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-md border-border/60 bg-card/90 backdrop-blur-xl text-foreground rounded-2xl p-6 shadow-2xl overflow-hidden">
                {/* Ambient glow decoration */}
                <div className="absolute -top-12 -left-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <DialogHeader className="flex flex-col items-center gap-3 text-center">
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                        className="p-3.5 rounded-2xl bg-gradient-to-tr from-rose-500/10 to-fuchsia-500/10 text-rose-500 border border-rose-500/20"
                    >
                        <ShieldAlert className="w-8 h-8" />
                    </motion.div>
                    <DialogTitle className="text-xl font-bold tracking-tight outfit mt-2 bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-transparent">
                        Demo Mode Restrict
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
                        This action is not available in demo mode. To protect resources, database integrity, and key security permissions, mutation operations and file uploads are disabled in this preview environment.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="sm:justify-center mt-6">
                    <Button 
                        onClick={() => setIsOpen(false)}
                        className="w-full sm:w-auto bg-gradient-to-tr from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white font-semibold shadow-lg shadow-rose-600/20 px-10 h-11 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Got it
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
