"use client"
import React, { useEffect, useState, Suspense } from 'react'
import ChatSection from './_components/ChatSection'
import WebsiteDesign from './_components/WebsiteDesign'
import { toast } from 'sonner'
import { useSearchParams } from 'next/navigation'
import { streamGeminiResponse } from './_components/aiClient'
import { constructFullHtml, extractBodyContent, cleanupCode, sanitizeLlamaHtml, resolveTemplatePlaceholders, hasValidCodeBlock } from '@/utils/htmlProcessor';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export type Frame = {
  projectId: string,
  frameId: string,
  designCode: string,
  chatMessages: Messages[]
}

export type ThinkingAction = {
  type: 'file_created' | 'file_modified' | 'compiled' | 'screenshot' | 'error' | 'info';
  label: string;
  detail?: string;
}

export type Messages = {
  role: string,
  content: string,
  image?: string,
  elementTag?: string,
  thinking?: string,
  actions?: ThinkingAction[],
  summary?: string[],
  milestoneCompleted?: string,
  upNext?: string,
}

const prompt: string = `
userInput: {userInput}

Instructions:

1. If the user input is explicitly asking to generate 
code, design, or HTML/CSS/JS output (e.g., “Create a 
landing page”, “Build a dashboard”, “Generate HTML 
Tailwind CSS code”), then:

    - Generate a complete HTML Tailwind CSS code using 
      Flowbite UI components.
    - Use a modern design with **blue as the primary 
      color** theme.
       * Only include the <body> content (do not add 
         <head> or <title>).
       * Make it fully responsive for all screen sizes.  
       * All primary components must match the theme 
         color.
       * Add proper padding and margin for each element.
       * Components should be independent; do not connect 
         them.
    - Use placeholders for all images:
        * Light mode: 
          https://community.softr.io/uploads/db9110/original/2X/
          7/74e6e7e3802d0ffd57773c9a878e6f8817a6a8c.jpeg
        * Dark mode: https://www.cibaky.com/wp-
          content/uploads/2015/12/placeholder-3.jpg
        * Add alt tag describing the image prompt.
    - Use the following libraries/components where 
      appropriate:
        * FontAwesome icons (fa fa-)
        * Flowbite UI components: buttons, modals, 
          forms, tables, tabs, alerts, cards, dialogs, 
          dropdowns, accordions, etc.
        * Chart.js for charts & graphs
        * Swiper.js for sliders/carousels
        * Tippy.js for tooltips & popovers
    - Include interactive components like modals, 
      dropdowns, accordions, etc.
    - Ensure proper spacing, alignment, hierarchy, and 
      theme consistency.
    - Ensure charts are visually appealing and match 
      the theme color.
    - Header menu options should be spread out and not 
      connected.
        * Do not include broken links.
        * Do not add any extra text before or after the 
          HTML code EXCEPT for the required "Up Next" suggestion (see rule 4).

2. If the user asks to **modify, change, or update** the 
    existing design (e.g., “Change the color to red”, 
    “Add a button”, “Update the text”), then:
    - You MUST output the **entire updated HTML code**.
    - CRITICAL: Do NOT omit any existing Tailwind classes, layout structure, or styling.
    - You MUST return the FULL, complete HTML exactly as provided in the Current Design Code context, but with the requested modifications applied.
    - NEVER return a stripped-down, simplified, or carelessly coded bare HTML version. The design must remain modern and premium.
    - Do not just respond with text; the user expects 
      the live preview to update.
    - ALWAYS wrap your HTML code in a \`\`\`html code block.

3. If the user input is **purely general text or 
   greetings** (e.g., “Hi”, “Hello”, “How are you?”) 
   and has **nothing to do with design or UI**, then:
    - Respond with a simple, friendly text message.

4. IMPORTANT - Up Next Suggestion:
   At the very end of your response, you MUST provide exactly ONE one-line suggestion for what the user could build or modify next to improve the design.
   Format it EXACTLY like this:
   Up Next: <your one line suggestion here>

Current Design Code (context):
{currentCode}
`

