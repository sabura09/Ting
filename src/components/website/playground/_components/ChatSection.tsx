import React from 'react'
import {
  ArrowUp, SendHorizontal, Layout, Paperclip, X,
  ChevronDown, ChevronRight,
  Check, Eye, FileCode2, Loader2, Terminal, AlertCircle,
  Sparkles, Zap, ListChecks, MousePointerSquareDashed
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Messages, ThinkingAction } from '../playground'
import { motion, AnimatePresence } from 'framer-motion'

type Props = {
  messages: Messages[],
  onSend: (input: string, image: string | null) => void,
  loading: boolean,
  chatLoader: boolean,
  liveThinking?: string,
  visualEditsActive: boolean,
  setVisualEditsActive: (active: boolean) => void,
  selectedElementTag: string | null,
  clearSelection: () => void,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Strip HTML/code from a raw AI response and extract human-readable lines
 * that look like planning or thinking text.
 */
function extractThinkingLines(raw: string): string[] {
  // Remove code blocks
  const noCode = raw.replace(/```[\s\S]*?```/g, '').replace(/<[^>]*>/g, '')
  const lines = noCode
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 8 && !/^\s*[{}\[\]<>]/.test(l) && !/up\s*next:/i.test(l))
    .slice(0, 18) // cap so it doesn't get too long
  return lines
}

/**
 * Parse the final completed AI message for meaningful bullet-point summary items.
 * Returns up to 7 bullet lines.
 */
function extractSummaryLines(content: string): string[] {
  const noCode = content.replace(/```[\s\S]*?```/g, '').replace(/<[^>]*>/g, '')
  const lines = noCode
    .split('\n')
    .map(l => l.replace(/^[-*•]\s*/, '').trim())
    .filter(l => l.length > 15 && l.length < 120 && !/up\s*next:/i.test(l))
    .slice(0, 7)
  return lines
}

/**
 * Derive fake "action" items from the streamed text for visual richness.
 * In a real system these would come from the AI backend.
 */
function deriveActions(content: string): ThinkingAction[] {
  const actions: ThinkingAction[] = []
  if (/creat|generat|build/i.test(content)) {
    actions.push({ type: 'file_created', label: 'Generated HTML structure', detail: '+layout' })
  }
  if (/style|css|tailwind/i.test(content)) {
    actions.push({ type: 'file_modified', label: 'Applied styles & theme', detail: '+styles' })
  }
  if (/script|js|function|logic/i.test(content)) {
    actions.push({ type: 'file_created', label: 'Added interactive scripts', detail: '+logic' })
  }
  if (/compil|build|bundle/i.test(content)) {
    actions.push({ type: 'compiled', label: 'Compiled successfully' })
  }
  if (/screenshot|preview|viewport/i.test(content)) {
    actions.push({ type: 'screenshot', label: 'Took screenshot', detail: 'Viewport' })
  }
  return actions
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const ActionIcon = ({ type }: { type: ThinkingAction['type'] }) => {
  const base = 'w-3.5 h-3.5 shrink-0'
  switch (type) {
    case 'file_created': return <FileCode2 className={`${base} text-emerald-400`} />
    case 'file_modified': return <FileCode2 className={`${base} text-sky-400`} />
    case 'compiled': return <Check className={`${base} text-emerald-400`} />
    case 'screenshot': return <Eye className={`${base} text-violet-400`} />
    case 'error': return <AlertCircle className={`${base} text-red-400`} />
    default: return <Terminal className={`${base} text-zinc-400`} />
  }
}

const ActionRow = ({ action, index }: { action: ThinkingAction; index: number }) => (
  <motion.div
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.07 }}
    className="flex items-center gap-2 py-0.5"
  >
    <ActionIcon type={action.type} />
    <span className="text-[12px] font-medium text-gray-700 dark:text-zinc-300">{action.label}</span>
    {action.detail && (
      <span className="ml-auto text-[11px] font-mono text-emerald-600 dark:text-emerald-400 opacity-90">{action.detail}</span>
    )}
  </motion.div>
)

