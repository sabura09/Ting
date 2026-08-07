"use client"
import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Copy, Check, FileCode2, Sparkles, Terminal } from 'lucide-react';
import { toast } from 'sonner';

const ViewCodeBlock = ({children, code}: any) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code)
        setCopied(true);
        toast.success('Source code copied!', {
            className: "bg-[#09090b] text-white border-zinc-800"
        })
        setTimeout(() => setCopied(false), 2000);
    }

  return (
    <Dialog>
        <DialogTrigger asChild>{children}</DialogTrigger>
        <DialogContent className='max-w-5xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden bg-[#09090b] border border-white/10 shadow-[0_30px_100px_-15px_rgba(0,0,0,0.8)] rounded-2xl flex flex-col [&>button.absolute]:hidden'>
            {/* Hidden Title for Accessibility */}
            <DialogTitle className="sr-only">Source Code</DialogTitle>
            
            {/* Ambient Top Glow */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/40 to-transparent z-20"></div>
            
            {/* Premium Header */}
            <div className="flex items-center justify-between px-4 h-14 border-b border-white/5 bg-white/[0.02] backdrop-blur-md relative z-10 shrink-0">
                {/* Traffic Lights */}
                <div className="flex items-center gap-2 w-1/3">
                    <div className="flex items-center gap-2 group">
                        <div className="w-3 h-3 rounded-full bg-zinc-700/40 group-hover:bg-[#ff5f56] transition-colors duration-300"></div>
                        <div className="w-3 h-3 rounded-full bg-zinc-700/40 group-hover:bg-[#ffbd2e] transition-colors duration-300 delay-75"></div>
                        <div className="w-3 h-3 rounded-full bg-zinc-700/40 group-hover:bg-[#27c93f] transition-colors duration-300 delay-150"></div>
                    </div>
                </div>
                
                {/* File Tab */}
                <div className="flex-1 flex justify-center w-1/3">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-white/[0.03] hover:bg-white/[0.06] transition-colors rounded-full border border-white/5 shadow-sm cursor-pointer">
                        <FileCode2 className="w-4 h-4 text-blue-400/80" />
                        <span className="text-[13px] text-zinc-300 font-mono tracking-wide">index.html</span>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center justify-end w-1/3 gap-2">
                    <button 
                        onClick={handleCopy}
                        className="group relative flex items-center justify-center h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center gap-2 relative z-10">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />}
                            <span className={`text-xs font-medium tracking-wide ${copied ? 'text-green-400' : 'text-zinc-400 group-hover:text-white transition-colors'}`}>
                                {copied ? 'Copied' : 'Copy'}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Code Content Area */}
            <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-zinc-700/50 hover:scrollbar-thumb-zinc-600/80 scrollbar-track-transparent">
                {/* Decorative background effect */}
                <div className="absolute pointer-events-none inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-[#09090b]/0 to-transparent"></div>
                
                <SyntaxHighlighter  
                    language="html" 
                    style={atomOneDark}
                    showLineNumbers={true}
                    wrapLines={true}
                    customStyle={{
                        margin: 0,
                        padding: '1.5rem 0 2rem 0',
                        background: 'transparent',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
                    }}
                    lineNumberStyle={{
                        minWidth: '3.5em',
                        paddingRight: '1.5em',
                        color: '#404040',
                        textAlign: 'right',
                        userSelect: 'none',
                        borderRight: '1px solid rgba(255,255,255,0.05)',
                        marginRight: '1.5em',
                    }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
            
            {/* Minimal Footer */}
            <div className="h-8 shrink-0 flex items-center justify-between px-4 border-t border-white/5 bg-[#09090b] text-[11px] font-mono text-zinc-500 select-none z-10">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors cursor-pointer">
                        <Terminal className="w-3.5 h-3.5" />
                        bash
                    </span>
                    <span className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors cursor-pointer">
                        <Sparkles className="w-3 h-3" />
                        AI Generated
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="hover:text-zinc-300 transition-colors cursor-pointer">UTF-8</span>
                    <span className="hover:text-zinc-300 transition-colors cursor-pointer">HTML</span>
                </div>
            </div>
        </DialogContent>
    </Dialog>
  )
}

export default ViewCodeBlock
