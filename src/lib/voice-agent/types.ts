// ─── Voice Agent Type Definitions ───

export interface VoiceAgentConfig {
  id?: string;
  userEmail: string;
  agentName: string;
  personality: string;
  systemPrompt: string;
  greetingMessage: string;
  language: string;
  voiceId: string; // Twilio voice name (e.g. 'Polly.Joanna', 'Google.en-US-Neural2-F')
  callObjective: string;
  maxCallDuration: number; // seconds
  silenceTimeout: number; // seconds before re-prompt
  endCallPhrases: string[]; // phrases that trigger call end
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface VoiceCall {
  id: string;
  callSid: string;
  userEmail?: string;
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  duration: number; // seconds
  agentConfigId?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
}

export interface VoiceTranscript {
  id?: string;
  callId: string;
  role: 'caller' | 'agent';
  content: string;
  timestamp: string;
}

export interface CallSession {
  callSid: string;
  agentConfig: VoiceAgentConfig;
  history: Array<{ role: 'user' | 'model'; content: string }>;
  startedAt: Date;
  lastActivity: Date;
  turnCount: number;
}

export interface OutboundCallRequest {
  phoneNumber: string;
  prompt?: string;
  persona?: string;
  greetingMessage?: string;
  agentConfigId?: string;
}

export interface CallLogFilters {
  direction?: 'inbound' | 'outbound';
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

// Twilio voice options
export const TWILIO_VOICES = [
  // Amazon Polly Neural voices
  { id: 'Polly.Joanna-Neural', name: 'Joanna (US Female)', provider: 'Amazon Polly' },
  { id: 'Polly.Matthew-Neural', name: 'Matthew (US Male)', provider: 'Amazon Polly' },
  { id: 'Polly.Amy-Neural', name: 'Amy (UK Female)', provider: 'Amazon Polly' },
  { id: 'Polly.Brian-Neural', name: 'Brian (UK Male)', provider: 'Amazon Polly' },
  { id: 'Polly.Aria-Neural', name: 'Aria (NZ Female)', provider: 'Amazon Polly' },
  { id: 'Polly.Kajal-Neural', name: 'Kajal (Indian Female)', provider: 'Amazon Polly' },
  // Google TTS voices
  { id: 'Google.en-US-Neural2-F', name: 'Neural2 Female (US)', provider: 'Google' },
  { id: 'Google.en-US-Neural2-D', name: 'Neural2 Male (US)', provider: 'Google' },
  { id: 'Google.en-GB-Neural2-A', name: 'Neural2 Female (UK)', provider: 'Google' },
  { id: 'Google.en-GB-Neural2-B', name: 'Neural2 Male (UK)', provider: 'Google' },
  // Standard Twilio voices
  { id: 'alice', name: 'Alice (Classic)', provider: 'Twilio' },
  { id: 'man', name: 'Man (Classic)', provider: 'Twilio' },
  { id: 'woman', name: 'Woman (Classic)', provider: 'Twilio' },
] as const;

export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'en-AU', name: 'English (Australia)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'es-MX', name: 'Spanish (Mexico)' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'ko-KR', name: 'Korean' },
  { code: 'zh-CN', name: 'Chinese (Mandarin)' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'ar-SA', name: 'Arabic' },
] as const;

export const DEFAULT_AGENT_CONFIG: Omit<VoiceAgentConfig, 'userEmail'> = {
  agentName: 'Nova',
  personality: 'Professional, warm, and helpful. Speaks clearly and concisely.',
  systemPrompt: `You are Nova, an AI voice assistant. You are having a real-time phone conversation.
Rules:
- Keep responses SHORT (1-3 sentences max) — this is a phone call, not a chat
- Be conversational and natural — use contractions, casual phrasing
- Never use markdown, bullet points, or formatting — speak like a human
- If asked something you don't know, be honest
- Match the caller's energy and pace
- Ask clarifying questions when needed
- End responses with a question or next step when appropriate`,
  greetingMessage: "Hello! I'm Nova, your AI assistant. How can I help you today?",
  language: 'en-US',
  voiceId: 'Polly.Joanna-Neural',
  callObjective: 'General purpose AI phone assistant',
  maxCallDuration: 600,
  silenceTimeout: 5,
  endCallPhrases: ['goodbye', 'bye', 'end call', 'hang up', 'that is all', "that's all"],
  isActive: true,
};
