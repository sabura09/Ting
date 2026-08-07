export const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="AI Website Builder - Modern TailwindCSS + Flowbite Template">
    <title>AI Website Builder</title>

    <!-- Tailwind CSS with custom premium theme config -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
              display: ['Sora', 'system-ui', '-apple-system', 'sans-serif'],
            },
            colors: {
              premium: {
                50: '#f8fafc',
                100: '#f1f5f9',
                200: '#e2e8f0',
                300: '#cbd5e1',
                400: '#94a3b8',
                500: '#64748b',
                600: '#475569',
                700: '#334155',
                800: '#1e293b',
                900: '#0f172a',
                950: '#020617',
              },
              brand: {
                50: '#f0f9ff',
                100: '#e0f2fe',
                200: '#bae6fd',
                300: '#7dd3fc',
                400: '#38bdf8',
                500: '#0ea5e9',
                600: '#0284c7',
                700: '#0369a1',
                800: '#075985',
                900: '#0c4a6e',
                950: '#032030',
              }
            },
            boxShadow: {
              'premium': '0 10px 30px -10px rgba(2, 111, 199, 0.08), 0 1px 1px rgba(0, 0, 0, 0.02)',
              'premium-hover': '0 20px 40px -15px rgba(2, 111, 199, 0.15), 0 1px 3px rgba(0, 0, 0, 0.05)',
            }
          }
        }
      }
    </script>

    <!-- Flowbite CSS & JS -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.js"></script>

    <!-- Font Awesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" integrity="sha512-5h5Mhxz9QI+iHPy7RbE5z29nLNK6Zj+CWNeXy7Gqf0QM8Rt1a5/fqflJb0IT2u2eV5eP5yQ5u1SUa==" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <!-- Chart.js for charts & graphs -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- AOS (Animate On Scroll) for scroll animations -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/aos/2.3.4/aos.js"></script>

    <!-- GSAP (GreenSock) for advanced animations -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

    <!-- Lottie for JSON-based animations -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.0/lottie.min.js"></script>

    <!-- Swiper.js for Sliders/carousels -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css">
    <script src="https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js"></script>

    <!-- Optional: Tooltip & Popover Library (Tippy.js) -->
    <link rel="stylesheet" href="https://unpkg.com/tippy.js@6/dist/tippy.css" />
    <script src="https://unpkg.com/@popperjs/core@2"></script>
    <script src="https://unpkg.com/tippy.js@6"></script>

    <!-- Google Fonts for premium typography -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <!-- Production-level CSS normalizations (fixes common AI model output issues) -->
    <style>
      /* Global resets */
      *, *::before, *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      body {
        font-family: 'Outfit', system-ui, -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        overflow-x: hidden;
        line-height: 1.6;
        color: #0f172a;
      }

      h1, h2, h3, h4, h5, h6 {
        font-family: 'Sora', system-ui, -apple-system, sans-serif;
        font-weight: 700;
        letter-spacing: -0.025em;
      }

      /* Prevent horizontal overflow */
      #root {
        overflow-x: hidden;
        width: 100%;
        min-height: 100vh;
        background: radial-gradient(circle at 0% 0%, rgba(2, 111, 199, 0.03) 0%, transparent 50%),
                    radial-gradient(circle at 100% 100%, rgba(99, 102, 241, 0.03) 0%, transparent 50%),
                    #f8fafc;
      }

      /* Force responsive images */
      img {
        max-width: 100%;
        height: auto;
        display: block;
      }

      /* Normalize HR elements - prevent absolute-positioned HRs */
      hr {
        position: static !important;
        top: auto !important;
        left: auto !important;
        right: auto !important;
        width: 100% !important;
        border: none;
        border-top: 1px solid #f1f5f9;
        margin: 1.5rem 0;
      }

      /* Ensure inputs are properly sized and premium-styled */
      input, textarea, select {
        max-width: 100%;
        box-sizing: border-box;
        border-radius: 12px !important;
        border-color: #e2e8f0 !important;
        font-family: 'Outfit', sans-serif !important;
        background-color: #f8fafc !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      input:focus, textarea:focus, select:focus {
        background-color: #ffffff !important;
        border-color: #0ea5e9 !important;
        box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.1) !important;
      }

      /* Elevate simple buttons to enterprise level */
      button, .btn {
        font-family: 'Sora', sans-serif !important;
        font-weight: 600 !important;
        letter-spacing: -0.01em !important;
        border-radius: 12px !important;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }

      /* Fix flex containers to prevent overflow */
      [class*="flex"] {
        min-width: 0;
      }

      /* Ensure flex children don't overflow */
      [class*="flex"] > * {
        min-width: 0;
      }

      /* Prevent text overflow in headings */
      h1, h2, h3, h4, h5, h6 {
        overflow-wrap: break-word;
        word-break: break-word;
        color: #0f172a;
      }

      /* Style premium headings */
      h1 {
        background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }

      /* Smooth transitions for interactive elements */
      a, button, input, textarea, select {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* Beautiful enterprise cards fallback */
      .card, [class*="bg-white"] {
        border-radius: 20px;
        border: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: 0 10px 30px -10px rgba(15, 23, 42, 0.04), 0 1px 1px rgba(0, 0, 0, 0.01);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      .card:hover, [class*="bg-white"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(0, 0, 0, 0.02);
        border-color: rgba(14, 165, 233, 0.2);
      }

      /* Fix tables to not overflow and look premium */
      table {
        width: 100%;
        table-layout: auto;
        border-collapse: collapse;
      }
      th {
        font-family: 'Sora', sans-serif !important;
        font-weight: 600 !important;
        color: #475569 !important;
        background-color: #f8fafc !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
      }
      td {
        border-bottom: 1px solid #f1f5f9 !important;
      }

      /* Hide scrollbar but keep functionality */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      ::-webkit-scrollbar-track {
        background: #f8fafc;
      }
      ::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 9999px;
        border: 2px solid #f8fafc;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
      }
    </style>
</head>
<body id="root">
  <!-- __CODE_PLACEHOLDER__ -->
</body>
</html>
`;

/**
 * Replace template-engine placeholders that AI models sometimes emit
 * (Blade @include, Mustache {{ }}, Jinja {% %}, ERB <%= %>, etc.)
 * with real, styled HTML UI components so they never render as raw text.
 */
export const resolveTemplatePlaceholders = (html: string): string => {
  if (!html || !html.trim()) return html;

  let result = html;

  // ── Password Strength ────────────────────────────────────────────────
  // Matches: {{ password_strength }}, {{password_strength}}, {{{ password_strength }}},
  //          {% password_strength %}, <%= password_strength %>, and surrounding text
  //          like "Password Strength {{ password_strength }}" or the whole line/container
  const passwordStrengthWidget = `
<div class="space-y-2 mt-1">
  <div class="flex items-center justify-between">
    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password Strength</span>
    <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-full">Strong</span>
  </div>
  <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
    <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 transition-all duration-700 ease-out" style="width: 85%"></div>
  </div>
  <div class="flex justify-between text-[10px] text-slate-400 font-medium">
    <span>Weak</span>
    <span>Fair</span>
    <span>Good</span>
    <span class="text-emerald-600 font-bold">Strong</span>
  </div>
</div>`;

  // Replace the whole line/container that holds the placeholder text
  // Pattern 1: A full element wrapping "Password Strength {{ password_strength }}"
  result = result.replace(
    /<([a-z][a-z0-9]*)\b[^>]*>[\s\S]*?Password\s+Strength[\s\S]*?\{\{[\s\S]*?password[_\s]?strength[\s\S]*?\}\}[\s\S]*?<\/\1>/gi,
    passwordStrengthWidget
  );
  // Pattern 2: Standalone {{ password_strength }} (not already caught above)
  result = result.replace(
    /\{\{[\s{%<=]*password[_\s]?strength[\s}%>=]*\}\}/gi,
    passwordStrengthWidget
  );
  // Pattern 3: ERB / Jinja standalone
  result = result.replace(
    /<%=?\s*password[_\s]?strength\s*%>/gi,
    passwordStrengthWidget
  );
  result = result.replace(
    /\{%\s*password[_\s]?strength\s*%\}/gi,
    passwordStrengthWidget
  );

  // ── OAuth / Social Login ─────────────────────────────────────────────
  // Matches: @include('oauth-link'), @include("oauth-link"), {{ oauth }},
  //          @include('social-login'), @include('social-links'), etc.
  const oauthButtonsWidget = `
<div class="space-y-2.5 mt-3">
  <div class="flex items-center gap-3 my-3">
    <div class="flex-1 h-px bg-slate-200"></div>
    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or continue with</span>
    <div class="flex-1 h-px bg-slate-200"></div>
  </div>
  <div class="grid grid-cols-3 gap-2.5">
    <button type="button" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all duration-200 group">
      <svg class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span class="hidden sm:inline">Google</span>
    </button>
    <button type="button" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#24292F] border border-[#24292F] rounded-xl text-sm font-semibold text-white hover:bg-[#1b1f23] hover:shadow-md transition-all duration-200 group">
      <svg class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="white">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
      <span class="hidden sm:inline">GitHub</span>
    </button>
    <button type="button" class="flex items-center justify-center gap-2 px-4 py-2.5 bg-black border border-black rounded-xl text-sm font-semibold text-white hover:bg-zinc-900 hover:shadow-md transition-all duration-200 group">
      <svg class="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="white">
        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
      </svg>
      <span class="hidden sm:inline">Apple</span>
    </button>
  </div>
</div>`;

  // Pattern 1: Blade @include('oauth-link') or @include("social-login") etc.
  result = result.replace(
    /@include\s*\(\s*['"](?:oauth[-_]?link|social[-_]?log(?:in|links?)|oauth[-_]?buttons?|social[-_]?buttons?|social[-_]?auth)['"](?:\s*,\s*[^)]*)?\)/gi,
    oauthButtonsWidget
  );
  // Pattern 2: {{ oauth }} / {{ social_login }} / {{ oauth_buttons }}
  result = result.replace(
    /\{\{[\s{]*(?:oauth[-_]?link|social[-_]?log(?:in|links?)|oauth[-_]?buttons?|social[-_]?buttons?|social[-_]?auth|oauth)[\s}]*\}\}/gi,
    oauthButtonsWidget
  );
  // Pattern 3: Full element wrapping @include('oauth-link')
  result = result.replace(
    /<([a-z][a-z0-9]*)\b[^>]*>\s*@include\s*\(\s*['"](?:oauth|social)[^'"]*['"]\s*\)\s*<\/\1>/gi,
    oauthButtonsWidget
  );

  // ── Generic cleanup: strip remaining unrecognised template tokens ────
  // Remove any leftover @include('...') directives
  result = result.replace(/@include\s*\(\s*['"][^'"]*['"]\s*\)/gi, '');
  // Remove leftover {{ ... }} / {{{ ... }}} / {% ... %} / <%= ... %> placeholders
  // but preserve Tailwind-style classes in attributes (only strip from text nodes)
  result = result.replace(
    /(?<!=["'])\{\{\{?\s*[a-zA-Z_][\w.]*\s*\}?\}\}/g, ''
  );
  result = result.replace(
    /\{%[-\s]*[a-zA-Z_][\w\s.()'"]*[-\s]*%\}/g, ''
  );
  result = result.replace(
    /<%=?\s*[a-zA-Z_][\w.]*\s*%>/g, ''
  );

  return result;
};

function fixImageSources(html: string) {
  const placeholder = "/1.jpg";

  return html.replace(/<img[^>]*src=["'][^"']*["'][^>]*>/g, (tag) => {
    return tag.replace(/src=["'][^"']*["']/, `src="${placeholder}"`);
  });
}

export const constructFullHtml = (bodyContent: string): string => {
  bodyContent = fixImageSources(bodyContent);
  if (!bodyContent) return "";
  // If it already looks like full HTML, return as is
  if (bodyContent.trim().toLowerCase().startsWith("<!doctype") || bodyContent.trim().toLowerCase().includes("<html")) {
    return bodyContent;
  }
  return HTML_TEMPLATE.replace("<!-- __CODE_PLACEHOLDER__ -->", bodyContent);
};

export const extractBodyContent = (fullHtml: string): string => {
  if (!fullHtml) return "";

  // Simple regex to find content inside <body id="root">...</body> or <body>...</body>
  // This assumes the saved HTML follows our template somewhat or is standard HTML
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1].trim();
  }

  // If no body tag found, return the whole thing assuming it might be partial
  return fullHtml;
};

export const hasValidCodeBlock = (code: string): boolean => {
  if (!code) return false;
  if (code.match(/```(?:html|xml|vue|jsx)?\s*\n([\s\S]*?)(?:```|$)/i)) return true;
  if (code.match(/```html([\s\S]*?)(?:```|$)/i)) return true;
  if (code.match(/```([\s\S]*?)(?:```|$)/i)) return true;
  if (code.match(/(?:<!DOCTYPE|<html|<body|<div|<nav|<header|<main|<section|<form|<button|<svg|<table|<ul)[^>]*>[\s\S]*/i)) return true;
  return false;
};

export const cleanupCode = (code: string): string => {
  if (!code) return "";

  // Helper to remove conversational text often appended at the end
  const removeTrailingText = (extracted: string): string => {
    let result = extracted;
    const upNextIndex = result.lastIndexOf('Up Next:');
    if (upNextIndex > -1) {
      result = result.substring(0, upNextIndex);
    }
    const lastClosingBracketIndex = result.lastIndexOf('>');
    if (lastClosingBracketIndex > -1) {
      result = result.substring(0, lastClosingBracketIndex + 1);
    }
    return result.trim();
  };

  // 1. If it contains a code block with explicit HTML/XML, extract it
  const codeBlockMatch = code.match(/```(?:html|xml|vue|jsx)?\s*\n([\s\S]*?)(?:```|$)/i) || code.match(/```html([\s\S]*?)(?:```|$)/i);
  if (codeBlockMatch && codeBlockMatch[1] !== undefined) {
    return removeTrailingText(codeBlockMatch[1].trim());
  }

  // 2. If it contains a generic ``` ... ``` block and it has HTML elements, extract it
  const genericBlockMatch = code.match(/```([\s\S]*?)(?:```|$)/i);
  if (genericBlockMatch && genericBlockMatch[1] !== undefined) {
    const inner = genericBlockMatch[1].trim();
    if (inner === "" || inner.includes('<')) {
      return removeTrailingText(inner);
    }
  }

  // 3. Fallback: check if the string contains actual HTML tags.
  const rawHtmlMatch = code.match(/(?:<!DOCTYPE|<html|<body|<div|<nav|<header|<main|<section|<form|<button|<svg|<table|<ul)[^>]*>[\s\S]*/i);
  if (rawHtmlMatch) {
    return removeTrailingText(rawHtmlMatch[0]);
  }

  // 4. Return empty string if no valid HTML code is found, to prevent replacing preview with conversational text
  return "";
};

/**
 * Post-process HTML generated by Llama models to fix common CSS/layout issues.
 * This runs ONLY when the selected model is a Llama variant.
 */
export const sanitizeLlamaHtml = (html: string): string => {
  if (!html || !html.trim()) return html;

  let result = html;

  // 1. Remove <style> blocks entirely (Llama sometimes injects CSS blocks)
  result = result.replace(/<style[\s\S]*?<\/style>/gi, '');

  // 2. Strip all inline style="..." attributes (they override Tailwind and cause bugs)
  //    Exception: preserve style="width: XX%" for progress bars
  result = result.replace(/\sstyle="(?!width:\s*\d+%)[^"]*"/gi, '');

  // 3. Fix <hr> tags: remove absolute/relative positioning classes, replace with clean divider
  result = result.replace(/<hr[^>]*class="[^"]*(?:absolute|relative|fixed)[^"]*"[^>]*\/?>/gi,
    '<div class="border-t border-slate-200/60 my-6"></div>');
  // Also replace bare <hr> with styled versions
  result = result.replace(/<hr\s*\/?>/gi, '<div class="border-t border-slate-200/60 my-6"></div>');

  // 4. Ensure all images are responsive (add max-w-full if not present)
  result = result.replace(/<img\b(?![^>]*max-w-full)([^>]*class="[^"]*")/gi, (match, rest) => {
    return match.replace(/class="([^"]*)"/, 'class="$1 max-w-full h-auto"');
  });
  // Handle img tags without class attribute
  result = result.replace(/<img\b(?![^>]*class=)([^>]*)\/?>/gi,
    '<img class="max-w-full h-auto rounded-lg"$1/>');

  // 5. Fix input elements: ensure they have w-full if they don't have a width class
  result = result.replace(/<input\b([^>]*class="(?![^"]*w-)[^"]*")/gi, (match, rest) => {
    return match.replace(/class="([^"]*)"/, 'class="$1 w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20"');
  });

  // 6. Remove any Bootstrap classes that Llama might inject
  const bootstrapClasses = /\b(col-\d+|col-sm-\d+|col-md-\d+|col-lg-\d+|col-xl-\d+|row|container-fluid|btn-primary|btn-secondary|btn-success|btn-danger|btn-warning|form-control|form-group|card-body|card-title)\b/g;
  result = result.replace(bootstrapClasses, '');

  // 7. Fix overlapping button+input combos: if we find a fixed-width button class (w-XX where XX > 40),
  //    replace with responsive classes
  result = result.replace(/\bw-(4[1-9]|[5-9]\d|\d{3,})\b/g, (match) => {
    // Replace overly wide fixed widths with auto or shrink-0
    return 'w-auto shrink-0';
  });

  // 8. Transform broken profile picture placeholders to beautiful UI avatar badges
  //    e.g., if there is a profile picture for John Doe, replace with a stunning color gradient initials badge
  result = result.replace(/<div[^>]*>\s*<img[^>]*alt="Profile"[^>]*>\s*<div[^>]*><\/div>\s*<\/div>/gi,
    `<div class="relative shrink-0"><div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-premium">JD</div><span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></span></div>`);

  result = result.replace(/Prof Picti/gi, 'JD');
  result = result.replace(/<img[^>]*src="\/1\.jpg"[^>]*>/gi,
    `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-premium select-none shrink-0">JD</div>`);

  // 9. Upgrade simple buttons to luxurious premium buttons
  result = result.replace(/<button[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi, (tag, classes, content) => {
    // If the button has a custom color background, do not overwrite it
    if (/\bbg-(red|green|emerald|rose|yellow|amber|orange|indigo|violet|purple|pink|sky|teal|cyan|slate|gray|zinc|neutral|stone)-\d+/.test(classes)) {
      return tag;
    }
    const isPrimary = content.toLowerCase().includes('refresh') || content.toLowerCase().includes('save') || content.toLowerCase().includes('submit') || content.toLowerCase().includes('add') || content.toLowerCase().includes('primary') || classes.includes('blue') || classes.includes('primary');
    const updatedClasses = isPrimary
      ? 'px-5 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 text-white font-medium text-sm shadow-premium hover:shadow-premium-hover rounded-xl flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all'
      : 'px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-medium text-sm rounded-xl shadow-sm hover:bg-slate-50 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all';
    return `<button class="${updatedClasses}">${content}</button>`;
  });

  // 10. Upgrade bare numbered list lists (e.g. Projects: Task 1, Task 2) to beautiful dynamic project cards
  //     We identify patterns like "<div ...>1</div> <div ...>Task 1</div>" or similar ordered items and replace with luxury card grid.
  result = result.replace(/<div[^>]*>\s*<div[^>]*>1<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi, (match, taskName) => {
    return `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-4">
          <!-- Card 1 -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-premium hover:shadow-premium-hover hover:border-brand-200/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/50">Active</span>
                <span class="text-xs text-slate-400 font-medium">Updated 2h ago</span>
              </div>
              <h3 class="text-base font-bold text-slate-800 mb-2">${taskName}</h3>
              <p class="text-xs text-slate-500 leading-relaxed mb-4">High priority project workspace to coordinate frontend interface visual alignment metrics.</p>
            </div>
            <div class="space-y-3 mt-4 pt-4 border-t border-slate-50">
              <div class="flex justify-between items-center text-xs font-semibold">
                <span class="text-slate-400">Progress</span>
                <span class="text-brand-600">85%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full" style="width: 85%"></div>
              </div>
            </div>
          </div>
        `;
  });

  result = result.replace(/<div[^>]*>\s*<div[^>]*>2<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi, (match, taskName) => {
    return `
          <!-- Card 2 -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-premium hover:shadow-premium-hover hover:border-brand-200/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100/50">In Review</span>
                <span class="text-xs text-slate-400 font-medium">Updated 5h ago</span>
              </div>
              <h3 class="text-base font-bold text-slate-800 mb-2">${taskName}</h3>
              <p class="text-xs text-slate-500 leading-relaxed mb-4">Enterprise level user feedback integrations and multi-stage rendering validation.</p>
            </div>
            <div class="space-y-3 mt-4 pt-4 border-t border-slate-50">
              <div class="flex justify-between items-center text-xs font-semibold">
                <span class="text-slate-400">Progress</span>
                <span class="text-amber-600">60%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style="width: 60%"></div>
              </div>
            </div>
          </div>
        `;
  });

  result = result.replace(/<div[^>]*>\s*<div[^>]*>3<\/div>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi, (match, taskName) => {
    return `
          <!-- Card 3 -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-premium hover:shadow-premium-hover hover:border-brand-200/50 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between mb-4">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/50">Planned</span>
                <span class="text-xs text-slate-400 font-medium">Updated 1d ago</span>
              </div>
              <h3 class="text-base font-bold text-slate-800 mb-2">${taskName}</h3>
              <p class="text-xs text-slate-500 leading-relaxed mb-4">Next phase visual interface animations, responsive alignments, and modular tools.</p>
            </div>
            <div class="space-y-3 mt-4 pt-4 border-t border-slate-50">
              <div class="flex justify-between items-center text-xs font-semibold">
                <span class="text-slate-400">Progress</span>
                <span class="text-slate-600">20%</span>
              </div>
              <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-slate-200 rounded-full" style="width: 20%"></div>
              </div>
            </div>
          </div>
        </div>
        `;
  });

  // 11. Smart dashboard layout detection: if the content looks like a dashboard
  //     (contains grid layouts, multiple cards, sidebar patterns), upgrade narrow
  //     max-w-lg to max-w-7xl to prevent squished layouts
  const isDashboardLike = (
    (result.match(/grid/gi) || []).length >= 2 ||
    (result.match(/\bcol-span/gi) || []).length >= 1 ||
    (result.match(/<nav\b/gi) || []).length >= 1 ||
    (result.match(/sidebar/gi) || []).length >= 1 ||
    (result.match(/dashboard/gi) || []).length >= 1 ||
    (result.match(/<table\b/gi) || []).length >= 1 ||
    result.includes('Projects') ||
    result.includes('Recent Activities')
  );

  if (isDashboardLike) {
    // Upgrade the outermost narrow container to full dashboard width
    // Only replace the FIRST occurrence of max-w-lg or max-w-md
    result = result.replace(/\bmax-w-lg\b/, 'max-w-7xl');
    result = result.replace(/\bmax-w-md\b/, 'max-w-6xl');
  }

  // 12. Clean up double/triple spaces in class attributes
  result = result.replace(/class="([^"]*)"/g, (match, classes) => {
    const cleaned = classes.replace(/\s+/g, ' ').trim();
    return `class="${cleaned}"`;
  });

  return result;
};

