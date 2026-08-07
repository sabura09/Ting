"use client"
import { Button } from '@/components/ui/button'
import { Code2Icon, Download, Monitor, Save, SquareArrowOutUpRight, TabletSmartphone, Loader2, Globe, MoreVertical } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import ViewCodeBlock from './ViewCodeBlock'
import { toast } from 'sonner'
import { constructFullHtml } from '@/utils/htmlProcessor'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

type Props = {
    SelectedScreenSize: any
    setSelectedScreenSize: any
    generatedCode: any
    onSave?: () => void
    onPublish?: () => void
    onUnpublish?: () => void
    isSaving: boolean
    isPublishing?: boolean
    loading: boolean
    projectSubdomain?: string | null
    visualEditsActive?: boolean
}

const WebpageTools = ({ SelectedScreenSize, setSelectedScreenSize, generatedCode, onSave, onPublish, onUnpublish, isSaving, isPublishing, loading, projectSubdomain, visualEditsActive }: Props) => {
    const [isCompact, setIsCompact] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                setIsCompact(entry.contentRect.width < 850);
            }
        });
        
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        
        return () => observer.disconnect();
    }, []);

    const getPublicUrl = (subdomain: string) => {
        if (typeof window === 'undefined') return `http://${subdomain}.localhost`;
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
        if (baseDomain && window.location.host.endsWith(baseDomain)) {
            return `https://${subdomain}.${baseDomain}`;
        }
        return `${window.location.protocol}//${window.location.host}/sites/${subdomain}`;
    };

    const getPublicUrlDisplay = (subdomain: string) => {
        if (typeof window === 'undefined') return `${subdomain}.localhost`;
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
        if (baseDomain && window.location.host.endsWith(baseDomain)) {
            return `${subdomain}.${baseDomain}`;
        }
        return `${window.location.host}/sites/${subdomain}`;
    };

    const ViewInNewTab = () => {
        if (!generatedCode) return

        const fullHtml = constructFullHtml(generatedCode);
        const blob = new Blob([fullHtml], { type: "text/html" })
        const url = URL.createObjectURL(blob)

        window.open(url, "_blank")
    }

    const downloadCode = () => {
        const fullHtml = constructFullHtml(generatedCode);
        const blob = new Blob([fullHtml], { type: "text/html" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'index.html'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Download successful!", {
            className: "bg-zinc-900 text-white border-zinc-800"
        })
    }

    return (
        <div className="relative mt-4 mx-auto w-full group" ref={containerRef}>
            {/* Ambient glow behind the toolbar */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10 rounded-[22px] blur-md opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

            <div className='relative p-2 border border-white/40 dark:border-zinc-800/60 rounded-[20px] w-full flex gap-y-2 items-center justify-between bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]'>

                {/* Device toggles - sleek pill design */}
                <div className='flex items-center gap-1 p-1 bg-gray-500/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shrink-0'>
                    <button
                        onClick={() => setSelectedScreenSize('web')}
                        className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-300 ease-out
                            ${SelectedScreenSize == 'web'
                                ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] scale-100'
                                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-500/5 dark:hover:bg-white/5 scale-95 hover:scale-100'}`}
                    >
                        <Monitor className="w-4 h-4" strokeWidth={SelectedScreenSize == 'web' ? 2.5 : 2} />
                    </button>
                    <button
                        onClick={() => setSelectedScreenSize('mobile')}
                        className={`relative flex items-center justify-center w-10 h-8 rounded-xl transition-all duration-300 ease-out
                            ${SelectedScreenSize == 'mobile'
                                ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800 shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.2)] scale-100'
                                : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-500/5 dark:hover:bg-white/5 scale-95 hover:scale-100'}`}
                    >
                        <TabletSmartphone className="w-4 h-4" strokeWidth={SelectedScreenSize == 'mobile' ? 2.5 : 2} />
                    </button>
                </div>

                {/* Actions */}
                <div className='flex items-center gap-1.5 pr-1 justify-center sm:justify-end flex-1 min-w-0'>
                    {projectSubdomain && (
                        <div className="flex items-center gap-2 mr-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl text-[13px] font-medium border border-emerald-500/20">
                            <Globe className="w-3.5 h-3.5" />
                            <a href={getPublicUrl(projectSubdomain)} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                                {getPublicUrlDisplay(projectSubdomain)}
                                <SquareArrowOutUpRight className="w-3 h-3 opacity-70" />
                            </a>
                        </div>
                    )}
                    {projectSubdomain ? (
                        <Button
                            variant="ghost"
                            onClick={onUnpublish}
                            disabled={!generatedCode || loading || isPublishing}
                            className="h-9 px-4 rounded-xl font-medium text-[13px] tracking-wide transition-all duration-300 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 border-none shadow-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isPublishing ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Deleting</>
                            ) : (
                                <>Delete from public</>
                            )}
                        </Button>
                    ) : (
                        <Button
                            variant="ghost"
                            onClick={onPublish}
                            disabled={!generatedCode || loading || isPublishing}
                            className="h-9 px-4 rounded-xl font-medium text-[13px] tracking-wide transition-all duration-300 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white hover:from-emerald-500 hover:to-teal-400 border-none shadow-[0_4px_14px_0_rgb(16,185,129,0.39)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.23)] disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isPublishing ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Publishing</>
                            ) : (
                                <><Globe className="w-3.5 h-3.5 mr-2" /> Publish</>
                            )}
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        onClick={onSave}
                        disabled={!generatedCode || loading || isSaving}
                        className="h-9 px-4 rounded-xl font-medium text-[13px] tracking-wide transition-all duration-300 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white hover:from-blue-500 hover:to-indigo-400 border-none shadow-[0_4px_14px_0_rgb(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isSaving ? (
                            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Saving</>
                        ) : (
                            <><Save className="w-3.5 h-3.5 mr-2" /> Save</>
                        )}
                    </Button>

                    {/* Desktop View Buttons - Only show if not forced compact and screen is large enough */}
                    {!visualEditsActive && !isCompact && (
                        <>
                            <div className="h-5 w-[1px] bg-gray-200 dark:bg-zinc-800 mx-1.5 rounded-full shrink-0"></div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => ViewInNewTab()}
                                    className="h-9 px-3.5 rounded-xl text-[13px] font-medium transition-all duration-300 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    View <SquareArrowOutUpRight className="ml-1.5 w-3.5 h-3.5 opacity-70" />
                                </Button>

                                <ViewCodeBlock code={constructFullHtml(generatedCode)}>
                                    <Button
                                        variant="ghost"
                                        className="h-9 px-3.5 rounded-xl text-[13px] font-medium transition-all duration-300 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Code <Code2Icon className="ml-1.5 w-3.5 h-3.5 opacity-70" />
                                    </Button>
                                </ViewCodeBlock>

                                <Button
                                    variant="ghost"
                                    onClick={downloadCode}
                                    className="h-9 px-3.5 rounded-xl text-[13px] font-medium transition-all duration-300 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Download <Download className="ml-1.5 w-3.5 h-3.5 opacity-70" />
                                </Button>
                            </div>
                        </>
                    )}

                    {/* Action Dropdown Menu - Show if forced compact OR screen is small */}
                    <div className={(visualEditsActive || isCompact) ? 'flex shrink-0' : 'hidden'}>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-9 px-2 rounded-xl text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40 rounded-xl bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-gray-200 dark:border-zinc-800 shadow-xl p-1.5">
                                <DropdownMenuItem onClick={() => ViewInNewTab()} className="cursor-pointer rounded-lg font-medium text-[13px] text-gray-700 dark:text-zinc-300 py-2">
                                    <SquareArrowOutUpRight className="mr-2.5 w-4 h-4 opacity-70" /> View
                                </DropdownMenuItem>

                                <ViewCodeBlock code={constructFullHtml(generatedCode)}>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer rounded-lg font-medium text-[13px] text-gray-700 dark:text-zinc-300 py-2">
                                        <Code2Icon className="mr-2.5 w-4 h-4 opacity-70" /> Code
                                    </DropdownMenuItem>
                                </ViewCodeBlock>

                                <DropdownMenuItem onClick={downloadCode} className="cursor-pointer rounded-lg font-medium text-[13px] text-gray-700 dark:text-zinc-300 py-2">
                                    <Download className="mr-2.5 w-4 h-4 opacity-70" /> Download
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WebpageTools
