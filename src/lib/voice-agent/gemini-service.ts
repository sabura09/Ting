// ─── Gemini Voice Conversation Service ───
// Generates AI responses optimized for voice/phone conversations

import type { CallSession } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export async function generateVoiceResponse(
  session: CallSession,
  userInput: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API Key not configured');
  }

  // Build conversation contents
  const contents: GeminiContent[] = session.history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  // Add current user input
  contents.push({
    role: 'user',
    parts: [{ text: userInput }],
  });

  // Build system instruction
  const systemPrompt = buildVoiceSystemPrompt(session);

  const requestBody = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 200, // Keep responses short for voice
      candidateCount: 1,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[GeminiVoice] API error:', err);
      throw new Error(err.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!text) {
      return "I'm sorry, could you say that again?";
    }

    // Clean for voice — strip any markdown/formatting
    return cleanForVoice(text);
  } catch (error: any) {
    console.error('[GeminiVoice] Error:', error.message);

    if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota')) {
      return "I'm experiencing high demand right now. Could you try again in a moment?";
    }

    return "I apologize, I'm having a technical issue. Could you repeat that?";
  }
}

function buildVoiceSystemPrompt(session: CallSession): string {
  const config = session.agentConfig;
  const elapsed = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
  const turnsLeft = Math.max(0, 50 - session.turnCount);

  return `${config.systemPrompt}

Agent name: ${config.agentName}
Personality: ${config.personality}
Call objective: ${config.callObjective}
Call duration so far: ${elapsed} seconds
Conversation turns so far: ${session.turnCount}

CRITICAL VOICE RULES:
- You are on a PHONE CALL. Responses must be SPOKEN ALOUD.
- Keep every response to 1-3 sentences. Shorter is better.
- NEVER use markdown, asterisks, bullet points, numbered lists, or any text formatting.
- NEVER say "here are some options" and list them — instead, ask one question at a time.
- Use natural speech patterns: "Well,", "So,", "Actually,", "You know,"
- Numbers should be spoken: "twenty three" not "23"
- URLs should be spelled out or avoided entirely
- If the conversation is nearing the end (${turnsLeft} turns remaining), start wrapping up.`;
}

function cleanForVoice(text: string): string {
  return text
    // Remove markdown formatting
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // Remove bullet points and numbered lists
    .replace(/^[\s]*[-•]\s/gm, '')
    .replace(/^[\s]*\d+\.\s/gm, '')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove excessive whitespace
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    // Ensure it ends with proper punctuation
    .trim();
}
