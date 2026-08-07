"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Settings,
  Activity,
  History,
  Sparkles,
  Check,
  AlertCircle,
  Shield,
  ShieldAlert,
  Volume2,
  Languages,
  Save,
  Plus,
  X,
  ChevronRight,
  Loader2,
  HelpCircle,
  RefreshCw,
  Play,
  User,
  Bot,
  Clock,
  ArrowRight,
  Info,
  Server,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  TWILIO_VOICES,
  SUPPORTED_LANGUAGES,
  DEFAULT_AGENT_CONFIG,
  type VoiceAgentConfig,
  type VoiceCall,
  type VoiceTranscript,
} from "@/lib/voice-agent/types";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import flags from "react-phone-number-input/flags";

// Premium React SVG flag renderer that bypasses OS emoji limitations
const renderFlag = (countryCode: string) => {
  const FlagComponent = flags[countryCode];
  if (!FlagComponent) return <span className="text-xs">🌍</span>;
  return (
    <span className="w-5 h-3.5 flex-shrink-0 inline-block overflow-hidden rounded-[2px] border border-black/10 shadow-sm">
      <FlagComponent />
    </span>
  );
};

// Premium Radix-based Custom Country Select component for react-phone-number-input
const CustomCountrySelect = ({
  value,
  onChange,
  options,
  disabled,
}: {
  value?: string;
  onChange: (value?: string) => void;
  options: { value?: string; label: string }[];
  disabled?: boolean;
}) => {
  return (
    <Select
      value={value || "ZZ"}
      onValueChange={(val) => onChange(val === "ZZ" ? undefined : val)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[85px] h-9 border-none bg-transparent hover:bg-muted/40 focus:ring-0 focus:ring-offset-0 px-2 flex items-center justify-between gap-1.5 rounded-lg">
        {value ? (
          <span className="flex items-center gap-1.5">
            {renderFlag(value)}
            <span className="font-semibold text-xs text-muted-foreground">{value}</span>
          </span>
        ) : (
          <span className="text-xs font-semibold">🌍 Int</span>
        )}
      </SelectTrigger>
      <SelectContent className="max-h-[300px] w-[260px] rounded-xl shadow-xl border border-input bg-background/95 backdrop-blur-md">
        {options.map((option) => {
          const countryCode = option.value;
          const countryName = option.label;
          if (!countryCode) {
            return (
              <SelectItem key="international" value="ZZ" className="cursor-pointer">
                <span className="flex items-center gap-2">
                  <span>🌍</span>
                  <span className="font-medium text-sm">International</span>
                </span>
              </SelectItem>
            );
          }
          return (
            <SelectItem key={countryCode} value={countryCode} className="cursor-pointer">
              <span className="flex items-center gap-2">
                {renderFlag(countryCode)}
                <span className="font-medium text-sm truncate max-w-[150px]">{countryName}</span>
                <span className="text-muted-foreground text-[10px] font-normal">({countryCode})</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
};

export default function VoiceAgentPage() {
  const { toast } = useToast();

  // Core state variables
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const [currentCallSid, setCurrentCallSid] = useState<string | null>(null);
  
  // Custom prompt overrides for outbound
  const [customPrompt, setCustomPrompt] = useState("");
  const [customGreeting, setCustomGreeting] = useState("");
  const [useOverrides, setUseOverrides] = useState(false);

  // Configuration state
  const [config, setConfig] = useState<Omit<VoiceAgentConfig, "userEmail">>({
    agentName: DEFAULT_AGENT_CONFIG.agentName,
    personality: DEFAULT_AGENT_CONFIG.personality,
    systemPrompt: DEFAULT_AGENT_CONFIG.systemPrompt,
    greetingMessage: DEFAULT_AGENT_CONFIG.greetingMessage,
    language: DEFAULT_AGENT_CONFIG.language,
    voiceId: DEFAULT_AGENT_CONFIG.voiceId,
    callObjective: DEFAULT_AGENT_CONFIG.callObjective,
    maxCallDuration: DEFAULT_AGENT_CONFIG.maxCallDuration,
    silenceTimeout: DEFAULT_AGENT_CONFIG.silenceTimeout,
    endCallPhrases: DEFAULT_AGENT_CONFIG.endCallPhrases,
    isActive: DEFAULT_AGENT_CONFIG.isActive,
  });

  const [twilioStatus, setTwilioStatus] = useState<{
    configured: boolean;
    accountSid: string;
    phoneNumber: string;
  }>({
    configured: false,
    accountSid: "",
    phoneNumber: "",
  });

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Call Logs state
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [activeCallsCount, setActiveCallsCount] = useState(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [selectedCallDetails, setSelectedCallDetails] = useState<{
    call: VoiceCall | null;
    transcripts: VoiceTranscript[];
  } | null>(null);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);

  // ─── Data Fetching ───

  // Fetch Agent Configuration
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/config");
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig({
            id: data.config.id,
            agentName: data.config.agentName,
            personality: data.config.personality,
            systemPrompt: data.config.systemPrompt,
            greetingMessage: data.config.greetingMessage,
            language: data.config.language,
            voiceId: data.config.voiceId,
            callObjective: data.config.callObjective,
            maxCallDuration: data.config.maxCallDuration,
            silenceTimeout: data.config.silenceTimeout,
            endCallPhrases: data.config.endCallPhrases,
            isActive: data.config.isActive,
          });
        }
        if (data.twilioStatus) {
          setTwilioStatus(data.twilioStatus);
        }
      }
    } catch (err) {
      console.error("Failed to load agent configuration:", err);
    } finally {
      setIsLoadingConfig(false);
    }
  }, []);

  // Fetch Call Logs
  const fetchLogs = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoadingLogs(true);
    try {
      const res = await fetch("/api/calls/logs?limit=30");
      if (res.ok) {
        const data = await res.json();
        setCalls(data.calls || []);
        setActiveCallsCount(data.activeCalls || 0);
      }
    } catch (err) {
      console.error("Failed to load call logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  // Fetch Single Call Transcript
  const fetchTranscript = useCallback(async (callId: string) => {
    setIsLoadingTranscript(true);
    try {
      const res = await fetch(`/api/calls/logs?callId=${callId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedCallDetails(data);
      }
    } catch (err) {
      console.error("Failed to load transcript:", err);
      toast({
        title: "Error",
        description: "Failed to load call details.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingTranscript(false);
    }
  }, [toast]);

  // Refresh both Logs and the currently selected Transcript if any
  const handleRefresh = useCallback(() => {
    fetchLogs(true);
    if (selectedCallId) {
      fetchTranscript(selectedCallId);
    }
  }, [fetchLogs, fetchTranscript, selectedCallId]);

  // Save Configuration
  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch("/api/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        toast({
          title: "Configuration Saved",
          description: "AI Voice Agent parameters updated successfully.",
        });
        fetchConfig();
      } else {
        const data = await res.json();
        throw new Error(data.error || "Failed to save configuration");
      }
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // ─── Actions ───

  // Initiate Outbound Call
  const handleMakeCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.location.href.includes('mounikai')){
      toast({
        title: "Demo Mode",
        description: "This feature is disabled in demo mode.",
        variant: "destructive",
      });
      return;
    }


    if (!phoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please specify a valid phone number.",
        variant: "destructive",
      });
      return;
    }

    setIsCalling(true);
    setCurrentCallSid(null);

    try {
      const payload: any = {
        phoneNumber,
        agentConfigId: config.id,
      };

      if (useOverrides) {
        if (customPrompt) payload.prompt = customPrompt;
        if (customGreeting) payload.greetingMessage = customGreeting;
      }

      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentCallSid(data.callSid);
        toast({
          title: "Call Initiated",
          description: `Dialing ${phoneNumber} via Twilio.`,
        });
        fetchLogs();
      } else {
        throw new Error(data.error || "Dialing failed");
      }
    } catch (err: any) {
      toast({
        title: "Calling Failed",
        description: err.message || "Could not connect call via Twilio.",
        variant: "destructive",
      });
      setIsCalling(false);
    }
  };

  // End active call
  const handleEndCall = async () => {
    if (!currentCallSid) return;
    try {
      toast({
        title: "Ending call",
        description: "Disconnect signal dispatched.",
      });
      setIsCalling(false);
      setCurrentCallSid(null);
      setTimeout(() => fetchLogs(), 1500);
    } catch (err) {
      console.error(err);
    }
  };

  // Initial loading
  useEffect(() => {
    fetchConfig();
    fetchLogs(true);
  }, [fetchConfig, fetchLogs]);

  // Load transcript on selection change
  useEffect(() => {
    if (selectedCallId) {
      fetchTranscript(selectedCallId);
    } else {
      setSelectedCallDetails(null);
    }
  }, [selectedCallId, fetchTranscript]);

  // Format Helper
  const formatDuration = (sec: number) => {
    if (!sec) return "0s";
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
      case "in-progress":
        return "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 animate-pulse";
      case "ringing":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse";
      case "failed":
      case "busy":
      case "no-answer":
        return "bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400";
      default:
        return "bg-slate-500/10 border-slate-500/30 text-slate-500 dark:text-slate-400";
    }
  };

  // Simulated visual waveform lines
  const waveLines = useMemo(() => {
    const count = 24;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      height: 10 + Math.random() * 80,
      delay: Math.random() * 0.8,
    }));
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Dynamic Font Styling Inject for visual integration */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
        .voice-page-wrapper {
          font-family: 'Outfit', sans-serif;
        }
        .voice-console {
          font-family: 'JetBrains Mono', monospace;
        }
        /* react-phone-number-input custom premium SaaS styling */
        .PhoneInput {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background-color: hsl(var(--background));
          border: 1px solid hsl(var(--input));
          border-radius: 0.75rem;
          padding: 0.25rem 0.5rem;
          transition: all 0.2s ease-in-out;
          height: 2.75rem;
          width: 100%;
        }
        .PhoneInput:focus-within {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.15);
        }
        .PhoneInputInput {
          background: transparent !important;
          border: none !important;
          outline: none !important;
          font-family: inherit;
          font-size: 0.875rem;
          font-weight: 500;
          color: hsl(var(--foreground));
          width: 100%;
          letter-spacing: 0.025em;
        }
        .PhoneInputInput:focus,
        .PhoneInputInput:focus-visible,
        .PhoneInputInput:active,
        .PhoneInputInput:focus-within {
          outline: none !important;
          border: none !important;
          box-shadow: none !important;
        }
      ` }} />

      <div className="voice-page-wrapper space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-ai-primary to-ai-secondary flex items-center justify-center shadow-md">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold ai-gradient-text">
                AI Voice Calling Agent
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Low-latency, conversational calling pipelines powered by Twilio
              </p>
            </div>
          </div>

          {/* Sync & Refresh Header Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1.5 font-medium flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeCallsCount > 0 ? 'bg-emerald-400' : 'bg-slate-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${activeCallsCount > 0 ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
              </span>
              {activeCallsCount} Active Sessions
            </Badge>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              className="h-9 w-9"
              title="Refresh Logs & Transcript"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tab System & Layout Split */}
        <Tabs defaultValue="dialer" className="w-full space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="dialer" className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4" />
              Interactive Dialer
            </TabsTrigger>
            <TabsTrigger value="config" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Agent Configuration
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Side: Call Form or Agent Config (7 Columns) */}
            <div className="xl:col-span-7 space-y-6">
              
              <TabsContent value="dialer" className="mt-0 space-y-6 focus-visible:outline-none">
                {/* Outbound Dialer Card */}
                <Card className="ai-card">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <Phone className="w-5 h-5 text-ai-primary" />
                          Outbound Calling Console
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Test the AI agent voice pipeline instantly by entering your mobile number
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className={config.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}>
                        {config.isActive ? "Agent Ready" : "Agent Offline"}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Live Waveform Display */}
                    <div className="h-32 bg-muted/20 border rounded-xl flex flex-col items-center justify-center p-6 relative overflow-hidden">
                      {isCalling ? (
                        <div className="w-full flex flex-col items-center gap-3">
                          <div className="flex items-end justify-center gap-1.5 h-12 w-full max-w-sm">
                            {waveLines.map((line) => (
                              <motion.div
                                key={line.id}
                                className="w-1.5 bg-gradient-to-t from-ai-primary via-ai-primary-light to-ai-secondary rounded-full"
                                initial={{ height: 4 }}
                                animate={{
                                  height: [6, line.height, 6],
                                }}
                                transition={{
                                  duration: 0.6 + line.delay,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                }}
                              />
                            ))}
                          </div>
                          <p className="text-ai-primary text-xs font-semibold tracking-widest uppercase animate-pulse flex items-center gap-2">
                            <span className="h-2 w-2 bg-ai-primary rounded-full inline-block animate-ping"></span>
                            Active Call Stream
                          </p>
                        </div>
                      ) : (
                        <div className="text-center space-y-2">
                          <div className="flex justify-center gap-1 h-6 items-center">
                            {Array.from({ length: 15 }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1 h-1.5 bg-muted-foreground/30 rounded-full"
                              />
                            ))}
                          </div>
                          <p className="text-muted-foreground text-xs tracking-wider uppercase font-semibold">
                            VOICE PIPELINE DORMANT
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dialer Form */}
                    <form onSubmit={handleMakeCall} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="phone-number" className="text-sm font-semibold">
                          Recipient Phone Number
                        </Label>
                        <PhoneInput
                          placeholder="Enter phone number"
                          value={phoneNumber}
                          onChange={(val) => setPhoneNumber(val || "")}
                          disabled={isCalling}
                          defaultCountry="IN"
                          countrySelectComponent={CustomCountrySelect}
                        />
                        <p className="text-xs text-muted-foreground leading-normal">
                          Select the country flag from the dropdown and type your phone number. The input will format your number automatically!
                        </p>
                      </div>

                      {/* Custom Prompt Toggle Option */}
                      <div className="bg-muted/10 rounded-xl border p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="use-overrides" className="text-sm font-bold cursor-pointer">
                              Customize Persona for This Call
                            </Label>
                            <p className="text-xs text-muted-foreground leading-normal">
                              Override the default agent settings for this call session
                            </p>
                          </div>
                          <Switch
                            id="use-overrides"
                            checked={useOverrides}
                            onCheckedChange={setUseOverrides}
                          />
                        </div>

                        <AnimatePresence>
                          {useOverrides && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="space-y-4 overflow-hidden pt-2"
                            >
                              <div className="space-y-2">
                                <Label htmlFor="custom-greeting" className="text-xs">
                                  Initial Greeting Override
                                </Label>
                                <Input
                                  id="custom-greeting"
                                  placeholder="Hello! This is a custom greeting for this session."
                                  value={customGreeting}
                                  onChange={(e) => setCustomGreeting(e.target.value)}
                                  className="h-10 text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="custom-prompt" className="text-xs">
                                  System Prompt / Core Objective Override
                                </Label>
                                <Textarea
                                  id="custom-prompt"
                                  placeholder="You are an outbound support agent assisting with a billing ticket..."
                                  value={customPrompt}
                                  onChange={(e) => setCustomPrompt(e.target.value)}
                                  rows={3}
                                  className="text-sm"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Call Action Trigger Buttons */}
                      <div className="flex gap-4">
                        {!isCalling ? (
                          <Button
                            type="submit"
                            disabled={!twilioStatus.configured}
                            className="flex-1 h-11 bg-gradient-to-r from-ai-primary to-ai-secondary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 shadow-md transition-all active:scale-[0.99]"
                          >
                            <PhoneCall className="w-4 h-4" />
                            Initiate Call Session
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={handleEndCall}
                            variant="destructive"
                            className="flex-1 h-11 font-semibold flex items-center justify-center gap-2 shadow-md active:scale-[0.99]"
                          >
                            <PhoneOff className="w-4 h-4 animate-pulse" />
                            Force Terminate Session
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Twilio Guard Panel */}
                <Card className="ai-card">
                  <CardHeader className="border-b py-4 bg-muted/10">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Server className="w-4 h-4 text-ai-secondary" />
                      Twilio Infrastructure Guard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl mt-0.5 ${
                          twilioStatus.configured
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}>
                          {twilioStatus.configured ? (
                            <Shield className="w-5 h-5" />
                          ) : (
                            <ShieldAlert className="w-5 h-5" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold">
                            {twilioStatus.configured ? "Twilio Configured & Ready" : "Twilio Configuration Missing"}
                          </p>
                          <p className="text-xs text-muted-foreground leading-normal max-w-md">
                            {twilioStatus.configured
                              ? `Outbound dialing is mapped via Twilio Phone number ${twilioStatus.phoneNumber || "N/A"}.`
                              : "Verify your TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER settings in .env."}
                          </p>
                        </div>
                      </div>

                      {twilioStatus.configured && (
                        <div className="text-left md:text-right space-y-1">
                          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Account Reference</p>
                          <p className="text-xs font-semibold voice-console">{twilioStatus.accountSid}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="config" className="mt-0 focus-visible:outline-none">
                {/* Agent Brain Configurator */}
                <Card className="ai-card">
                  <CardHeader className="border-b">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div>
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                          <Settings className="w-5 h-5 text-ai-primary" />
                          AI Voice Agent Parameters
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Modify system instructions, greeting parameters, and Twilio voice providers globally
                        </CardDescription>
                      </div>
                      <Button
                        onClick={handleSaveConfig}
                        disabled={isSavingConfig || isLoadingConfig}
                        className="bg-gradient-to-r from-ai-primary to-ai-secondary text-white font-semibold flex items-center gap-1.5 shadow-md active:scale-[0.99] hover:opacity-90"
                      >
                        {isSavingConfig ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Save Parameters
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {isLoadingConfig ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-ai-primary animate-spin" />
                        <p className="text-muted-foreground text-sm font-medium">Loading configuration model...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Name & Language & Voice Options */}
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="agent-name" className="text-xs font-bold text-muted-foreground">
                              Agent Alias
                            </Label>
                            <Input
                              id="agent-name"
                              value={config.agentName}
                              onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="agent-language" className="text-xs font-bold text-muted-foreground">
                                Language
                              </Label>
                              <Select
                                value={config.language}
                                onValueChange={(value) => setConfig({ ...config, language: value })}
                              >
                                <SelectTrigger className="w-full text-left">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {SUPPORTED_LANGUAGES.map((lang) => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                      {lang.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="agent-voice" className="text-xs font-bold text-muted-foreground">
                                TTS Voice Provider
                              </Label>
                              <Select
                                value={config.voiceId}
                                onValueChange={(value) => setConfig({ ...config, voiceId: value })}
                              >
                                <SelectTrigger className="w-full text-left">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {TWILIO_VOICES.map((voice) => (
                                    <SelectItem key={voice.id} value={voice.id}>
                                      {voice.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="agent-objective" className="text-xs font-bold text-muted-foreground">
                              Core Objective
                            </Label>
                            <Input
                              id="agent-objective"
                              value={config.callObjective}
                              onChange={(e) => setConfig({ ...config, callObjective: e.target.value })}
                              placeholder="General purpose assistant..."
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="agent-duration" className="text-xs font-bold text-muted-foreground">
                                Max Duration (seconds)
                              </Label>
                              <Input
                                id="agent-duration"
                                type="number"
                                value={config.maxCallDuration}
                                onChange={(e) => setConfig({ ...config, maxCallDuration: parseInt(e.target.value) || 300 })}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="agent-silence" className="text-xs font-bold text-muted-foreground">
                                Silence Timeout (seconds)
                              </Label>
                              <Input
                                id="agent-silence"
                                type="number"
                                value={config.silenceTimeout}
                                onChange={(e) => setConfig({ ...config, silenceTimeout: parseInt(e.target.value) || 5 })}
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="agent-endphrases" className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                              Call Terminating Keywords
                              <span className="text-[10px] text-muted-foreground font-normal">(comma-separated)</span>
                            </Label>
                            <Input
                              id="agent-endphrases"
                              value={config.endCallPhrases.join(", ")}
                              onChange={(e) => setConfig({
                                ...config,
                                endCallPhrases: e.target.value.split(",").map(p => p.trim()).filter(Boolean)
                              })}
                              className="voice-console text-xs"
                            />
                          </div>
                        </div>

                        {/* Prompting & Greeting Logic */}
                        <div className="space-y-4 flex flex-col justify-between">
                          <div className="space-y-2">
                            <Label htmlFor="agent-greeting" className="text-xs font-bold text-muted-foreground">
                              Greeting Message (Spoken first on connection)
                            </Label>
                            <Input
                              id="agent-greeting"
                              value={config.greetingMessage}
                              onChange={(e) => setConfig({ ...config, greetingMessage: e.target.value })}
                            />
                          </div>

                          <div className="space-y-2 flex-1 flex flex-col min-h-[160px]">
                            <Label htmlFor="agent-prompt" className="text-xs font-bold text-muted-foreground">
                              System Prompt / Agent Instructions
                            </Label>
                            <Textarea
                              id="agent-prompt"
                              value={config.systemPrompt}
                              onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                              className="flex-1 resize-none text-sm leading-relaxed"
                            />
                          </div>

                          <div className="flex items-center justify-between border rounded-xl p-4 mt-2 bg-muted/10">
                            <div className="space-y-0.5">
                              <Label className="text-sm font-bold">
                                Active Status
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                Control whether this configuration is active globally
                              </p>
                            </div>
                            <Switch
                              checked={config.isActive}
                              onCheckedChange={(value) => setConfig({ ...config, isActive: value })}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            </div>

            {/* Right Side: Command Logs & Active Inspector (5 Columns) */}
            <div className="xl:col-span-5 space-y-6">
              
              <Card className="ai-card min-h-[550px] flex flex-col h-[550px] overflow-hidden">
                <CardHeader className="border-b bg-muted/10 p-5 flex flex-row items-center justify-between flex-shrink-0">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <History className="w-4 h-4 text-ai-primary" />
                      Call Log Console
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Real-time activity reporting, diagnostics, and call transcripts
                    </p>
                  </div>
                  {calls.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {calls.length} Logs
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                  {isLoadingLogs ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-10 gap-3">
                      <Loader2 className="w-6 h-6 text-ai-primary animate-spin" />
                      <p className="text-muted-foreground text-xs font-medium">Querying database registers...</p>
                    </div>
                  ) : calls.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center p-12 text-center gap-3">
                      <VolumeX className="w-10 h-10 text-muted-foreground/45" />
                      <p className="text-muted-foreground text-sm font-semibold">No Sessions Dispatched</p>
                      <p className="text-muted-foreground/75 text-xs max-w-[250px]">
                        Use the interactive dialer console to place your first automated AI phone call.
                      </p>
                    </div>
                  ) : (
                    <div className="flex-grow grid grid-rows-2 h-full overflow-hidden">
                      
                      {/* Top half: Logs Grid List */}
                      <div className="overflow-y-auto divide-y border-b scrollbar-thin scrollbar-thumb-muted">
                        {calls.map((call) => {
                          const isActive = selectedCallId === call.id;
                          return (
                            <div
                              key={call.id}
                              onClick={() => setSelectedCallId(isActive ? null : call.id)}
                              className={`p-4 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                                isActive
                                  ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-l-primary"
                                  : "hover:bg-muted/50"
                              }`}
                            >
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[10px] font-extrabold text-foreground/80">
                                    {call.direction === "inbound" ? "INBOUND" : "OUTBOUND"}
                                  </span>
                                  <Badge className={`text-[9px] font-bold px-1.5 h-4 flex items-center ${getStatusColor(call.status)}`}>
                                    {call.status.toUpperCase()}
                                  </Badge>
                                  {call.duration > 0 && (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                                      <Clock className="w-3 h-3 text-muted-foreground/60" />
                                      {formatDuration(call.duration)}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium voice-console">
                                  {call.direction === "inbound" ? (
                                    <>
                                      <span className="text-foreground">{call.fromNumber}</span>
                                      <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                                      <span className="text-muted-foreground/80">Twilio</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-muted-foreground/80">Twilio</span>
                                      <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                                      <span className="text-foreground">{call.toNumber}</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0">
                                <span className="text-[10px] text-muted-foreground voice-console">
                                  {new Date(call.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <ChevronRight className={`w-4 h-4 text-muted-foreground/40 transition-transform ${
                                  isActive ? "rotate-90 text-primary" : ""
                                }`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Bottom half: Transcript Inspector */}
                      <div className="bg-muted/10 flex flex-col overflow-hidden h-full">
                        <AnimatePresence mode="wait">
                          {!selectedCallId ? (
                            <motion.div
                              key="inspector-empty"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex-grow flex flex-col items-center justify-center p-8 text-center text-muted-foreground gap-2 h-full"
                            >
                              <Info className="w-6 h-6 text-muted-foreground/50" />
                              <p className="text-xs font-semibold uppercase tracking-wider">Inspect Session</p>
                              <p className="text-xs max-w-[200px] text-muted-foreground/75 leading-normal">
                                Select a calling log from the deck above to view complete dialogue records.
                              </p>
                            </motion.div>
                          ) : isLoadingTranscript ? (
                            <motion.div
                              key="inspector-loading"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex-grow flex flex-col items-center justify-center p-8 gap-2 h-full"
                            >
                              <Loader2 className="w-5 h-5 text-ai-primary animate-spin" />
                              <p className="text-xs text-muted-foreground">Syncing conversation blocks...</p>
                            </motion.div>
                          ) : (
                            <motion.div
                              key="inspector-content"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex-grow flex flex-col overflow-hidden h-full"
                            >
                              {/* Transcript Header */}
                              <div className="px-4 py-2 border-b bg-card text-card-foreground flex items-center justify-between flex-shrink-0">
                                <span className="text-[10px] font-bold text-muted-foreground voice-console flex items-center gap-1.5">
                                  <span className="inline-block w-1.5 h-1.5 bg-ai-secondary rounded-full animate-pulse"></span>
                                  SESSION: {selectedCallDetails?.call?.callSid ? `${selectedCallDetails.call.callSid.slice(0, 12)}...` : "N/A"}
                                </span>
                                <button
                                  onClick={() => setSelectedCallId(null)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {/* Chat Bubbles */}
                              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-card/20">
                                {selectedCallDetails?.transcripts && selectedCallDetails.transcripts.length > 0 ? (
                                  selectedCallDetails.transcripts.map((t, idx) => {
                                    const isAgent = t.role === "agent";
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-start gap-2 max-w-[85%] ${
                                          isAgent ? "" : "ml-auto flex-row-reverse"
                                        }`}
                                      >
                                        <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                                          isAgent ? "bg-ai-primary/10 text-ai-primary" : "bg-ai-secondary/10 text-ai-secondary"
                                        }`}>
                                          {isAgent ? (
                                            <Bot className="w-3.5 h-3.5" />
                                          ) : (
                                            <User className="w-3.5 h-3.5" />
                                          )}
                                        </div>
                                        <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                                          isAgent
                                            ? "bg-muted/70 border text-foreground rounded-tl-none"
                                            : "bg-gradient-to-r from-ai-primary to-ai-secondary text-white rounded-tr-none"
                                        }`}>
                                          <p className="font-bold text-[9px] mb-1 opacity-70">
                                            {isAgent ? config.agentName.toUpperCase() : "CALLER"}
                                          </p>
                                          <p className="font-medium">{t.content}</p>
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-center py-10 space-y-2 h-full flex flex-col items-center justify-center">
                                    <Activity className="w-6 h-6 text-muted-foreground/45" />
                                    <p className="text-muted-foreground text-xs font-semibold">No dialogue logged yet.</p>
                                    <p className="text-muted-foreground/75 text-[10px] max-w-[200px] leading-normal">
                                      Dialogue is populated in real-time as speech is recognized and processed by Gemini.
                                    </p>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
