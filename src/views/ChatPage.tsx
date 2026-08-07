"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Bot, User, Paperclip, X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { systemPrompts } from "@/config/prompts";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { useGeminiStream } from "@/hooks/useGeminiStream";
import { chatTools } from "@/utils/tools";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  image?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { generateStream, isStreaming, streamedText, toolCalls } = useGeminiStream();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedText, isStreaming, toolCalls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
      image: selectedImage || undefined
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    const currentImage = selectedImage;
    setInput("");
    setSelectedImage(null);

    try {
      const response = await generateStream(
        systemPrompts.chat,
        currentInput,
        currentImage || undefined,
        chatTools,
        "chat",
        messages
      );
      if (response.error) throw new Error(response.error);

      let finalText = response.text;

      // Handle Tool Calls
      if (response.toolCalls && response.toolCalls.length > 0) {
        for (const call of response.toolCalls) {
          let result = "";
          const args = call.args;

          if (call.name === 'calculator') {
            try {
              // Sanitize expression: allow only numbers, basic operators, and parentheses
              const sanitized = args.expression.replace(/[^-+*/%()0-9. ]/g, '').trim();
              if (!sanitized) throw new Error("Invalid expression");
              
              // Evaluate sanitized expression
              const evaluated = new Function(`return ${sanitized}`)();
              result = `${sanitized} = ${evaluated}`;
            } catch (err) {
              result = "Could not calculate result";
            }
          } else if (call.name === 'get_current_time') {
            try {
              result = new Date().toLocaleTimeString('en-US', { timeZone: args.timezone });
            } catch {
              result = `Error getting time for ${args.timezone}`;
            }
          } else {
            result = `Tool ${call.name} executed.`;
          }

          finalText += `\n\n> 🛠️ **Tool Used:** \`${call.name}\`  \n> 📊 **Result:** ${result}\n`;
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: finalText || "No response received",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get response. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <MessageSquare className="w-6 h-6 text-ai-primary" />
          <h1 className="text-2xl font-bold">AI Chat Assistant</h1>
        </div>
        <p className="text-muted-foreground">
          Have natural conversations with AI to get answers, brainstorm ideas, or solve problems.
        </p>
      </div>

      <div className="flex-1 flex flex-col">
        <Card className="ai-card flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Chat</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation with the AI assistant!</p>
                    <p className="text-sm mt-2">Ask questions, get help, or just chat.</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                    >
                      <div
                        className={`flex gap-3 max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"
                          }`}
                      >
                        <div className="flex-shrink-0">
                          {message.role === "user" ? (
                            <div className="w-8 h-8 bg-ai-primary rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-primary-foreground" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-ai-secondary rounded-full flex items-center justify-center">
                              <Bot className="w-4 h-4 text-primary-foreground " />
                            </div>
                          )}
                        </div>
                        <div
                          className={`rounded-lg p-3 ${message.role === "user"
                            ? "bg-ai-primary text-primary-foreground"
                            : "bg-muted"
                            }`}
                        >
                          {message.image && (
                            <div className="mb-2 relative rounded-md overflow-hidden bg-black/5 dark:bg-white/5">
                              <img 
                                src={message.image} 
                                alt="Shared image" 
                                className="max-w-full h-auto max-h-60 object-contain rounded-md"
                              />
                            </div>
                          )}
                          {message.role === "assistant" ? (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                            <MarkdownRenderer content={message.content} />
                            </div>
                          ) : (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-white">
                              {message.content}
                            </p>
                          )}
                          <p className="text-xs opacity-70 mt-2 text-black-100">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isStreaming && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex gap-3 max-w-[80%] flex-row">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-ai-secondary rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-primary-foreground" />
                        </div>
                      </div>
                      <div className="rounded-lg p-3 bg-muted">
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          {/* Show streaming text */}
                          {streamedText && (
                            <MarkdownRenderer content={streamedText} />
                          )}

                          {/* Show streaming tool calls */}
                          {toolCalls.length > 0 && (
                            <div className="mt-2 p-2 bg-background/50 rounded text-xs font-mono">
                              <div>Using tools:</div>
                              {toolCalls.map((call, i) => (
                                <div key={i} className="opacity-70">
                                  &gt; {call.name}({JSON.stringify(call.args)})
                                </div>
                              ))}
                            </div>
                          )}

                          {!streamedText && toolCalls.length === 0 && (
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-100"></div>
                              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse delay-200"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <AnimatePresence>
                {selectedImage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="relative w-20 h-20 mb-2 group"
                  >
                    <img 
                      src={selectedImage} 
                      alt="Preview" 
                      className="w-full h-full object-cover rounded-lg border-2 border-ai-primary/30 shadow-md"
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 duration-200"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute inset-0 bg-black/20 rounded-lg group-hover:bg-black/0 transition-colors pointer-events-none" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 items-end">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={openFileDialog}
                  className="h-10 w-10 text-muted-foreground hover:text-ai-primary hover:bg-ai-primary/5 shrink-0 rounded-full transition-all"
                  disabled={isStreaming}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  className="min-h-[44px] max-h-[120px] resize-none py-3 focus-visible:ring-ai-primary/20 transition-all border-muted-foreground/20 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={(!input.trim() && !selectedImage) || isStreaming}
                  size="icon"
                  className={`
                    h-11 w-11 shrink-0 rounded-full transition-all duration-300
                    ${(!input.trim() && !selectedImage) 
                      ? 'bg-muted text-muted-foreground' 
                      : 'bg-ai-primary text-primary-foreground shadow-lg shadow-ai-primary/20 hover:scale-105 active:scale-95'}
                  `}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
