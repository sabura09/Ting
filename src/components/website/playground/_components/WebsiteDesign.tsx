import React, { useContext, useEffect, useRef, useState } from 'react'
import WebpageTools from './WebpageTools'
import ElementSetting from './ElementSetting'
import ImageSettingSection from './ImageSettingsSection'
import { toast } from 'sonner'
import { HTML_TEMPLATE, cleanupCode } from '@/utils/htmlProcessor';

type Props = {
  generatedCode: string
  onSave?: () => void
  onPublish?: () => void
  onUnpublish?: () => void
  isSaving: boolean
  isPublishing?: boolean
  loading: boolean
  projectSubdomain?: string | null
  visualEditsActive: boolean
  selectedElementPath: number[] | null
  setSelectedElementPath: (path: number[] | null) => void
  setSelectedElementTag: (tag: string | null) => void
  onCodeChange: (newHtml: string) => void
  onSendTargetedPrompt: (prompt: string) => void
}

const getElementPath = (el: HTMLElement, root: HTMLElement): number[] => {
  const path: number[] = [];
  let current: HTMLElement | null = el;
  while (current && current !== root) {
    const parent = current.parentElement;
    if (!parent) break;
    const index = Array.from(parent.children).indexOf(current);
    path.unshift(index);
    current = parent;
  }
  return path;
};

const WebsiteDesign = ({
  generatedCode,
  onSave,
  onPublish,
  onUnpublish,
  isSaving,
  isPublishing,
  loading,
  projectSubdomain,
  visualEditsActive,
  selectedElementPath,
  setSelectedElementPath,
  setSelectedElementTag,
  onCodeChange,
  onSendTargetedPrompt
}: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [SelectedScreenSize, setSelectedScreenSize] = useState('web')
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null)
  const hoverEl = useRef<HTMLElement | null>(null)
  const lastSerializedCodeRef = useRef<string>("")

  // Keep track of selectedElement for event listeners without re-binding
  const selectedElRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    selectedElRef.current = selectedElement
  }, [selectedElement])

  const visualEditsActiveRef = useRef(visualEditsActive)
  useEffect(() => {
    visualEditsActiveRef.current = visualEditsActive

    // Clear styles if deactivated
    if (!visualEditsActive) {
      if (selectedElement) {
        selectedElement.style.outline = "";
      }
      setSelectedElement(null);
      setSelectedElementPath(null);
      setSelectedElementTag(null);
    }
  }, [visualEditsActive])

  // Sync if selection cleared externally (e.g. breadcrumb close button)
  useEffect(() => {
    if (!selectedElementPath) {
      if (selectedElement) {
        selectedElement.style.outline = "";
      }
      setSelectedElement(null);
    }
  }, [selectedElementPath]);

  function fixImageSources(html: string) {
    const placeholder = "/1.jpg";

    return html.replace(/<img[^>]*src=["'][^"']*["'][^>]*>/g, (tag) => {
      return tag.replace(/src=["'][^"']*["']/, `src="${placeholder}"`);
    });
  }

  const safeHTML = fixImageSources(generatedCode);

  // Initialize iframe shell once
  useEffect(() => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(HTML_TEMPLATE);
    doc.close();

    const handleMouseOver = (e: MouseEvent) => {
      if (!visualEditsActiveRef.current) return;
      if (selectedElRef.current) return; // Do not highlight hovered element if one is selected

      const target = e.target as HTMLElement;
      if (hoverEl.current && hoverEl.current !== target) {
        hoverEl.current.style.outline = "";
      }
      hoverEl.current = target;
      hoverEl.current.style.outline = "2px dashed #3b82f6";
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!visualEditsActiveRef.current) return;
      if (selectedElRef.current) return;

      const target = e.target as HTMLElement;
      if (hoverEl.current === target) {
        hoverEl.current.style.outline = "";
        hoverEl.current = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!visualEditsActiveRef.current) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      if (selectedElRef.current === target) return;

      if (selectedElRef.current) {
        selectedElRef.current.style.outline = "";
      }

      if (hoverEl.current) {
        hoverEl.current.style.outline = "";
        hoverEl.current = null;
      }

      target.style.outline = "2px solid #3b82f6";
      setSelectedElement(target);

      const rootEl = doc.getElementById("root");
      if (rootEl) {
        const path = getElementPath(target, rootEl);
        setSelectedElementPath(path);
        setSelectedElementTag(target.tagName.toLowerCase());
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Placeholder for keydown logic
    };

    doc.addEventListener("mouseover", handleMouseOver);
    doc.addEventListener("mouseout", handleMouseOut);
    doc.addEventListener("click", handleClick);
    doc.addEventListener("keydown", handleKeyDown);

    // Cleanup on unmount
    return () => {
      doc.removeEventListener("mouseover", handleMouseOver);
      doc.removeEventListener("mouseout", handleMouseOut);
      doc.removeEventListener("click", handleClick);
      doc.removeEventListener("keydown", handleKeyDown);
    };
  }, []); // Initialize once

  // Render or update generatedCode
  useEffect(() => {
    if (!iframeRef.current) return
    const doc = iframeRef.current.contentDocument
    if (!doc) return

    // Skip rewriting if update was done locally (e.g. from sidebar style modifications)
    if (safeHTML === lastSerializedCodeRef.current) {
      return
    }

    const root = doc.getElementById("root")
    if (root) {
      root.innerHTML = safeHTML
      // Re-initialize Flowbite components if available
      try {
        (doc.defaultView as any)?.initFlowbite?.();
      } catch (e) {
        console.warn("Flowbite init failed", e);
      }
    }
  }, [generatedCode])

  const handleStyleChange = () => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    const root = doc.getElementById("root");
    if (root) {
      const newHtml = root.innerHTML;
      lastSerializedCodeRef.current = fixImageSources(cleanupCode(newHtml));
      onCodeChange(newHtml);
    }
  };

  return (
    <div className='flex gap-2 flex-1 min-w-0 h-full'>
      <div className="p-5 flex-1 min-w-0 h-full flex items-center flex-col">
        <iframe
          ref={iframeRef}
          className={`${SelectedScreenSize == 'web' ? 'w-full' : 'w-[375px]'} h-full border border-gray-200 dark:border-zinc-700 rounded-xl bg-white shadow-sm transition-all duration-300 ease-in-out`}
          sandbox='allow-scripts allow-same-origin'
        />
        <WebpageTools SelectedScreenSize={SelectedScreenSize}
          setSelectedScreenSize={setSelectedScreenSize}
          generatedCode={safeHTML}
          onSave={onSave}
          onPublish={onPublish}
          onUnpublish={onUnpublish}
          isSaving={isSaving}
          isPublishing={isPublishing}
          loading={loading}
          projectSubdomain={projectSubdomain}
          visualEditsActive={visualEditsActive}
        />
      </div>

      {/* Setting section */}
      {selectedElement?.tagName == "IMG" ?
        <ImageSettingSection
          selectedEl={selectedElement as HTMLImageElement}
          clearSelection={() => {
            setSelectedElement(null);
            setSelectedElementPath(null);
            setSelectedElementTag(null);
          }}
        /> :
        selectedElement ? (
          <ElementSetting
            selectedEl={selectedElement}
            clearSelection={() => {
              setSelectedElement(null);
              setSelectedElementPath(null);
              setSelectedElementTag(null);
            }}
            onStyleChange={handleStyleChange}
            onSendTargetedPrompt={onSendTargetedPrompt}
          />
        ) : null}
    </div>
  )
}

export default WebsiteDesign
