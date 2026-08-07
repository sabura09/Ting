"use client"

import { CalendarCheck, CreditCard, LayoutGrid, LogIn, SendHorizontal, Paperclip, X, Image as ImageIcon, Wand2 } from 'lucide-react'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const suggestions = [
  {
    label: 'Auth Login Form',
    prompt: 'Create a modern login form featuring email/password inputs, password strength indicator, OAuth buttons, and a glassmorphic card design with soft glow accents.',
    icon: LogIn,
  },
  {
    label: 'Billing Settings',
    prompt: 'Create a modern billing settings UI with subscription overview, plan cards, invoice history table, and a payment method section. Make it clean, minimal, and responsive.',
    icon: CreditCard,
  },
  {
    label: 'Event Scheduler',
    prompt: 'Create a modern event scheduler module with a calendar sidebar, event list, color-coded tags, and an elegant modal for creating new events.',
    icon: CalendarCheck,
  },
  {
    label: 'Workspace Dashboard',
    prompt: 'Create a modern workspace dashboard with a sidebar, project cards, quick-action buttons, and recent activity feed. Use subtle gradients, neumorphism-inspired shadows, and clear hierarchy.',
    icon: LayoutGrid,
  },
];

/* Floating decorative icons config */
const floatingIcons = [
  { emoji: '🚀', top: '8%', left: '8%', size: 'text-4xl', delay: 0 },
  { emoji: '🎨', bottom: '22%', left: '6%', size: 'text-5xl', delay: 0.3 },
  { emoji: '💡', top: '14%', right: '10%', size: 'text-3xl', delay: 0.5 },
  { emoji: '🎯', bottom: '18%', right: '7%', size: 'text-5xl', delay: 0.7 },
  { emoji: '⭐', bottom: '35%', left: '12%', size: 'text-3xl', delay: 0.4 },
  { emoji: '🧩', top: '25%', right: '5%', size: 'text-4xl', delay: 0.2 },
];

