export type ModelProvider = 'google' | 'openai' | 'anthropic' | 'mistral' | 'groq' | 'nvidia' | 'other';

export interface AIModel {
    id: string;
    name: string;
    provider: ModelProvider;
    description: string;
    contextWindow?: number;
    maxOutput?: number;
    envKey?: string;
}

export const AVAILABLE_MODELS: AIModel[] = [
    {
        id: 'moonshotai/kimi-k2.6',
        name: 'Kimi K2.6',
        provider: 'nvidia',
        description: 'Advanced reasoning model by Moonshot AI via NVIDIA',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'mistralai/mistral-medium-3.5-128b',
        name: 'Mistral Medium 3.5',
        provider: 'nvidia',
        description: 'Powerful medium-sized model from Mistral AI via NVIDIA',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
        name: 'Nemotron 3 Nano Omni Reasoning',
        provider: 'nvidia',
        description: 'NVIDIA reasoning model for complex tasks',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'deepseek-ai/deepseek-v4-flash',
        name: 'DeepSeek v4 Flash',
        provider: 'nvidia',
        description: 'Fast and efficient DeepSeek v4 model',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'deepseek-ai/deepseek-v4-pro',
        name: 'DeepSeek v4 Pro',
        provider: 'nvidia',
        description: 'Highly capable DeepSeek v4 model',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'z-ai/glm-5.1',
        name: 'GLM 5.1',
        provider: 'nvidia',
        description: 'Advanced Chinese/English bilingual model',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'minimaxai/minimax-m2.7',
        name: 'MiniMax M2.7',
        provider: 'nvidia',
        description: 'MiniMax AI conversational model',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'google/gemma-4-31b-it',
        name: 'Gemma 4 31B IT',
        provider: 'nvidia',
        description: 'Google\'s open model optimized for instruction',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'mistralai/mistral-small-4-119b-2603',
        name: 'Mistral Small 4',
        provider: 'nvidia',
        description: 'Efficient and high-performing Mistral Small 4',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'openai/gpt-oss-120b',
        name: 'GPT-OSS 120B',
        provider: 'nvidia',
        description: 'Open-weights large model by OpenAI via NVIDIA',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'meta/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        provider: 'nvidia',
        description: 'Meta\'s latest instruction-tuned 8B model',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'meta/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision Instruct',
        provider: 'nvidia',
        description: 'Meta\'s Llama 3.2 vision-capable 11B model',
        contextWindow: 128000,
        envKey: 'NVIDIA_API_KEY'
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        provider: 'google',
        description: 'Google\'s latest fast and efficient model',
        contextWindow: 1000000,
        envKey: 'NEXT_PUBLIC_GEMINI_API_KEY'
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        description: 'Google\'s most capable multimodal model',
        contextWindow: 1000000,
        envKey: 'NEXT_PUBLIC_GEMINI_API_KEY'
    },
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        description: 'Fast and efficient multimodal model',
        contextWindow: 1000000,
        envKey: 'NEXT_PUBLIC_GEMINI_API_KEY'
    },
    {
        id: 'gpt-5.4-mini',
        name: 'GPT-5.4 Mini',
        provider: 'openai',
        description: 'OpenAI\'s next-generation fast, cost-effective model',
        contextWindow: 128000,
        envKey: 'OPENAI_API_KEY'
    },
    {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        description: 'Highly intelligent model from Anthropic',
        contextWindow: 200000,
        envKey: 'ANTHROPIC_API_KEY'
    },
    {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        description: 'Balanced intelligence and speed',
        contextWindow: 200000,
        envKey: 'ANTHROPIC_API_KEY'
    },
    {
        id: 'mixtral-8x7b',
        name: 'Mixtral 8x7B',
        provider: 'mistral',
        description: 'High performance open model',
        contextWindow: 32000,
        envKey: 'MISTRAL_API_KEY'
    },
    {
        id: 'llama-3-70b',
        name: 'Llama 3 70B',
        provider: 'groq',
        description: 'Fastest inference with Groq LPU',
        contextWindow: 8192,
        envKey: 'GROQ_API_KEY'
    }
];

export const DEFAULT_MODEL_ID = 'gemini-2.5-flash';

export function getModelById(id: string): AIModel | undefined {
    return AVAILABLE_MODELS.find(model => model.id === id);
}
