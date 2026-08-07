import React, { useEffect, useState } from 'react'
import {
    CircleX, Settings, Type, Palette, Move, Shield, Sparkles, Send,
    AlignLeft, AlignCenter, AlignRight, AlignJustify
} from 'lucide-react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

type Props = {
    selectedEl: any,
    clearSelection: () => void;
    onStyleChange: () => void;
    onSendTargetedPrompt: (prompt: string) => void;
}

function ElementSetting({ selectedEl, clearSelection, onStyleChange, onSendTargetedPrompt }: Props) {
    const [align, setAlign] = useState("left");
    const [fontSize, setFontSize] = useState("16px");
    const [fontStyle, setFontStyle] = useState("normal");
    const [fontWeight, setFontWeight] = useState("400");

    const [textColor, setTextColor] = useState("#ffffff");
    const [bgColor, setBgColor] = useState("transparent");

    const [marginTop, setMarginTop] = useState("0");
    const [marginRight, setMarginRight] = useState("0");
    const [marginBottom, setMarginBottom] = useState("0");
    const [marginLeft, setMarginLeft] = useState("0");

    const [paddingTop, setPaddingTop] = useState("0");
    const [paddingRight, setPaddingRight] = useState("0");
    const [paddingBottom, setPaddingBottom] = useState("0");
    const [paddingLeft, setPaddingLeft] = useState("0");

    const [borderWidth, setBorderWidth] = useState("0px");
    const [borderColor, setBorderColor] = useState("transparent");
    const [borderStyle, setBorderStyle] = useState("none");
    const [borderRadius, setBorderRadius] = useState("0px");

    // Dynamic prompt text state
    const [promptText, setPromptText] = useState("");

    const applyStyle = (property: string, value: string) => {
        if (selectedEl) {
            selectedEl.style[property as any] = value;
            onStyleChange();
        }
    };

    // Helper: convert rgb/rgba to hex for standard color picker inputs
    const rgbToHex = (rgbStr: string): string => {
        if (!rgbStr || rgbStr === 'transparent') return '#ffffff';
        const match = rgbStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return rgbStr;
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    };

    const parsePixelVal = (val: string) => {
        if (!val) return "0";
        const cleaned = val.replace(/px/g, '').trim();
        return cleaned === "" ? "0" : cleaned;
    };

    // Sync state when selectedEl changes
    useEffect(() => {
        if (selectedEl) {
            setMarginTop(parsePixelVal(selectedEl.style.marginTop));
            setMarginRight(parsePixelVal(selectedEl.style.marginRight));
            setMarginBottom(parsePixelVal(selectedEl.style.marginBottom));
            setMarginLeft(parsePixelVal(selectedEl.style.marginLeft));

            setPaddingTop(parsePixelVal(selectedEl.style.paddingTop));
            setPaddingRight(parsePixelVal(selectedEl.style.paddingRight));
            setPaddingBottom(parsePixelVal(selectedEl.style.paddingBottom));
            setPaddingLeft(parsePixelVal(selectedEl.style.paddingLeft));

            setTextColor(rgbToHex(selectedEl.style.color) || "#000000");
            setBgColor(rgbToHex(selectedEl.style.backgroundColor) || "#ffffff");

            setBorderWidth(selectedEl.style.borderWidth || "0px");
            setBorderStyle(selectedEl.style.borderStyle || "none");
            setBorderColor(rgbToHex(selectedEl.style.borderColor) || "#000000");
            setBorderRadius(selectedEl.style.borderRadius || "0px");

            setFontSize(selectedEl.style.fontSize || "16px");
            setFontStyle(selectedEl.style.fontStyle || "normal");
            setFontWeight(selectedEl.style.fontWeight || "400");
            setAlign(selectedEl.style.textAlign || "left");
        }
    }, [selectedEl]);

    const handleSendPrompt = () => {
        if (!promptText.trim()) return;
        onSendTargetedPrompt(promptText.trim());
        setPromptText("");
    };

    const tagName = selectedEl?.tagName?.toLowerCase() || "element";

    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className='w-96 shrink-0 shadow-2xl p-5 space-y-6 overflow-y-auto h-[88vh] rounded-2xl mt-4 mr-4 bg-white/95 dark:bg-zinc-950/95 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 flex flex-col justify-between scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800'
        >
            <div className="space-y-6">
                {/* Header */}
                <div className='flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-3'>
                    <h2 className='flex items-center gap-2 font-bold font-outfit text-lg tracking-wide text-gray-900 dark:text-white'>
                        <Settings className="w-5 h-5 text-blue-500 animate-pulse" />
                        <span>Visual edits</span>
                    </h2>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={clearSelection}
                        className="text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800/80 rounded-lg px-3 py-1 text-xs"
                    >
                        Close
                    </Button>
                </div>

                {/* Typography */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" /> Typography
                    </span>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className='text-xs text-gray-500 dark:text-zinc-400 font-medium'>Font size</label>
                            <Select 
                                value={fontSize}
                                onValueChange={(value) => {
                                    setFontSize(value);
                                    applyStyle('fontSize', value);
                                }}
                            >
                                <SelectTrigger className="w-full bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-blue-500/20 text-xs h-9">
                                    <SelectValue placeholder="Font size" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100">
                                    {['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '40px', '48px'].map((size) => (
                                        <SelectItem value={size} key={size} className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">
                                            {size === '16px' ? 'Normal (16px)' : size}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className='text-xs text-gray-500 dark:text-zinc-400 font-medium'>Font style</label>
                            <Select 
                                value={fontStyle}
                                onValueChange={(value) => {
                                    setFontStyle(value);
                                    applyStyle('fontStyle', value);
                                }}
                            >
                                <SelectTrigger className="w-full bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-blue-500/20 text-xs h-9">
                                    <SelectValue placeholder="Font style" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100">
                                    <SelectItem value="normal" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Normal</SelectItem>
                                    <SelectItem value="italic" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Italic</SelectItem>
                                    <SelectItem value="oblique" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Oblique</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-end">
                        <div className="space-y-1">
                            <label className='text-xs text-gray-500 dark:text-zinc-400 font-medium'>Font weight</label>
                            <Select 
                                value={fontWeight}
                                onValueChange={(value) => {
                                    setFontWeight(value);
                                    applyStyle('fontWeight', value);
                                }}
                            >
                                <SelectTrigger className="w-full bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-blue-500/20 text-xs h-9">
                                    <SelectValue placeholder="Font weight" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100">
                                    <SelectItem value="300" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Light (300)</SelectItem>
                                    <SelectItem value="400" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Regular (400)</SelectItem>
                                    <SelectItem value="500" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Medium (500)</SelectItem>
                                    <SelectItem value="600" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Semi-Bold (600)</SelectItem>
                                    <SelectItem value="700" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Bold (700)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 dark:text-zinc-400 font-medium block">Alignment</label>
                            <ToggleGroup
                                type="single"
                                value={align}
                                onValueChange={(val) => {
                                    if (val) {
                                        setAlign(val);
                                        applyStyle('textAlign', val);
                                    }
                                }}
                                className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg p-0.5 inline-flex w-full justify-between h-9"
                            >
                                <ToggleGroupItem value="left" className="p-1 rounded-md text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white data-[state=on]:bg-white dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-blue-500 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm flex-1 transition-all">
                                    <AlignLeft size={16} />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="center" className="p-1 rounded-md text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white data-[state=on]:bg-white dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-blue-500 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm flex-1 transition-all">
                                    <AlignCenter size={16} />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="right" className="p-1 rounded-md text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white data-[state=on]:bg-white dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-blue-500 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm flex-1 transition-all">
                                    <AlignRight size={16} />
                                </ToggleGroupItem>
                                <ToggleGroupItem value="justify" className="p-1 rounded-md text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white data-[state=on]:bg-white dark:data-[state=on]:bg-zinc-800 data-[state=on]:text-blue-500 dark:data-[state=on]:text-blue-400 data-[state=on]:shadow-sm flex-1 transition-all">
                                    <AlignJustify size={16} />
                                </ToggleGroupItem>
                            </ToggleGroup>
                        </div>
                    </div>
                </div>

                {/* Colors */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" /> Colors
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 dark:text-zinc-400 font-medium block">Text color</label>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl h-9">
                                <div className="relative w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                    <input 
                                        type='color'
                                        className='absolute inset-0 w-full h-full cursor-pointer opacity-0'
                                        value={textColor.startsWith("#") ? textColor : "#000000"}
                                        onChange={(event) => {
                                            setTextColor(event.target.value);
                                            applyStyle('color', event.target.value);
                                        }}
                                    />
                                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: textColor }} />
                                </div>
                                <span className="text-[11px] text-gray-600 dark:text-zinc-300 font-mono truncate">{textColor === 'inherit' ? 'Inherit' : textColor}</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 dark:text-zinc-400 font-medium block">Background color</label>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl h-9">
                                <div className="relative w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                    <input 
                                        type='color'
                                        className='absolute inset-0 w-full h-full cursor-pointer opacity-0'
                                        value={bgColor.startsWith("#") ? bgColor : "#ffffff"}
                                        onChange={(event) => {
                                            setBgColor(event.target.value);
                                            applyStyle('backgroundColor', event.target.value);
                                        }}
                                    />
                                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: bgColor }} />
                                </div>
                                <span className="text-[11px] text-gray-600 dark:text-zinc-300 font-mono truncate">{bgColor === 'transparent' ? 'Transparent' : bgColor}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spacing */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Move className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" /> Spacing
                    </span>

                    <div className="space-y-2.5">
                        <div>
                            <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-semibold mb-1 block">Margin</span>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: 'Top', val: marginTop, set: setMarginTop, styleProp: 'marginTop' },
                                    { label: 'Right', val: marginRight, set: setMarginRight, styleProp: 'marginRight' },
                                    { label: 'Bottom', val: marginBottom, set: setMarginBottom, styleProp: 'marginBottom' },
                                    { label: 'Left', val: marginLeft, set: setMarginLeft, styleProp: 'marginLeft' }
                                ].map((item) => (
                                    <div key={item.label} className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-xl p-1.5 text-center flex flex-col items-center">
                                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wide">{item.label}</span>
                                        <input
                                            type="text"
                                            value={item.val}
                                            onChange={(e) => {
                                                item.set(e.target.value);
                                                applyStyle(item.styleProp, e.target.value + (isNaN(Number(e.target.value)) ? '' : 'px'));
                                            }}
                                            className="w-full text-center bg-transparent border-none text-gray-700 dark:text-zinc-200 text-xs focus:ring-0 focus:outline-none p-0 mt-0.5 font-bold"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <span className="text-[11px] text-gray-500 dark:text-zinc-400 font-semibold mb-1 block">Padding</span>
                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { label: 'Top', val: paddingTop, set: setPaddingTop, styleProp: 'paddingTop' },
                                    { label: 'Right', val: paddingRight, set: setPaddingRight, styleProp: 'paddingRight' },
                                    { label: 'Bottom', val: paddingBottom, set: setPaddingBottom, styleProp: 'paddingBottom' },
                                    { label: 'Left', val: paddingLeft, set: setPaddingLeft, styleProp: 'paddingLeft' }
                                ].map((item) => (
                                    <div key={item.label} className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-850 rounded-xl p-1.5 text-center flex flex-col items-center">
                                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-wide">{item.label}</span>
                                        <input
                                            type="text"
                                            value={item.val}
                                            onChange={(e) => {
                                                item.set(e.target.value);
                                                applyStyle(item.styleProp, e.target.value + (isNaN(Number(e.target.value)) ? '' : 'px'));
                                            }}
                                            className="w-full text-center bg-transparent border-none text-gray-700 dark:text-zinc-200 text-xs focus:ring-0 focus:outline-none p-0 mt-0.5 font-bold"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Border */}
                <div className="space-y-3">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" /> Border
                    </span>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className='text-xs text-gray-500 dark:text-zinc-400 font-medium'>Border width</label>
                            <Select 
                                value={borderWidth}
                                onValueChange={(value) => {
                                    setBorderWidth(value);
                                    applyStyle('borderWidth', value);
                                }}
                            >
                                <SelectTrigger className="w-full bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-blue-500/20 text-xs h-9">
                                    <SelectValue placeholder="Width" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100">
                                    {['0px', '1px', '2px', '3px', '4px', '8px'].map((w) => (
                                        <SelectItem value={w} key={w} className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">
                                            {w}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 dark:text-zinc-400 font-medium block">Border color</label>
                            <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl h-9">
                                <div className="relative w-4 h-4 rounded-full border border-gray-300 dark:border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                                    <input 
                                        type='color'
                                        className='absolute inset-0 w-full h-full cursor-pointer opacity-0'
                                        value={borderColor.startsWith("#") ? borderColor : "#000000"}
                                        onChange={(event) => {
                                            setBorderColor(event.target.value);
                                            applyStyle('borderColor', event.target.value);
                                        }}
                                    />
                                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: borderColor }} />
                                </div>
                                <span className="text-[11px] text-gray-600 dark:text-zinc-300 font-mono truncate">{borderColor}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className='text-xs text-gray-500 dark:text-zinc-400 font-medium'>Border style</label>
                            <Select 
                                value={borderStyle}
                                onValueChange={(value) => {
                                    setBorderStyle(value);
                                    applyStyle('borderStyle', value);
                                }}
                            >
                                <SelectTrigger className="w-full bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 focus:ring-blue-500/20 text-xs h-9">
                                    <SelectValue placeholder="Style" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100">
                                    <SelectItem value="none" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">None</SelectItem>
                                    <SelectItem value="solid" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Solid</SelectItem>
                                    <SelectItem value="dashed" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Dashed</SelectItem>
                                    <SelectItem value="dotted" className="hover:bg-gray-100 dark:hover:bg-zinc-800 focus:bg-gray-100 dark:focus:bg-zinc-800 cursor-pointer">Dotted</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Border radius</label>
                            <Input 
                                type="text"
                                placeholder="e.g. 8px"
                                value={borderRadius}
                                onChange={(e) => {
                                    setBorderRadius(e.target.value);
                                    applyStyle('borderRadius', e.target.value);
                                }}
                                className="bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-blue-500/20 text-xs h-9"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Target prompt block */}
            <div className="bg-gray-50/80 dark:bg-zinc-900/80 border border-gray-200 dark:border-zinc-800/80 p-3 rounded-2xl mt-4 space-y-2">
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase tracking-wide">Design</span>
                    <span className="text-[10px] text-gray-400 dark:text-zinc-600">/</span>
                    <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 rounded text-[10px] font-bold tracking-wide font-mono uppercase">
                        {tagName}
                    </span>
                </div>

                <div className="relative flex items-center bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800/80 rounded-xl p-1 focus-within:border-blue-500/50 transition-colors">
                    <input 
                        type="text"
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        placeholder="Ask AI to modify selected..."
                        className="flex-1 bg-transparent border-none text-xs text-gray-800 dark:text-zinc-200 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:ring-0 focus:outline-none px-2 py-1.5"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSendPrompt();
                            }
                        }}
                    />
                    <Button 
                        size="icon" 
                        onClick={handleSendPrompt}
                        disabled={!promptText.trim()}
                        className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shrink-0 shadow-md shadow-blue-500/10 active:scale-90 transition-transform"
                    >
                        <Send size={12} strokeWidth={2.5} />
                    </Button>
                </div>
            </div>
        </motion.div>
    )
}

export default ElementSetting
