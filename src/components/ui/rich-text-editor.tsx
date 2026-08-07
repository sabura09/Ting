"use client";

import React, { useRef, useCallback, useEffect } from "react";
import {
    Bold,
    Italic,
    Underline,
    Link,
    Unlink,
    RemoveFormatting,
    Type,
    Strikethrough
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface ToolbarButton {
    icon: React.ReactNode;
    command: string;
    label: string;
    value?: string;
}

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    minHeight?: string;
}

export function RichTextEditor({
    value,
    onChange,
    placeholder = "Start typing...",
    label,
    className,
    minHeight = "120px",
}: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const isInternalChange = useRef(false);

    // Sync external value changes into the editor
    useEffect(() => {
        if (editorRef.current && !isInternalChange.current) {
            // Only update if the value actually differs from what's in the editor
            if (editorRef.current.innerHTML !== value) {
                editorRef.current.innerHTML = value;
            }
        }
        isInternalChange.current = false;
    }, [value]);

    const handleInput = useCallback(() => {
        if (editorRef.current) {
            isInternalChange.current = true;
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    const execCommand = useCallback((command: string, value?: string) => {
        editorRef.current?.focus();
        document.execCommand(command, false, value);
        handleInput();
    }, [handleInput]);

    const handleLink = useCallback(() => {
        const selection = window.getSelection();
        const selectedText = selection?.toString();

        if (!selectedText) {
            return;
        }

        const url = prompt("Enter URL:", "https://");
        if (url) {
            execCommand("createLink", url);
            // Make links open in new tab
            if (editorRef.current) {
                const links = editorRef.current.querySelectorAll("a");
                links.forEach(link => {
                    link.setAttribute("target", "_blank");
                    link.setAttribute("rel", "noopener noreferrer");
                });
                handleInput();
            }
        }
    }, [execCommand, handleInput]);

    const handleUnlink = useCallback(() => {
        execCommand("unlink");
    }, [execCommand]);

    const handleClearFormatting = useCallback(() => {
        execCommand("removeFormat");
    }, [execCommand]);

    const toolbarButtons: ToolbarButton[] = [
        { icon: <Bold className="w-3.5 h-3.5" />, command: "bold", label: "Bold" },
        { icon: <Italic className="w-3.5 h-3.5" />, command: "italic", label: "Italic" },
        { icon: <Underline className="w-3.5 h-3.5" />, command: "underline", label: "Underline" },
        { icon: <Strikethrough className="w-3.5 h-3.5" />, command: "strikeThrough", label: "Strikethrough" },
    ];

    // Handle paste - strip complex formatting, keep inline styles only
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
        handleInput();
    }, [handleInput]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case "b":
                    e.preventDefault();
                    execCommand("bold");
                    break;
                case "i":
                    e.preventDefault();
                    execCommand("italic");
                    break;
                case "u":
                    e.preventDefault();
                    execCommand("underline");
                    break;
                case "k":
                    e.preventDefault();
                    handleLink();
                    break;
            }
        }
    }, [execCommand, handleLink]);

    return (
        <div className={cn("space-y-2", className)}>
            {label && <Label>{label}</Label>}

            <div className="rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 focus-within:ring-offset-background transition-shadow">
                {/* Toolbar */}
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/60 bg-muted/40">
                    {toolbarButtons.map((btn, i) => (
                        <button
                            key={i}
                            type="button"
                            title={btn.label}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent stealing focus from editor
                                execCommand(btn.command, btn.value);
                            }}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        >
                            {btn.icon}
                        </button>
                    ))}

                    <div className="w-px h-5 bg-border/60 mx-1" />

                    <button
                        type="button"
                        title="Insert Link (Ctrl+K)"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleLink();
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        <Link className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        title="Remove Link"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleUnlink();
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        <Unlink className="w-3.5 h-3.5" />
                    </button>

                    <div className="w-px h-5 bg-border/60 mx-1" />

                    <button
                        type="button"
                        title="Clear Formatting"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleClearFormatting();
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                        <RemoveFormatting className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1" />

                    <span className="text-[10px] text-muted-foreground/60 select-none pr-1 hidden sm:inline">
                        Ctrl+B / I / U / K
                    </span>
                </div>

                {/* Editable Area */}
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onPaste={handlePaste}
                    onKeyDown={handleKeyDown}
                    data-placeholder={placeholder}
                    className={cn(
                        "px-4 py-3 text-sm outline-none",
                        "prose prose-sm dark:prose-invert max-w-none",
                        "[&_a]:text-blue-500 [&_a]:underline",
                        "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50 empty:before:pointer-events-none"
                    )}
                    style={{ minHeight }}
                />
            </div>

            <p className="text-[10px] text-muted-foreground">
                Use the toolbar or keyboard shortcuts to format text. No HTML knowledge needed.
            </p>
        </div>
    );
}
