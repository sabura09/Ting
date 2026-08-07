import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface ToolCall {
    name: string;
    args: any;
}

export interface StreamResponse {
    text: string;
    toolCalls: ToolCall[];
    error?: string;
}

export function useGeminiStream() {
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamedText, setStreamedText] = useState('');
    const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
    const { selectedModel, isManualModel, refreshUser, apiKeys } = useAuth();

    const generateStream = useCallback(async (
        systemPrompt: string,
        prompt: string,
        image?: string,
        tools?: any[],
        toolId?: string,
        history?: any[]
    ): Promise<StreamResponse> => {
        setIsStreaming(true);
        setStreamedText('');
        setToolCalls([]);

        let currentText = '';
        const currentToolCalls: ToolCall[] = [];

        try {
            const body = {
                prompt,
                systemPrompt,
                model: selectedModel || 'gemini',
                isManual: isManualModel,
                tools,
                image,
                tool: toolId,
                history
            };

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            Object.entries(apiKeys || {}).forEach(([provider, key]) => {
                if (key) headers[`x-provider-key-${provider}`] = key;
            });

            const response = await fetch('/api/ai/stream', {
                method: 'POST',
                headers,
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to generate response');
            }

            if (!response.body) throw new Error('ReadableStream not yet supported in this browser.');

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6);
                        if (dataStr === '[DONE]') break;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.text) {
                                currentText += data.text;
                                setStreamedText(prev => prev + data.text);
                            }

                            if (data.toolCalls) {
                                // OpenAI style
                                currentToolCalls.push(...data.toolCalls);
                                setToolCalls(prev => [...prev, ...data.toolCalls]);
                            }

                            if (data.functionCall) {
                                // Gemini style (mapped from route.ts)
                                // route.ts sends { functionCall: ... }
                                // We standardize to toolCalls
                                const toolCall = {
                                    name: data.functionCall.name,
                                    args: data.functionCall.args
                                };
                                currentToolCalls.push(toolCall);
                                setToolCalls(prev => [...prev, toolCall]);
                            }

                        } catch (e) {
                            console.warn('Failed to parse stream chunk', e);
                        }
                    }
                }
            }

        } catch (error: any) {
            console.error('Stream error:', error);
            throw error;
        } finally {
            setIsStreaming(false);
            if (refreshUser) {
                refreshUser();
            }
        }

        return {
            text: currentText,
            toolCalls: currentToolCalls
        };
    }, [selectedModel]);

    return {
        generateStream,
        isStreaming,
        streamedText,
        toolCalls
    };
}
