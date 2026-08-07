import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getModelById, AVAILABLE_MODELS, AIModel } from '@/lib/models';
import OpenAI from 'openai';
import { getFeatureById } from '@/lib/features';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } catch (err: any) {
        if (err.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}
function sanitizeSchemaTypes(schema: any): any {
    if (!schema || typeof schema !== 'object') return schema;

    const newSchema = Array.isArray(schema) ? [...schema] : { ...schema };

    for (const key in newSchema) {
        if (key === 'type' && typeof newSchema[key] === 'string') {
            const lowerType = newSchema[key].toLowerCase();
            if (['string', 'number', 'integer', 'boolean', 'array', 'object', 'null'].includes(lowerType)) {
                newSchema[key] = lowerType;
            }
        } else if (typeof newSchema[key] === 'object') {
            newSchema[key] = sanitizeSchemaTypes(newSchema[key]);
        }
    }

    return newSchema;
}

// Browser Control tool definitions — used when tool === 'browser-control'
const browserToolsSchema = [
    {
        name: "browser_search",
        description: "Search the web using a search engine and return a list of matching organic results with titles, URLs, and snippets.",
        parameters: {
            type: "OBJECT",
            properties: {
                query: { type: "STRING", description: "The search query string (e.g. 'latest OpenAI updates 2025')." }
            },
            required: ["query"]
        }
    },
    {
        name: "browser_navigate",
        description: "Navigate to a specific URL and extract the page's visible text content and key links. Use this to read articles, documentation, product pages, or any web page.",
        parameters: {
            type: "OBJECT",
            properties: {
                url: { type: "STRING", description: "The full URL to navigate to (e.g. 'https://example.com/page')." }
            },
            required: ["url"]
        }
    }
];

async function prepareContent(aiModel: AIModel, body: any) {
    const provider = aiModel.provider;
    const prompt = body.prompt;

    // Auto-inject browser tools when browser-control is the active tool
    if (body.tool === 'browser-control' && !body.tools) {
        body.tools = browserToolsSchema;
    }

    const tools = body.tools;
    let content = body.content;

    // If simple prompt is provided, convert to Gemini/OpenAI format
    if (!content && prompt) {
        let processedImage = body.image;
        let mimeType = body.imageMimeType || 'image/jpeg';

        if (processedImage && processedImage.startsWith('data:')) {
            const match = processedImage.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                mimeType = match[1];
                processedImage = match[2];
            }
        }

        if (provider === 'openai' || provider === 'nvidia') {
            const messages: any[] = [];
            if (body.systemPrompt) {
                let systemPrompt = body.systemPrompt;
                const tool = body.tool || 'unknown';
                if ((aiModel.id === 'meta/llama-3.1-8b-instruct' || aiModel.id === 'meta/llama-3.2-11b-vision-instruct') && (tool === 'website' || tool === 'game-maker')) {
                    systemPrompt = `${systemPrompt}

═══════════════════════════════════════════════════════════════════
CRITICAL SYSTEM INSTRUCTION FOR META LLAMA (PRODUCTION-LEVEL DESIGN)
═══════════════════════════════════════════════════════════════════

You are a World-Class, Award-Winning UI/UX Frontend Designer generating
gorgeous, premium, production-ready HTML with Tailwind CSS utility classes.
Every output MUST be visually stunning, responsive, and free of layout bugs.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: MANDATORY LAYOUT ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1.1 ROOT CONTAINER (ALWAYS REQUIRED):
    Every design must begin with a full-screen centered container:
    <div class="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-gray-100 to-blue-50/30">
      <!-- main card/content here -->
    </div>

1.2 CARD CONTAINER (for single cards, forms, profiles):
    Use max-w-lg ONLY for single cards, login forms, profile cards, etc.:
    <div class="w-full max-w-lg mx-auto bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-200/50 border border-white/60 overflow-hidden">
      <div class="p-6 sm:p-8 lg:p-10 space-y-6">
        <!-- content -->
      </div>
    </div>

    ⚠️ CRITICAL: For DASHBOARDS, landing pages, multi-section layouts, or anything with
    sidebars/grids/tables, use max-w-6xl or max-w-7xl instead of max-w-lg!

1.3 FLEXBOX & GRID RULES:
    - ALL multi-element rows MUST use: "flex flex-col sm:flex-row gap-3 items-stretch"
    - NEVER place input + button side-by-side without responsive stacking.
    - Input fields must ALWAYS be "w-full" inside their flex child container.
    - Buttons beside inputs must be in a separate flex child: <div class="shrink-0">...</div>
    - For multi-column layouts use: "grid grid-cols-1 sm:grid-cols-2 gap-4"

1.4 SECTION SPACING:
    - Use "space-y-6" inside cards for vertical section rhythm.
    - Use "mb-1" or "mb-2" between label and its input — NOT "mb-6".
    - Use horizontal dividers ONLY as: <div class="border-t border-slate-100 my-6"></div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: PREMIUM TYPOGRAPHY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2.1 HEADINGS:
    - Primary title: "text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900"
    - For gradient headings: add "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
    - Subtitle: "text-sm sm:text-base text-slate-500 font-medium"
    - Section headers: "text-xs font-bold uppercase tracking-widest text-slate-400"

2.2 BODY TEXT:
    - Default: "text-sm text-slate-600 leading-relaxed"
    - Small/meta: "text-xs text-slate-400 font-medium"

2.3 OVERFLOW PROTECTION (CRITICAL):
    - ALL text containers MUST include: "break-words overflow-hidden"
    - Long names/titles: "truncate" or "line-clamp-2"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: INPUT FIELDS (PREMIUM PATTERN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALWAYS use this exact pattern for inputs:
<div class="space-y-1.5">
  <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
  <div class="relative">
    <span class="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 pointer-events-none">
      <i class="fa fa-envelope text-sm"></i>
    </span>
    <input type="email" placeholder="you@example.com"
      class="w-full pl-11 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all duration-200 hover:bg-slate-50" />
  </div>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: BUTTONS (PREMIUM PATTERN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4.1 PRIMARY BUTTON (always full-width inside cards):
    <button class="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0">
      Submit
    </button>

4.2 SECONDARY BUTTON:
    <button class="w-full py-3 px-6 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-sm font-semibold text-slate-700 rounded-xl shadow-sm transition-all duration-200">
      Cancel
    </button>

4.3 ICON BUTTON:
    <button class="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-200">
      <i class="fa fa-heart text-sm"></i>
    </button>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5: PROGRESS BARS & SKILL BARS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<div class="space-y-3">
  <div class="space-y-1.5">
    <div class="flex justify-between text-xs font-medium">
      <span class="text-slate-600">React</span>
      <span class="text-blue-600">92%</span>
    </div>
    <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div class="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style="width: 92%"></div>
    </div>
  </div>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6: PROFILE / AVATAR IMAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<div class="flex justify-center">
  <div class="relative">
    <img src="/1.jpg" alt="Profile" class="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-lg" />
    <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white"></div>
  </div>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7: SEPARATORS / DIVIDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<div class="relative my-6">
  <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-slate-200"></div></div>
  <div class="relative flex justify-center"><span class="bg-white px-4 text-xs uppercase text-slate-400 font-semibold tracking-wider">Or</span></div>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8: LISTS & INFO ROWS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use this pattern for key-value info (education, experience, etc.):
<div class="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
  <span class="text-sm text-slate-500 font-medium">Education</span>
  <span class="text-sm text-slate-800 font-semibold text-right">Boston University</span>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9: DASHBOARD LAYOUTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For dashboards, ALWAYS use a high-fidelity enterprise-grade grid layout. Below is the ultimate blueprint:

<div class="min-h-screen w-full bg-slate-50/50 flex">
  <!-- 1. LEFT SIDEBAR (Premium Glassmorphism Nav) -->
  <aside class="hidden lg:flex flex-col w-64 bg-white/80 backdrop-blur-xl border-r border-slate-100 p-6 shrink-0 justify-between">
    <div class="space-y-8">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-premium">
          <i class="fa fa-cubes text-white text-base"></i>
        </div>
        <span class="text-base font-bold text-slate-800 tracking-tight">Enterprise Suite</span>
      </div>
      <nav class="space-y-1">
        <a href="#" class="flex items-center gap-3 px-4 py-3 bg-brand-50 text-brand-700 font-semibold text-sm rounded-xl border-l-4 border-brand-600 transition-all">
          <i class="fa fa-chart-line text-brand-600"></i> Dashboard
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium text-sm rounded-xl transition-all">
          <i class="fa fa-folder text-slate-400 group-hover:text-brand-500"></i> Projects
        </a>
        <a href="#" class="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-brand-600 hover:bg-slate-50 font-medium text-sm rounded-xl transition-all">
          <i class="fa fa-cog text-slate-400 group-hover:text-brand-500"></i> Settings
        </a>
      </nav>
    </div>
    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
      <div class="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">AM</div>
      <div>
        <h4 class="text-xs font-bold text-slate-800">Alex Morgan</h4>
        <p class="text-[10px] font-medium text-slate-400">Workspace Owner</p>
      </div>
    </div>
  </aside>

  <!-- 2. MAIN CONTENT AREA -->
  <main class="flex-1 min-w-0 flex flex-col">
    <!-- Top Nav Header -->
    <header class="h-16 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      <div class="flex items-center gap-4 flex-1">
        <div class="relative w-full max-w-md hidden sm:block">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400"><i class="fa fa-search text-sm"></i></span>
          <input type="text" placeholder="Search workspace... (Press ⌘K)" class="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
        </div>
      </div>
      <div class="flex items-center gap-4">
        <button class="relative p-2.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50">
          <i class="fa fa-bell text-sm"></i>
          <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
      </div>
    </header>

    <div class="p-6 sm:p-8 space-y-8 max-w-7xl w-full mx-auto">
      <!-- Title Block -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">Workspace Dashboard</h1>
          <p class="text-sm text-slate-500 mt-1">Real-time overview of current active developer sprints and integrations.</p>
        </div>
        <div class="flex gap-3">
          <button class="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-sm hover:bg-slate-50">Filter Settings</button>
          <button class="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-semibold text-xs rounded-xl shadow-premium">New Project</button>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-premium hover:shadow-premium-hover transition-all duration-300">
          <div class="flex items-center justify-between mb-4">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
            <div class="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><i class="fa fa-users text-sm"></i></div>
          </div>
          <h3 class="text-2xl font-black text-slate-800">12,459</h3>
          <p class="text-xs text-emerald-600 font-semibold mt-2 flex items-center gap-1"><i class="fa fa-arrow-trend-up"></i> +12% this week</p>
        </div>
      </div>
    </div>
  </main>
</div>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10: NAVIGATION / HEADER BARS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<nav class="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
    <span class="text-lg font-bold text-slate-900">Brand</span>
    <div class="hidden sm:flex items-center gap-6">
      <a href="#" class="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Home</a>
      <a href="#" class="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">About</a>
      <button class="py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Get Started</button>
    </div>
  </div>
</nav>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 11: TABLES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<div class="overflow-x-auto rounded-xl border border-slate-200">
  <table class="w-full text-sm text-left">
    <thead class="bg-slate-50 border-b border-slate-200">
      <tr>
        <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
        <th class="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-100">
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="px-4 py-3 text-slate-800 font-medium">Item</td>
        <td class="px-4 py-3">
          <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">Active</span>
        </td>
      </tr>
    </tbody>
  </table>
</div>

═══════════════════════════════════════════════════════════════════
⛔ STRICTLY FORBIDDEN — DO NOT USE THESE PATTERNS:
═══════════════════════════════════════════════════════════════════

1. ❌ NEVER use "position: absolute" or class "absolute" on <hr>, dividers, or separators.
2. ❌ NEVER use fixed-width buttons (like "w-52") beside inputs — use "w-full" or "shrink-0".
3. ❌ NEVER use "flex" without "flex-col sm:flex-row" for layouts with input+button combos.
4. ❌ NEVER leave text without overflow protection — always add "break-words" or "truncate".
5. ❌ NEVER use <style> tags or inline style="..." attributes — ONLY Tailwind CSS classes.
6. ❌ NEVER use Bootstrap or any non-Tailwind CSS framework classes.
7. ❌ NEVER output raw unstyled HTML elements — every element MUST have Tailwind classes.
8. ❌ NEVER place content outside the root centered container.
9. ❌ NEVER use font sizes larger than "text-4xl" without responsive scaling.
10. ❌ NEVER use custom CSS or <style> blocks — ONLY Tailwind utility classes.
11. ❌ NEVER create cards wider than max-w-lg (for single cards) or max-w-7xl (for dashboards).
12. ❌ NEVER put an <hr> tag with "absolute" or "relative" positioning.

═══════════════════════════════════════════════════════════════════
✅ ALWAYS DO:
═══════════════════════════════════════════════════════════════════

1. ✅ Center the entire design vertically and horizontally in the viewport.
2. ✅ Add hover effects and transitions to all interactive elements.
3. ✅ Use shadows and border-radius on cards for depth.
4. ✅ Use gradient backgrounds for visual interest.
5. ✅ Use proper spacing with "space-y-*" and "gap-*".
6. ✅ Make EVERYTHING responsive with sm: and lg: breakpoint prefixes.
7. ✅ Use "rounded-xl" or "rounded-2xl" on cards, inputs, and buttons.
8. ✅ Test mentally that your design works at 320px width (mobile) before outputting.`;
                }
                messages.push({ role: 'system', content: systemPrompt });
            }

            // Append History
            if (body.history && Array.isArray(body.history)) {
                let lastToolCallId = '';

                body.history.forEach((msg: any, index: number) => {
                    const contentStr = typeof msg.content === 'string' ? msg.content : '';

                    if (msg.role === 'assistant') {
                        const searchMatch = contentStr.match(/^\[Called browser_search\s*(?:with query:|query:|to:)?\s*["']?(.+?)["']?\]$/i);
                        const navigateMatch = contentStr.match(/^\[Called browser_navigate\s*(?:to:|with url:)?\s*(.+?)\]$/i);

                        if (searchMatch) {
                            const query = searchMatch[1];
                            lastToolCallId = `call_search_${index}`;
                            messages.push({
                                role: 'assistant',
                                content: '',
                                tool_calls: [
                                    {
                                        id: lastToolCallId,
                                        type: 'function',
                                        function: {
                                            name: 'browser_search',
                                            arguments: JSON.stringify({ query })
                                        }
                                    }
                                ]
                            });
                        } else if (navigateMatch) {
                            const navUrl = navigateMatch[1].trim();
                            lastToolCallId = `call_nav_${index}`;
                            messages.push({
                                role: 'assistant',
                                content: '',
                                tool_calls: [
                                    {
                                        id: lastToolCallId,
                                        type: 'function',
                                        function: {
                                            name: 'browser_navigate',
                                            arguments: JSON.stringify({ url: navUrl })
                                        }
                                    }
                                ]
                            });
                        } else {
                            messages.push({
                                role: 'assistant',
                                content: msg.content
                            });
                            lastToolCallId = '';
                        }
                    } else {
                        // User message
                        if (lastToolCallId) {
                            const toolName = lastToolCallId.startsWith('call_search') ? 'browser_search' : 'browser_navigate';
                            messages.push({
                                role: 'tool',
                                tool_call_id: lastToolCallId,
                                name: toolName,
                                content: msg.content
                            });
                            lastToolCallId = '';
                        } else {
                            if (msg.image) {
                                messages.push({
                                    role: 'user',
                                    content: [
                                        { type: 'text', text: msg.content || '' },
                                        { type: 'image_url', image_url: { url: msg.image } }
                                    ]
                                });
                            } else {
                                messages.push({
                                    role: 'user',
                                    content: msg.content
                                });
                            }
                        }
                    }
                });
            }

            const messageContent: any[] = [{ type: 'text', text: prompt }];
            if (processedImage) {
                messageContent.push({
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${processedImage}` }
                });
            }

            messages.push({ role: 'user', content: messageContent });

            content = {
                messages,
                model: aiModel.id,
                stream: true,
            };
        } else {
            const contents: any[] = [];

            // Append History for Gemini
            if (body.history && Array.isArray(body.history)) {
                body.history.forEach((msg: any) => {
                    const parts: any[] = [];
                    if (msg.image) {
                        let imgData = msg.image;
                        let imgMime = 'image/jpeg';
                        if (imgData.startsWith('data:')) {
                            const m = imgData.match(/^data:([^;]+);base64,(.+)$/);
                            if (m) {
                                imgMime = m[1];
                                imgData = m[2];
                            }
                        }
                        parts.push({ inlineData: { data: imgData, mimeType: imgMime } });
                    }
                    parts.push({ text: msg.content || '' });
                    contents.push({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts
                    });
                });
            }

            const parts: any[] = [];
            if (processedImage) {
                parts.push({
                    inlineData: {
                        data: processedImage,
                        mimeType: mimeType
                    }
                });
            }
            parts.push({ text: prompt });

            contents.push({ role: 'user', parts });

            content = {
                contents,
            };

            if (body.systemPrompt) {
                content.systemInstruction = {
                    parts: [{ text: body.systemPrompt }]
                };
            }
        }
    }

    // Attach tools if provided
    if (tools) {
        const isLlama = aiModel.id.toLowerCase().includes('llama');
        const isChat = body.tool === 'chat';

        if (isLlama && isChat) {
            // Do not attach tools for Llama in Chat mode to avoid hallucinated tool calls
        } else if (provider === 'openai' || provider === 'nvidia') {
            content.tools = tools.map((tool: any) => ({
                type: 'function',
                function: tool,
            }));
        } else {
            content.tools = [{
                functionDeclarations: tools,
            }];
        }
    }

    return content;
}

async function getAIResponse(aiModel: AIModel, content: any, body: any, reqHeaders: Headers) {
    const provider = aiModel.provider;

    if (provider === 'nvidia') {
        const apiKey = reqHeaders.get('x-provider-key-nvidia') || process.env.NVIDIA_API_KEY;
        if (!apiKey) throw new Error('NVIDIA API Key not configured');

        const payloadTools = content?.tools ? content.tools.map((tool: any) => {
            if (tool.type === 'function') {
                const name = tool.name || tool.function?.name;
                const description = tool.description || tool.function?.description;
                const parameters = tool.parameters || tool.function?.parameters;

                return {
                    type: 'function',
                    function: {
                        name: name,
                        description: description,
                        parameters: sanitizeSchemaTypes(parameters)
                    }
                };
            }
            return tool;
        }) : undefined;

        const payload: any = {
            model: aiModel.id,
            messages: content.messages,
            stream: true,
            max_tokens: 16384,
            temperature: 0.7,
            top_p: 1.0,
            ...((aiModel.id.includes('kimi') || aiModel.id.includes('reasoning')) && { chat_template_kwargs: { thinking: true } })
        };

        if (payloadTools && payloadTools.length > 0) {
            payload.tools = payloadTools;
            payload.tool_choice = 'auto';
        }

        const response = await fetchWithTimeout('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
                Accept: 'text/event-stream',
            },
            body: JSON.stringify(payload),
        }, 60000);

        if (!response.ok) {
            const err = await response.json().catch(() => ({ error: { message: 'NVIDIA API Error' } }));
            throw new Error(err.error?.message || 'NVIDIA API Error');
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const reader = response.body!.getReader();

        let currentToolCallName = '';
        let currentToolCallArguments = '';

        return new ReadableStream({
            async start(controller) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            if (currentToolCallName && currentToolCallArguments) {
                                try {
                                    const args = JSON.parse(currentToolCallArguments);
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({
                                            functionCall: {
                                                name: currentToolCallName,
                                                args: args
                                            }
                                        })}\n\n`)
                                    );
                                } catch (e) { }
                            }
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            controller.close();
                            break;
                        }

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n').filter((line: string) => line.trim() !== '');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') {
                                    if (currentToolCallName && currentToolCallArguments) {
                                        try {
                                            const args = JSON.parse(currentToolCallArguments);
                                            controller.enqueue(
                                                encoder.encode(`data: ${JSON.stringify({
                                                    functionCall: {
                                                        name: currentToolCallName,
                                                        args: args
                                                    }
                                                })}\n\n`)
                                            );
                                        } catch (e) { }
                                    }
                                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                    controller.close();
                                    return;
                                }
                                try {
                                    const parsed = JSON.parse(data);
                                    const text = parsed.choices?.[0]?.delta?.content || '';
                                    if (text) {
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                                        );
                                    }

                                    const toolCalls = parsed.choices?.[0]?.delta?.tool_calls;
                                    if (toolCalls && toolCalls.length > 0) {
                                        const tc = toolCalls[0];
                                        if (tc.function?.name) {
                                            currentToolCallName = tc.function.name;
                                        }
                                        if (tc.function?.arguments) {
                                            currentToolCallArguments += tc.function.arguments;
                                        }
                                    }

                                    const finishReason = parsed.choices?.[0]?.finish_reason;
                                    if (finishReason === 'tool_calls' && currentToolCallName) {
                                        try {
                                            const args = JSON.parse(currentToolCallArguments);
                                            controller.enqueue(
                                                encoder.encode(`data: ${JSON.stringify({
                                                    functionCall: {
                                                        name: currentToolCallName,
                                                        args: args
                                                    }
                                                })}\n\n`)
                                            );
                                            currentToolCallName = '';
                                            currentToolCallArguments = '';
                                        } catch (e) {
                                            console.warn('Failed to parse accumulated tool call arguments', e);
                                        }
                                    }
                                } catch {
                                    // Skip
                                }
                            }
                        }
                    }
                } catch (error) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
                    );
                    controller.close();
                }
            },
        });
    }

    if (provider === 'openai') {
        const apiKey = reqHeaders.get('x-provider-key-openai') || process.env[aiModel.envKey || ''] || process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === '*************************') {
            throw new Error('OpenAI API Key not configured');
        }

        const openai = new OpenAI({ apiKey });

        let instructions = "";
        const input: any[] = [];

        if (content && Array.isArray(content.messages)) {
            for (const msg of content.messages) {
                if (msg.role === 'system') {
                    instructions = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                } else {
                    let transformedContent: any = msg.content;
                    if (Array.isArray(msg.content)) {
                        transformedContent = msg.content.map((item: any) => {
                            if (item.type === 'text') {
                                return { type: 'input_text', text: item.text };
                            } else if (item.type === 'image_url') {
                                return { type: 'input_image', image_url: item.image_url?.url || item.image_url };
                            }
                            return item;
                        });
                    }
                    input.push({
                        role: msg.role,
                        content: transformedContent
                    });
                }
            }
        }

        const transformedTools = content?.tools ? content.tools.map((tool: any) => {
            if (tool.type === 'function') {
                const name = tool.name || tool.function?.name;
                const description = tool.description || tool.function?.description;
                const parameters = tool.parameters || tool.function?.parameters;

                return {
                    type: 'function',
                    name: name,
                    description: description,
                    parameters: sanitizeSchemaTypes(parameters)
                };
            }
            return tool;
        }) : undefined;

        const encoder = new TextEncoder();

        const stream = await openai.responses.create({
            model: aiModel.id,
            input: input.length > 0 ? input : undefined,
            instructions: instructions || undefined,
            tools: transformedTools,
            stream: true
        });

        // To catch rate limits, auth errors, etc. immediately before returning the stream
        const iterator = stream[Symbol.asyncIterator]();
        const preFetchedEvents: any[] = [];
        let streamDone = false;
        try {
            // Pre-fetch events until we see 'response.output_item.added', which confirms
            // the stream is successfully active and not blocked by rate limits or errors.
            while (true) {
                const result = await iterator.next();
                if (result.done) {
                    streamDone = true;
                    if (result.value) preFetchedEvents.push(result.value);
                    break;
                }
                preFetchedEvents.push(result.value);
                
                // If we got 'response.output_item.added', the model has started generating output.
                // We can safely stop pre-fetching and return the stream.
                if (result.value && result.value.type === 'response.output_item.added') {
                    break;
                }
            }
        } catch (error: any) {
            console.error("OpenAI responses stream initialization error:", error);
            throw error;
        }

        let currentToolCallName = '';
        let currentToolCallArguments = '';

        return new ReadableStream({
            async start(controller) {
                try {
                    const processEvent = (event: any) => {
                        const ev = event as any;
                        if (ev.type === 'response.output_text.delta' && ev.delta) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ text: ev.delta })}\n\n`)
                            );
                        }
                        if (ev.type === 'response.output_item.added' && ev.item?.type === 'function_call') {
                            currentToolCallName = ev.item.name || '';
                            currentToolCallArguments = '';
                        }
                        if (ev.type === 'response.function_call_arguments.delta' && ev.delta) {
                            currentToolCallArguments += ev.delta;
                        }
                        if (ev.type === 'response.function_call_arguments.done' && currentToolCallName) {
                            try {
                                const args = JSON.parse(currentToolCallArguments || '{}');
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({
                                        functionCall: {
                                            name: currentToolCallName,
                                            args: args
                                        }
                                    })}\n\n`)
                                );
                            } catch (e) {
                                console.warn('Failed to parse OpenAI tool call arguments:', e);
                            }
                            currentToolCallName = '';
                            currentToolCallArguments = '';
                        }
                    };

                    // Process all pre-fetched events
                    for (const event of preFetchedEvents) {
                        processEvent(event);
                    }

                    // Process the remaining events
                    if (!streamDone) {
                        while (true) {
                            const { done, value } = await iterator.next();
                            if (done) break;
                            processEvent(value);
                        }
                    }

                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (error: any) {
                    console.error("OpenAI Responses stream error:", error);
                    let errorMessage = error.message || 'Stream interrupted';
                    if (error.status === 429 || errorMessage.includes("quota") || error.code === "insufficient_quota") {
                        errorMessage = "Many users are currently using the project, so the API quota has been temporarily exceeded. There is no issue with the project. Please wait for a while and try again.";
                    }
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`)
                    );
                    controller.close();
                }
            }
        });
    }

    // Gemini
    const apiKey = reqHeaders.get('x-provider-key-gemini') || reqHeaders.get('x-provider-key-google') || process.env[aiModel.envKey || ''] || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API Key not configured');

    const response = await fetchWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${aiModel.id}:streamGenerateContent?alt=sse`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-goog-api-key': apiKey,
            },
            body: JSON.stringify(content),
        },
        20000
    );

    if (!response.ok) {
        let err;
        try {
            err = await response.json();
        } catch (e) {
            err = { error: { message: "Upstream API returned a non-JSON error response (possibly HTML)." } };
        }

        console.error('Gemini Stream Error:', JSON.stringify(err));

        if (response.status === 429 || err.error?.message?.includes("exceeded your current quota") || err.error?.status === "RESOURCE_EXHAUSTED" || err.error?.code === "insufficient_quota") {
            throw new Error("Many users are currently using the project, so the API quota has been temporarily exceeded. There is no issue with the project. Please wait for a while and try again.");
        }

        throw new Error(err.error?.message || 'Gemini API Error');
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();
    let buffer = '';

    return new ReadableStream({
        async start(controller) {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        controller.close();
                        break;
                    }

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('data: ')) {
                            const data = trimmed.slice(6);
                            try {
                                const parsed = JSON.parse(data);
                                const part = parsed.candidates?.[0]?.content?.parts?.[0];
                                const text = part?.text || '';
                                const functionCall = part?.functionCall;

                                if (text) {
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                                    );
                                }
                                if (functionCall) {
                                    controller.enqueue(
                                        encoder.encode(`data: ${JSON.stringify({ functionCall })}\n\n`)
                                    );
                                }
                            } catch {
                                // Skip
                            }
                        }
                    }
                }
            } catch (error) {
                controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
                );
                controller.close();
            }
        },
    });
}