const injectTargetAttribute = (html: string, path: number[]): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return html;
    let current: Element | null = root;
    for (const index of path) {
      if (current && current.children[index]) {
        current = current.children[index];
      } else {
        break;
      }
    }
    if (current && current !== root) {
      current.setAttribute('data-visual-edit-target', 'true');
    }
    return root.innerHTML;
  } catch (e) {
    console.error("Failed to inject target attribute", e);
    return html;
  }
};

const removeTargetAttribute = (html: string): string => {
  return html.replace(/\s*data-visual-edit-target="[^"]*"/g, '').replace(/\s*data-visual-edit-target/g, '');
};

const getElementHtmlByPath = (html: string, path: number[]): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return '';
    let current: Element | null = root;
    for (const index of path) {
      if (current && current.children[index]) {
        current = current.children[index];
      } else {
        break;
      }
    }
    if (current && current !== root) {
      return current.outerHTML;
    }
    return '';
  } catch (e) {
    console.error("Failed to get element HTML by path", e);
    return '';
  }
};

const replaceElementHtmlByPath = (html: string, path: number[], newElementHtml: string): string => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const root = doc.body.firstElementChild;
    if (!root) return html;
    let current: Element | null = root;
    for (const index of path) {
      if (current && current.children[index]) {
        current = current.children[index];
      } else {
        break;
      }
    }
    if (current && current !== root && current.parentElement) {
      const tempDiv = doc.createElement('div');
      tempDiv.innerHTML = newElementHtml.trim();
      const newEl = tempDiv.firstElementChild;
      if (newEl) {
        current.replaceWith(newEl);
      } else {
        // If the new HTML is empty or contains no elements, remove the targeted element entirely!
        current.remove();
      }
    }
    return root.innerHTML;
  } catch (e) {
    console.error("Failed to replace element HTML by path", e);
    return html;
  }
};