const Hero = () => {
  const [userInput, setUserInput] = useState<string>("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();

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

  const CreateNewProject = async () => {
    if (!userInput.trim() && !selectedImage) return;
    
    // Pass image via localStorage because it's too large for query strings
    if (selectedImage) {
      localStorage.setItem('initialImage', selectedImage);
    } else {
      localStorage.removeItem('initialImage');
    }

    router.push(`/playground?userprompt=${encodeURIComponent(userInput)}`)
  }

  // Handle shift+enter to submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      CreateNewProject();
    }
  }

  return (
    <div className="relative flex flex-col items-center min-h-[82vh] justify-center overflow-hidden w-full py-16 md:py-24">

      {/* Import fonts */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
      `}} />

      {/* Subtle cross-hatch grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />
      {/* Soft radial gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 40%, rgba(139,92,246,0.04), transparent)',
        }}
      />

      {/* Floating decorative icons */}
      {floatingIcons.map((icon, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.6 + icon.delay, ease: 'easeOut' }}
          className={`absolute ${icon.size} select-none pointer-events-none hidden md:block`}
          style={{
            top: icon.top,
            left: icon.left,
            right: icon.right,
            bottom: icon.bottom,
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.08))',
          } as React.CSSProperties}
        >
          <motion.span
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-block"
          >
            {icon.emoji}
          </motion.span>
        </motion.div>
      ))}

      <div className="z-10 flex flex-col items-center w-full px-4 max-w-4xl mx-auto">

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="text-center"
        >
          <h1
            className="font-extrabold text-[2.5rem] leading-[1.1] sm:text-5xl md:text-[4rem] lg:text-[4.5rem] tracking-tight text-slate-900 dark:text-white"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Bring your{' '}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 35%, #ec4899 70%, #f43f5e 100%)',
                WebkitBackgroundClip: 'text',
              }}
            >
              imagination
            </span>
            <br />
            to reality.
          </h1>

          <p
            className="mt-5 text-base sm:text-lg text-slate-500 dark:text-slate-400 font-normal max-w-xl mx-auto leading-relaxed"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Describe any web interface. Our AI will instantly design, build, and deploy it.{' '}
            <span className="block sm:inline">No coding required.</span>
          </p>
        </motion.div>

        {/* Textarea Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="w-full max-w-2xl mt-10 relative"
        >
          <div
            className={`
              relative w-full rounded-2xl bg-white dark:bg-zinc-900
              shadow-[0_2px_24px_-4px_rgba(0,0,0,0.06)]
              dark:shadow-[0_2px_24px_-4px_rgba(0,0,0,0.4)]
              transition-shadow duration-300
              ${isFocused
                ? 'shadow-[0_4px_32px_-4px_rgba(139,92,246,0.12)] ring-1 ring-violet-300/40 dark:ring-violet-500/20'
                : 'ring-1 ring-slate-200/60 dark:ring-white/[0.06]'
              }
            `}
          >
            <div className="flex flex-col px-5 pt-5 pb-3">
              {/* Image preview */}
              <AnimatePresence>
                {selectedImage && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="relative w-20 h-20 mb-3"
                  >
                    <img 
                      src={selectedImage} 
                      alt="Upload preview" 
                      className="w-full h-full object-cover rounded-xl border border-violet-300 shadow-sm"
                    />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                placeholder='Ask AI Suite to build a website that can...'
                value={userInput}
                onChange={(event) => setUserInput(event.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
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
                style={{ border: 'none', outline: 'none', boxShadow: 'none', fontFamily: '"DM Sans", sans-serif' }}
                className="
                  w-full h-24 resize-none
                  bg-transparent
                  text-slate-700 dark:text-slate-200
                  placeholder-slate-400 dark:placeholder-slate-500
                  text-base font-normal
                  leading-relaxed focus:outline-none focus:ring-0
                "
              />

              {/* Bottom toolbar */}
              <div className="flex items-center justify-between mt-1 pt-3 border-t border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-1">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                      text-slate-500 dark:text-slate-400
                      hover:bg-slate-50 dark:hover:bg-white/[0.04]
                      transition-colors duration-200
                    "
                  >
                    <ImageIcon size={14} />
                    <span>Attach Image</span>
                  </button>
                  <button
                    type="button"
                    className="
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                      text-slate-500 dark:text-slate-400
                      hover:bg-slate-50 dark:hover:bg-white/[0.04]
                      transition-colors duration-200
                    "
                  >
                    <Wand2 size={14} />
                    <span>Build mode</span>
                  </button>
                </div>

                {/* Send button – gradient circle */}
                <button
                  disabled={!userInput.trim() && !selectedImage}
                  onClick={CreateNewProject}
                  aria-label="Generate"
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${!userInput.trim() && !selectedImage
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-white/30 cursor-not-allowed'
                      : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 active:scale-95'
                    }
                  `}
                  style={{ border: 'none' }}
                >
                  <SendHorizontal size={16} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Suggestion Chips */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
          className="mt-6 flex flex-wrap items-center justify-center gap-2"
        >
          <span
            className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-1"
            style={{ fontFamily: '"DM Sans", sans-serif' }}
          >
            Try one&nbsp;&nbsp;→
          </span>
          {suggestions.map((suggestion, index) => (
            <motion.button 
              key={index}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setUserInput(suggestion.prompt)}
              className="
                px-4 py-1.5 rounded-full text-sm font-medium
                text-slate-600 dark:text-slate-300
                bg-white dark:bg-zinc-800
                ring-1 ring-slate-200 dark:ring-white/[0.08]
                hover:ring-violet-300 dark:hover:ring-violet-500/30
                hover:shadow-sm
                transition-all duration-200
              "
              style={{ fontFamily: '"DM Sans", sans-serif' }}
            >
              {suggestion.label}
            </motion.button>
          ))}
        </motion.div>

        {/* Social proof */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-6 text-xs text-slate-400 dark:text-slate-500 font-medium tracking-wide"
          style={{ fontFamily: '"DM Sans", sans-serif' }}
        >
          Trusted by 100k+ users
        </motion.p>
      </div>
    </div>
  )
}

export default Hero