export async function POST(req: Request) {
    try {
        const session: any = await getSession();
        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const body = await req.json();
        const tool = body.tool || 'unknown';
        const isManual = body.isManual || false;

        let modelId = body.model || 'gemini-2.5-flash';

        // If not manual, always start with Gemini 2.5 Flash
        if (!isManual) {
            modelId = 'gemini-2.5-flash';
        }

        let aiModel = getModelById(modelId) || getModelById('gemini-2.5-flash') || AVAILABLE_MODELS[0];

        // Production-level check: Llama 3.1 8B Instruct does not support vision.
        // If an image is present, we automatically upgrade to Llama 3.2 11B Vision Instruct.
        const hasImage = body.image || (body.history && Array.isArray(body.history) && body.history.some((msg: any) => msg.image));
        if (aiModel.id === 'meta/llama-3.1-8b-instruct' && hasImage) {
            console.log("Image detected with Llama 3.1 8B Instruct; upgrading to Llama 3.2 11B Vision Instruct under the hood.");
            const visionModel = getModelById('meta/llama-3.2-11b-vision-instruct');
            if (visionModel) {
                aiModel = visionModel;
            }
        }

        const alreadyDeducted = req.headers.get('x-deducted-cost') !== null;
        if (!alreadyDeducted) {
            // Check token balance
            const settings = await db.getSettings();
            const feature = getFeatureById(tool);
            const baseCost = settings.aiLimits?.[tool] ?? feature?.tokenCost ?? 10;
            let cost = baseCost;
            if (aiModel.provider === 'openai') cost = Math.ceil(baseCost * 1.5);

            const balance = await db.getTokenBalance(session.email);
            if (balance.balance < cost) {
                return new Response(JSON.stringify({
                    error: 'Insufficient tokens. Please top up your balance.',
                }), { status: 402, headers: { 'Content-Type': 'application/json' } });
            }

            // Deduct tokens once
            await db.updateTokenBalance(session.email, cost, 'consume', tool, aiModel.id);
        }

        console.log(`AI Stream: ${tool} using ${aiModel.id} (${aiModel.provider}), isManual: ${isManual}`);

        try {
            const content = await prepareContent(aiModel, body);
            const stream = await getAIResponse(aiModel, content, body, req.headers);
            return new Response(stream, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                },
            });
        } catch (error: any) {
            // Fallback logic for any Gemini/Google model failure (quota, network, etc.)
            if (aiModel.provider === 'google') {
                console.log(`Gemini (${aiModel.id}) failed: ${error.message || error}. Falling back to gpt-5.4-mini...`);
                try {
                    const fallbackModel1 = getModelById('gpt-5.4-mini');
                    if (!fallbackModel1) throw new Error("Fallback model gpt-5.4-mini not found");

                    const content = await prepareContent(fallbackModel1, body);
                    const stream = await getAIResponse(fallbackModel1, content, body, req.headers);
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            Connection: 'keep-alive',
                        },
                    });
                } catch (fallback1Error: any) {
                    console.error('gpt-5.4-mini streaming fallback failed:', fallback1Error);
                    const hasImage = body.image || (body.history && Array.isArray(body.history) && body.history.some((msg: any) => msg.image));
                    const fallbackModelId2 = hasImage ? 'meta/llama-3.2-11b-vision-instruct' : 'meta/llama-3.1-8b-instruct';
                    console.log(`Trying second streaming fallback to ${fallbackModelId2}...`);

                    try {
                        const fallbackModel2 = getModelById(fallbackModelId2);
                        if (!fallbackModel2) throw new Error(`Fallback model ${fallbackModelId2} not found`);

                        const content = await prepareContent(fallbackModel2, body);
                        const stream = await getAIResponse(fallbackModel2, content, body, req.headers);
                        return new Response(stream, {
                            headers: {
                                'Content-Type': 'text/event-stream',
                                'Cache-Control': 'no-cache',
                                Connection: 'keep-alive',
                            },
                        });
                    } catch (fallback2Error: any) {
                        console.error('Second streaming fallback failed:', fallback2Error);
                        throw new Error(`AI Streaming Service is temporarily unavailable. Primary error: ${error.message || error}. First fallback error: ${fallback1Error.message || fallback1Error}. Second fallback error: ${fallback2Error.message || fallback2Error}`);
                    }
                }
            }
            throw error;
        }
    } catch (error: any) {
        console.error('AI Stream Error:', error);
        return new Response(JSON.stringify({
            error: error.message || 'AI streaming request failed',
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