const PlayGroundContent = () => {
  const searchParams = useSearchParams();
  const userprompt = searchParams.get("userprompt");
  const { refreshUser, selectedModel } = useAuth();

  /* ... inside PlayGroundContent ... */
  const [loading, setLoading] = useState<boolean>(false)
  const [messages, setMessages] = useState<Messages[]>([])
  const [generatedCode, setGeneratedCode] = useState<string>("")
  const [chatLoader, setchatLoader] = useState<boolean>(false)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [projectSubdomain, setProjectSubdomain] = useState<string | null>(null)
  const [showSubdomainModal, setShowSubdomainModal] = useState<boolean>(false)
  const [subdomainInput, setSubdomainInput] = useState<string>("")
  const [liveThinking, setLiveThinking] = useState<string>("")
  const [showBanner, setShowBanner] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isBannerDismissed = localStorage.getItem('hidePlaygroundBanner') === 'true';
      if (!isBannerDismissed) {
        const href = window.location.href;
        if (href.includes('localhost') || href.includes('mounikai')) {
          setShowBanner(true);
        }
      }
    }
  }, []);

  // Visual edits states
  const [visualEditsActive, setVisualEditsActive] = useState<boolean>(false)
  const [selectedElementPath, setSelectedElementPath] = useState<number[] | null>(null)
  const [selectedElementTag, setSelectedElementTag] = useState<string | null>(null)

  useEffect(() => {
    // Only collapse the main sidebar when the right-hand "Visual edits" panel is actually open
    const shouldCollapse = !!selectedElementTag;
    window.dispatchEvent(new CustomEvent('force-sidebar-collapse', { detail: shouldCollapse }));

    return () => {
      window.dispatchEvent(new CustomEvent('force-sidebar-collapse', { detail: false }));
    };
  }, [selectedElementTag]);

  useEffect(() => {
    const handleSidebarChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const isCollapsed = !!customEvent.detail;
      if (!isCollapsed) {
        // If sidebar is opened manually, close visual edits panel to prevent layout squishing
        setSelectedElementPath(null);
        setSelectedElementTag(null);
      }
    };
    window.addEventListener('sidebar-collapse-changed', handleSidebarChange);
    return () => window.removeEventListener('sidebar-collapse-changed', handleSidebarChange);
  }, []);

  // Helper: check if the currently selected model is a Llama variant
  const isLlamaModel = selectedModel?.includes('llama') || selectedModel?.includes('meta/');

  // Helper: process generated code with optional Llama sanitization
  const processCode = (raw: string): string => {
    let code = extractBodyContent(cleanupCode(raw));
    if (isLlamaModel && !selectedElementPath) {
      code = sanitizeLlamaHtml(code);
    }
    code = removeTargetAttribute(code);
    // Replace template-engine placeholders ({{ }}, @include, etc.) with real UI components
    code = resolveTemplatePlaceholders(code);
    return code;
  };

  useEffect(() => {
    const projectId = searchParams.get("projectId");
    const initialImage = localStorage.getItem('initialImage');

    if (projectId) {
      LoadProject(projectId);
    } else if (userprompt) {
      GetFrameDetails(userprompt, initialImage);
      if (initialImage) localStorage.removeItem('initialImage');
    }
  }, [userprompt, searchParams])


  const safeJson = async (res: Response) => {
    try {
      return await res.json();
    } catch (e) {
      return { error: `Server returned non-JSON response (${res.status} ${res.statusText})` };
    }
  }

  const LoadProject = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/website/save?id=${id}`);
      const data = await safeJson(res);
      if (res.ok) {
        const project = data.find ? data.find((p: any) => p.id === id) : data;
        if (project) {
          const bodyContent = extractBodyContent(project.code);
          setGeneratedCode(bodyContent);
          setMessages(project.messages || []);
          setProjectSubdomain(project.subdomain || null);
        }
      } else {
        toast.error(data.error || "Failed to load project");
      }
    } catch (e) {
      toast.error("Failed to load project");
    }
    setLoading(false);
  }

  const deductTokens = async (amount: number) => {
    try {
      const res = await fetch('/api/tokens/deduct', {
        method: 'POST',
        body: JSON.stringify({ amount, feature: 'website-generation', model: selectedModel })
      });

      const data = await safeJson(res);

      if (!res.ok) {
        throw new Error(data.error || "Insufficient tokens");
      }

      await refreshUser();
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to deduct tokens");
      return false;
    }
  }

  const GetFrameDetails = async (promptMsg: string, image?: string | null) => {
    const userMsg = {
      role: 'user',
      content: promptMsg,
      image: image || undefined
    };
    setMessages([userMsg]);
    setLoading(true);
    setchatLoader(true);

    const hasTokens = await deductTokens(500);
    if (!hasTokens) {
      setMessages([]);
      setLoading(false);
      setchatLoader(false);
      return;
    }

    const systemPrompt = prompt
      .replace('{userInput}', promptMsg)
      .replace('{currentCode}', 'None yet. Please create a new design.');

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      userMsg
    ];

    try {
      const stream = await streamGeminiResponse(apiMessages, selectedModel);
      let fullResponse = "";

      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        fullResponse += chunkText;
        setLiveThinking(fullResponse);

        if (hasValidCodeBlock(fullResponse)) {
          const partialCleaned = processCode(fullResponse);
          setGeneratedCode(partialCleaned);
        }
      }

      if (hasValidCodeBlock(fullResponse)) {
        const cleanedCode = processCode(fullResponse);
        setGeneratedCode(cleanedCode);
      } else {
        toast.error("AI did not generate any code.");
      }
      setLiveThinking("");
      setMessages(prev => [...prev, { role: 'model', content: fullResponse }]);

    } catch (e: any) {
      toast.error(e.message || "Failed to generate website");
      console.error(e);
    } finally {
      setLoading(false);
      setchatLoader(false);
    }
  }

  const SendMessage = async (input: string, image?: string | null) => {
    if (!input && !image) return;

    const userMsg: Messages = {
      role: 'user',
      content: input,
      image: image || undefined,
      elementTag: selectedElementTag || undefined
    };

    // Optimistically update UI
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setchatLoader(true);

    const hasTokens = await deductTokens(10);
    if (!hasTokens) {
      // Revert if tokens failed
      setMessages(prev => prev.slice(0, -1));
      setLoading(false);
      setchatLoader(false);
      return;
    }

    const baseHtml = generatedCode;
    let systemPrompt = "";
    if (selectedElementPath) {
      const selectedElementHtml = getElementHtmlByPath(baseHtml || 'No design yet.', selectedElementPath);
      systemPrompt = `Instructions:
You are an expert web editor.
The user wants to make a targeted modification to a specific HTML element on the page.
You are provided with the exact HTML snippet of the selected element.

Your task is to apply the user's request to this element (and its children) and return ONLY the updated element's HTML snippet.

CRITICAL RULES:
1. Output ONLY the updated HTML snippet of this specific element (retaining its outer tag structure).
2. You MUST wrap your updated element HTML code inside a \`\`\`html and \`\`\` code block.
3. Do NOT output the entire page, parent containers, or any unrelated sections.
4. Do NOT output any conversational text, explanation, or Python code, EXCEPT for the required "Up Next" suggestion (see rule 7).
5. Keep all existing event handlers, styles, scripts, IDs, classes, and structure intact unless they are explicitly being modified.
6. Context & Design Guidelines:
   - If the user refers to a "card UI", "payment card", "real card", etc. inside a payment, billing, or subscription section, they mean a visual CREDIT/DEBIT card component (with card number, chip, expiry, cardholder name, and elegant payment styling), NOT playing cards or a deck of cards.
   - Use Flowbite and Tailwind CSS components matching the existing design system.
   - Ensure the updated element looks extremely premium, modern, and beautiful.
   - Keep the primary theme color (blue) or match the existing surrounding design.
7. IMPORTANT - Up Next Suggestion:
   At the very end of your response (after the HTML code block), you MUST provide exactly ONE one-line suggestion for what the user could build or modify next to improve the design.
   Format it EXACTLY like this:
   Up Next: <your one line suggestion here>

Selected Element HTML to modify:
${selectedElementHtml}

User Modification Request: ${input}
`;
    } else {
      systemPrompt = prompt
        .replace('{userInput}', input)
        .replace('{currentCode}', generatedCode || 'No design yet.');
    }

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'model' ? 'model' : 'user',
        content: m.content,
        image: m.image
      })),
      userMsg
    ];

    try {
      const stream = await streamGeminiResponse(apiMessages, selectedModel);
      let fullResponse = "";

      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        fullResponse += chunkText;
        setLiveThinking(fullResponse);

        if (hasValidCodeBlock(fullResponse)) {
          const partialCleaned = processCode(fullResponse);
          if (selectedElementPath) {
            const blockCode = cleanupCode(fullResponse).toLowerCase();
            const isFullPage = blockCode.includes('<html') || blockCode.includes('<body') || blockCode.includes('<!doctype');
            if (isFullPage) {
              setGeneratedCode(partialCleaned);
            } else {
              const updatedPageHtml = replaceElementHtmlByPath(baseHtml, selectedElementPath, partialCleaned);
              setGeneratedCode(updatedPageHtml);
            }
          } else {
            setGeneratedCode(partialCleaned);
          }
        }
      }

      if (hasValidCodeBlock(fullResponse)) {
        const cleanedCode = processCode(fullResponse);
        if (selectedElementPath) {
          const blockCode = cleanupCode(fullResponse).toLowerCase();
          const isFullPage = blockCode.includes('<html') || blockCode.includes('<body') || blockCode.includes('<!doctype');
          if (isFullPage) {
            setGeneratedCode(cleanedCode);
          } else {
            const updatedPageHtml = replaceElementHtmlByPath(baseHtml, selectedElementPath, cleanedCode);
            setGeneratedCode(updatedPageHtml);
          }
        } else {
          setGeneratedCode(cleanedCode);
        }

        // Clear selection after visual edit successfully applies
        if (selectedElementPath) {
          setSelectedElementPath(null);
          setSelectedElementTag(null);
        }
      } else {
        toast.error("AI did not generate any valid code for this modification.");
      }

      setLiveThinking("");
      setMessages(prev => [...prev, { role: 'model', content: fullResponse }]);

    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
      console.error(e);
    } finally {
      setLoading(false);
      setchatLoader(false);
    }
  }

  const SaveGeneratedCode = async (code: string) => {
    setIsSaving(true);
    // Save to Database
    try {
      const fullHtml = constructFullHtml(cleanupCode(code));
      const projectId = searchParams.get("projectId");
      const res = await fetch('/api/website/save', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId, // If exists, update
          code: fullHtml,
          messages: messages,
          name: userprompt || "New Website"
        })
      });
      const data = await safeJson(res);

      if (res.ok) {
        toast.success("Website Saved Successfully!");
        // Optionally update URL to include new projectId if it was a new creation
        if (data.project?.id && !projectId) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('projectId', data.project.id);
          window.history.pushState({}, '', newUrl);
        }
      } else {
        toast.error("Failed to save website");
      }
    } catch (e) {
      toast.error("Error saving website");
    } finally {
      setIsSaving(false);
    }
  }

  const PublishGeneratedCode = async (code: string, subdomain: string) => {
    setIsPublishing(true);
    try {
      const fullHtml = constructFullHtml(cleanupCode(code));
      let projectId = searchParams.get("projectId");

      const res = await fetch('/api/website/save', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId,
          code: fullHtml,
          subdomain: subdomain,
          messages: messages,
          name: userprompt || "New Website"
        })
      });
      const data = await safeJson(res);

      if (res.ok) {
        toast.success("Website Published to Subdomain!");
        setProjectSubdomain(subdomain);
        let finalProjectId = projectId;
        if (data.project?.id && !projectId) {
          finalProjectId = data.project.id;
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('projectId', finalProjectId as string);
          window.history.pushState({}, '', newUrl);
        }
        if (finalProjectId) {
          const host = window.location.host;
          const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN;
          const url = (baseDomain && host.endsWith(baseDomain))
            ? `https://${subdomain}.${baseDomain}`
            : `${window.location.protocol}//${host}/sites/${subdomain}`;
          window.open(url, '_blank');
        }
      } else {
        toast.error(data.error || "Failed to publish website");
      }
    } catch (e) {
      toast.error("Error publishing website");
    } finally {
      setIsPublishing(false);
    }
  }

  const UnpublishGeneratedCode = async () => {
    setIsPublishing(true);
    try {
      let projectId = searchParams.get("projectId");
      if (!projectId) return;

      const res = await fetch('/api/website/save', {
        method: 'POST',
        body: JSON.stringify({
          id: projectId,
          clearSubdomain: true
        })
      });
      const data = await safeJson(res);

      if (res.ok) {
        toast.success("Website unpublished!");
        setProjectSubdomain(null);
      } else {
        toast.error(data.error || "Failed to unpublish website");
      }
    } catch (e) {
      toast.error("Error unpublishing website");
    } finally {
      setIsPublishing(false);
    }
  }



  return (
    <div className="flex flex-col h-full">
      {showBanner && (
        <div className="relative flex items-center justify-center py-1.5 px-4 bg-[#FAFAFA] border-b border-gray-100 text-[11px] text-gray-500 tracking-[0.01em]">
          <span className="flex items-center gap-1.5 pr-6">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              For best results use the <span className="font-medium text-gray-700">Gemini 2.5 Flash</span> or <span className="font-medium text-gray-700">GPT 5.4 mini</span> model. In the demo, due to high demand, sometimes we automatically use the LLaMA model.
            </span>
          </span>
          <button
            onClick={() => {
              setShowBanner(false);
              localStorage.setItem('hidePlaygroundBanner', 'true');
            }}
            className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close note"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className='flex flex-1 overflow-hidden min-w-0'>
        {/* chatSection */}
        <ChatSection
          messages={messages}
          chatLoader={chatLoader}
          onSend={(input: string, image: string | null) => SendMessage(input, image)}
          loading={loading}
          liveThinking={liveThinking}
          visualEditsActive={visualEditsActive}
          setVisualEditsActive={setVisualEditsActive}
          selectedElementTag={selectedElementTag}
          clearSelection={() => {
            setSelectedElementPath(null);
            setSelectedElementTag(null);
          }}
        />
        {/* websiteDesign */}
        <WebsiteDesign
          generatedCode={generatedCode}
          onSave={() => SaveGeneratedCode(generatedCode)}
          onPublish={() => setShowSubdomainModal(true)}
          onUnpublish={UnpublishGeneratedCode}
          isSaving={isSaving}
          isPublishing={isPublishing}
          loading={loading}
          projectSubdomain={projectSubdomain}
          visualEditsActive={visualEditsActive}
          selectedElementPath={selectedElementPath}
          setSelectedElementPath={setSelectedElementPath}
          setSelectedElementTag={setSelectedElementTag}
          onCodeChange={(newHtml: string) => setGeneratedCode(newHtml)}
          onSendTargetedPrompt={(prompt: string) => SendMessage(prompt, null)}
        />

      </div>

      <Dialog open={showSubdomainModal} onOpenChange={setShowSubdomainModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Publish Website</DialogTitle>
            <DialogDescription>
              Enter a subdomain to host your website.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <div className="flex items-center">
                {typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_BASE_DOMAIN || !window.location.host.endsWith(process.env.NEXT_PUBLIC_BASE_DOMAIN)) && (
                  <div className="bg-muted px-3 border border-r-0 rounded-l-md h-10 flex items-center text-sm text-muted-foreground whitespace-nowrap">
                    {window.location.host}/sites/
                  </div>
                )}
                <Input
                  id="subdomain"
                  placeholder="my-awesome-site"
                  value={subdomainInput}
                  onChange={(e) => setSubdomainInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className={typeof window !== 'undefined' && (!process.env.NEXT_PUBLIC_BASE_DOMAIN || !window.location.host.endsWith(process.env.NEXT_PUBLIC_BASE_DOMAIN)) ? "rounded-l-none focus-visible:ring-0" : "rounded-r-none focus-visible:ring-0 border-r-0"}
                />
                {(typeof window === 'undefined' || (process.env.NEXT_PUBLIC_BASE_DOMAIN && window.location.host.endsWith(process.env.NEXT_PUBLIC_BASE_DOMAIN))) && (
                  <div className="bg-muted px-3 border border-l-0 rounded-r-md h-10 flex items-center text-sm text-muted-foreground whitespace-nowrap">
                    .{typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_BASE_DOMAIN || window.location.host) : 'localhost'}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="default"
              onClick={async () => {
                if (!subdomainInput) {
                  toast.error("Please enter a subdomain");
                  return;
                }
                setShowSubdomainModal(false);
                await PublishGeneratedCode(generatedCode, subdomainInput);
              }}
              disabled={!subdomainInput || isPublishing}
            >
              {isPublishing ? "Publishing..." : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const PlayGround = () => {
  return (
    <Suspense fallback={<div>Loading playground...</div>}>
      <PlayGroundContent />
    </Suspense>
  )
}

export default PlayGround