/** Live "Thinking…" panel shown while streaming */
const LiveThinkingPanel = ({ raw }: { raw: string }) => {
  const [open, setOpen] = React.useState(true)
  const lines = React.useMemo(() => extractThinkingLines(raw), [raw])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 dark:border-zinc-700/60 bg-gray-50 dark:bg-zinc-900/60 overflow-hidden shadow-sm"
    >
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <Loader2 className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 animate-spin shrink-0" />
        <span className="text-[12px] font-semibold text-gray-700 dark:text-zinc-300 tracking-wide">Thinking…</span>
        <span className="ml-auto text-gray-400 dark:text-zinc-600">
          {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </span>
      </button>

      {/* Body */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-1 border-t border-gray-200 dark:border-zinc-800/60">
              {lines.length === 0 ? (
                <p className="text-[11px] text-gray-400 dark:text-zinc-600 pt-2 italic">Collecting thoughts…</p>
              ) : (
                lines.map((line, i) => (
                  <motion.p
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="text-[11.5px] leading-relaxed text-gray-500 dark:text-zinc-500 pt-1.5"
                  >
                    {line}
                  </motion.p>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/** Completed AI message card */
const AiMessageCard = ({ msg, onSend }: { msg: Messages, onSend?: (input: string, image: string | null) => void }) => {
  const [thinkOpen, setThinkOpen] = React.useState(false)
  const isDesign = msg.content.includes('```html') || msg.content.includes('```json') || /<!DOCTYPE|<html|<body|<div/i.test(msg.content)
  const actions = React.useMemo(() => deriveActions(msg.content), [msg.content])
  const summaryLines = React.useMemo(() => isDesign ? extractSummaryLines(msg.content) : [], [msg.content, isDesign])
  const thinkLines = React.useMemo(() => extractThinkingLines(msg.content).slice(0, 10), [msg.content])

  if (!isDesign) {
    // Plain text reply
    return (
      <div className="rounded-2xl rounded-tl-none bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/50 shadow-sm overflow-hidden max-w-[90%]">
        <div className="p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap font-medium text-black dark:text-gray-100">
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl rounded-tl-none bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 shadow-md overflow-hidden max-w-[95%] space-y-0">

      {/* ── Thinking Accordion ─────────────────────────────── */}
      {thinkLines.length > 0 && (
        <div className="border-b border-gray-100 dark:border-zinc-800/50">
          <button
            onClick={() => setThinkOpen(o => !o)}
            className="w-full flex items-center gap-2 px-3.5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-zinc-800/30 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400 shrink-0" />
            <span className="text-[11.5px] font-semibold text-gray-500 dark:text-zinc-400 tracking-wide">Thinking</span>
            <span className="ml-auto text-gray-400 dark:text-zinc-600">
              {thinkOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </span>
          </button>

          <AnimatePresence>
            {thinkOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 space-y-1">
                  {thinkLines.map((line, i) => (
                    <p key={i} className="text-[11px] leading-relaxed text-gray-500 dark:text-zinc-500 pt-1">{line}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Action log ──────────────────────────────────────── */}
      {actions.length > 0 && (
        <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-zinc-800/50 space-y-0.5">
          {actions.map((a, i) => <ActionRow key={i} action={a} index={i} />)}
        </div>
      )}

      {/* ── Completed Milestone card ─────────────────────────── */}
      <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-zinc-800/50">
        <div className="flex items-start gap-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
          <div className="mt-0.5 p-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30">
            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Completed milestone</span>
            <span className="text-[12px] text-emerald-700 dark:text-emerald-300 font-medium line-through opacity-70">
              {extractMilestoneName(msg.content)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Design Generated label ───────────────────────────── */}
      <div className="px-3.5 py-2.5 border-b border-gray-100 dark:border-zinc-800/50">
        <div className="flex items-center gap-3 font-medium">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-500">
            <Layout className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {msg.content.includes('```json') ? 'New Presentation Generated' : 'New Design Generated'}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              {msg.content.includes('```json') ? 'Updated Slides' : 'Updated Viewport'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Summary ──────────────────────────────────────────── */}
      {summaryLines.length > 0 && (
        <div className="px-3.5 py-3 border-b border-gray-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-1.5 mb-2">
            <ListChecks className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
            <span className="text-[11px] font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">What was built</span>
          </div>
          <ul className="space-y-1.5">
            {summaryLines.map((line, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-2 text-[12px] text-gray-600 dark:text-zinc-400"
              >
                <span className="mt-1.5 w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                {line}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Up Next ──────────────────────────────────────────── */}
      <UpNextCard content={msg.content} onSend={onSend} />
    </div>
  )
}

/** Extracts a plausible milestone name from the content */
function extractMilestoneName(content: string): string {
  const match = content.match(/(?:built|created|generated|designed)[:\s]+([A-Za-z\s\-]+?)(?:\.|,|$)/im)
  if (match) return match[1].trim().slice(0, 48)
  const noCode = content.replace(/```[\s\S]*?```/g, '').replace(/<[^>]*>/g, '')
  const firstLine = noCode.split('\n').find(l => l.trim().length > 10)
  return firstLine?.trim().slice(0, 48) || 'Initial design build'
}

/**
 * Analyses the AI-generated content and returns a contextually relevant
 * "Up next" suggestion based on what was actually built.
 */
function deriveUpNext(content: string): string {
  // First, check if the AI provided an explicit "Up Next:" suggestion
  const aiSuggestionMatch = content.match(/Up\s*Next:\s*(.+)/i);
  if (aiSuggestionMatch && aiSuggestionMatch[1]) {
    const suggestion = aiSuggestionMatch[1].replace(/[*`"]/g, '').trim();
    if (suggestion) return suggestion;
  }

  const c = content.toLowerCase()

  // Priority-ordered rules: first match wins
  const rules: [RegExp, string][] = [
    // Auth / login already present → suggest profile or dashboard
    [/login|sign.?in|auth|oauth|password/, 'Build a user profile & settings page'],
    // Dashboard already there → suggest charts or data
    [/dashboard|analytics|kpi|metric|stat/, 'Add real-time charts & data visualisation'],
    // Landing page → suggest pricing or CTA section
    [/landing|hero|banner|above.the.fold/, 'Add a pricing section & call-to-action'],
    // E-commerce / shop → suggest cart
    [/product|shop|store|cart|checkout|ecommerce/, 'Implement a shopping cart & checkout flow'],
    // Blog / articles → suggest comment system
    [/blog|article|post|markdown/, 'Add a comments & reactions system'],
    // Form already built → suggest validation
    [/form|input|field|textarea|submit/, 'Add client-side validation & error states'],
    // Navigation / sidebar → suggest responsive mobile nav
    [/navbar|sidebar|navigation|menu/, 'Make navigation fully responsive for mobile'],
    // Dark mode mentioned → suggest light/dark toggle
    [/dark.mode|dark.theme|theme.toggle/, 'Add a smooth light / dark mode toggle'],
    // Table / data grid → suggest pagination or search
    [/table|grid|row|column|paginate/, 'Add search, filter & pagination to the table'],
    // Card components → suggest skeleton loaders
    [/card|tile|panel/, 'Add skeleton loaders & empty-state UI'],
    // Modal / dialog → suggest drawer
    [/modal|dialog|popup|overlay/, 'Convert modals to a slide-over drawer panel'],
    // Chart or graph → suggest export
    [/chart|graph|pie|bar|line.chart/, 'Add CSV / PDF export for charts'],
    // Profile / avatar → suggest notifications
    [/profile|avatar|user.pic/, 'Build a notifications dropdown & badge system'],
    // Maps → suggest filters
    [/map|location|geolocation/, 'Add location filters & cluster markers'],
    // Calendar → suggest event creation
    [/calendar|schedule|event/, 'Add drag-and-drop event creation'],
  ]

  for (const [pattern, suggestion] of rules) {
    if (pattern.test(c)) return suggestion
  }

  // Generic fallback based on overall complexity
  if (c.includes('api') || c.includes('fetch') || c.includes('axios')) {
    return 'Connect a real backend API & handle loading / error states'
  }
  return 'Add responsive mobile layout & accessibility improvements'
}

/** "Up Next" footer widget — dynamically derived from the AI response */
const UpNextCard = ({ content, onSend }: { content: string, onSend?: (input: string, image: string | null) => void }) => {
  const suggestion = React.useMemo(() => deriveUpNext(content), [content])

  return (
    <div className="px-3.5 py-3 bg-gray-50 dark:bg-zinc-900/40">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 dark:border-zinc-700/50 bg-white dark:bg-zinc-800/50 p-3">
        <div className="flex items-start gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">Up next</span>
            <span className="text-[12px] text-gray-700 dark:text-zinc-300 font-medium leading-relaxed">{suggestion}</span>
          </div>
        </div>
        <button
          onClick={() => onSend && onSend(suggestion, null)}
          className="w-full text-center text-[11px] font-semibold px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Build it
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ChatSection = ({
  messages,
  onSend,
  loading,
  chatLoader,
  liveThinking,
  visualEditsActive,
  setVisualEditsActive,
  selectedElementTag,
  clearSelection
}: Props) => {
  const [input, setInput] = React.useState<string>("")
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, liveThinking]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;
    onSend(input, selectedImage);
    setInput("");
    setSelectedImage(null);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`
    w-full md:max-w-[40%] lg:max-w-[30%] shrink-0
    h-[calc(100%-2rem)] flex-col
    border border-gray-200 dark:border-zinc-800
    bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
    rounded-2xl overflow-hidden
    m-4
    relative z-10 shadow-sm
    ${visualEditsActive ? 'hidden 2xl:flex' : 'flex'}
    `}>
      {/* Header */}
      <div className='p-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-white/50 dark:bg-zinc-900/50'>
        <div>
          <h2 className='font-outfit font-bold text-xl tracking-tight'>Design Chat</h2>
          <p className='text-xs text-gray-500 dark:text-zinc-400 font-medium'>AI-Powered Assistant</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className='flex-1 overflow-y-auto p-4 space-y-4 flex flex-col scroll-smooth scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-800'
      >
        {/* Skeleton loader */}
        {(chatLoader && messages?.length === 0) ?
          [1, 2, 3].map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="w-[60%] h-12 rounded-2xl opacity-50" />
              <Skeleton className="w-[80%] h-20 rounded-2xl opacity-30" />
            </div>
          ))
          :
          /* Empty state */
          (messages?.length === 0) ? (
            <div className='flex-1 flex flex-col items-center justify-center text-center space-y-4 opacity-60'>
              <div className="p-6 rounded-3xl bg-blue-50 dark:bg-blue-900/20 rotate-12 transition-transform hover:rotate-0 duration-500">
                <SendHorizontal className="w-10 h-10 text-blue-500" />
              </div>
              <div className='max-w-[200px]'>
                <p className='text-sm font-semibold'>Ready to build something iconic?</p>
                <p className='text-xs mt-1 text-gray-500'>Describe your vision or upload a reference image to begin.</p>
              </div>
            </div>
          ) :
            /* Message list */
            messages?.map((msg, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.25 }}
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  /* User bubble */
                  <div className="group relative rounded-2xl max-w-[90%] break-words shadow-sm overflow-hidden rounded-tr-none bg-blue-600 text-white">
                    {msg.image && (
                      <div className="relative w-full overflow-hidden group/img">
                        <img
                          src={msg.image}
                          alt="Design Reference"
                          className="w-full max-h-[350px] object-cover block transition-transform duration-500 group-hover/img:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
                      </div>
                    )}
                    {msg.elementTag && (
                      <div className="px-3.5 pt-3 pb-0 flex items-center gap-1.5">
                        <MousePointerSquareDashed size={11} className="text-blue-200/70" />
                        <span className="px-1.5 py-0.5 bg-white/15 backdrop-blur-sm text-[10px] font-bold font-mono tracking-wide rounded border border-white/20 uppercase">
                          {msg.elementTag}
                        </span>
                      </div>
                    )}
                    {msg.content && (
                      <div className="p-3.5 text-[13px] leading-relaxed font-medium">{msg.content}</div>
                    )}
                  </div>
                ) : (
                  /* AI message — rich card */
                  <AiMessageCard msg={msg} onSend={onSend} />
                )}
              </motion.div>
            ))
        }

        {/* Live thinking panel (streaming) */}
        <AnimatePresence>
          {loading && liveThinking && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="w-full max-w-[95%]">
                <LiveThinkingPanel raw={liveThinking} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generic loading pulse (before any thinking text arrives) */}
        {loading && !liveThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className='flex items-start gap-3'
          >
            <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center animate-pulse'>
              <div className='w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin' />
            </div>
            <div className='bg-blue-50/50 dark:bg-blue-900/10 p-3 px-4 rounded-2xl rounded-tl-none border border-blue-100 dark:border-blue-900/20'>
              <span className='text-xs font-medium text-blue-600 dark:text-blue-400'>AI is crafting your design…</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer input */}
      <div className='p-4 border-t border-gray-100 dark:border-zinc-800 space-y-4 bg-white/50 dark:bg-zinc-900/50'>
        {/* Selected Element Badge */}
        <AnimatePresence>
          {selectedElementTag && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex items-center justify-between bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 p-2.5 px-3.5 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-500 dark:text-zinc-505 uppercase tracking-wider flex items-center gap-1">
                  <MousePointerSquareDashed size={12} className="text-gray-400 dark:text-zinc-550" /> Design
                </span>
                <span className="text-gray-300 dark:text-zinc-700">/</span>
                <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 rounded text-[10px] font-bold tracking-wide font-mono uppercase">
                  {selectedElementTag}
                </span>
              </div>
              <button
                onClick={clearSelection}
                className="text-gray-400 dark:text-zinc-500 hover:text-gray-650 dark:hover:text-zinc-300 transition-colors p-1"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image preview */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative group w-24 h-24"
            >
              <img
                src={selectedImage}
                alt="Upload preview"
                className="w-full h-full object-cover rounded-2xl border-2 border-blue-500 shadow-xl"
              />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-all hover:scale-110 active:scale-95"
              >
                <X size={12} strokeWidth={3} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className='relative flex flex-col bg-white/50 dark:bg-zinc-900/50 rounded-[28px] p-2 border border-gray-200 dark:border-zinc-800 focus-within:border-blue-500/50 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all shadow-sm gap-2'>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*"
          />

          <textarea
            value={input}
            disabled={loading}
            placeholder='Ask for modifications or share a vibe...'
            rows={1}
            className='
              w-full resize-none bg-transparent py-2.5 px-3
              text-[14px] text-black placeholder-gray-400
              outline-none focus:outline-none focus:ring-0 focus:border-transparent focus-visible:ring-0 focus-visible:outline-none border-0 !border-0 !ring-0 !outline-none
              dark:text-white
              dark:placeholder-zinc-500
              min-h-[44px] max-h-40
              scrollbar-hide
              disabled:opacity-50
              font-medium
              rounded-[20px]
            '
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading) {
                  handleSend();
                }
              }
            }}
            onPaste={(e) => {
              const items = e.clipboardData?.items;
              if (items) {
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setSelectedImage(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                      e.preventDefault();
                    }
                  }
                }
              }
            }}
          />

          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={openFileDialog}
                className="rounded-full h-9 w-9 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all shrink-0"
                disabled={loading}
              >
                <Paperclip size={18} />
              </Button>

              <Button
                type="button"
                onClick={() => setVisualEditsActive(!visualEditsActive)}
                className={`
                  flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[12px] font-bold tracking-wide transition-all border shadow-sm
                  ${visualEditsActive
                    ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500/50'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-350 dark:border-zinc-700'}
                `}
              >
                <MousePointerSquareDashed size={14} className={visualEditsActive ? 'animate-pulse text-white' : 'text-zinc-400 dark:text-zinc-500'} />
                <span>Visual edits</span>
              </Button>
            </div>

            <Button
              onClick={handleSend}
              size="icon"
              disabled={(!input.trim() && !selectedImage) || loading}
              className={`
                rounded-full w-9 h-9 transition-all duration-300 shrink-0
                ${(!input.trim() && !selectedImage)
                  ? 'bg-gray-200 dark:bg-zinc-700 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 active:scale-90'}
              `}
            >
              <ArrowUp size={16} strokeWidth={2.5} />
            </Button>
          </div>
        </div>
        <p className='text-[10px] text-center text-gray-400 dark:text-zinc-500 font-medium'>
          Press <span className='px-1 py-0.5 border border-gray-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900'>Enter</span> to send
        </p>
      </div>
    </div>
  )
}

export default ChatSection
