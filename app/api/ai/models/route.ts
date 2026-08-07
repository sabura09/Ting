
import { NextResponse } from 'next/server';
import { AVAILABLE_MODELS } from '@/lib/models';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const headers = req.headers;
        const models = AVAILABLE_MODELS.map(model => {
            let keyValue = null;
            if (model.envKey) {
                switch (model.envKey) {
                    case 'NEXT_PUBLIC_GEMINI_API_KEY':
                        keyValue = headers.get('x-provider-key-gemini') || headers.get('x-provider-key-google') || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
                        break;
                    case 'OPENAI_API_KEY':
                        keyValue = headers.get('x-provider-key-openai') || process.env.OPENAI_API_KEY;
                        break;
                    case 'ANTHROPIC_API_KEY':
                        keyValue = headers.get('x-provider-key-anthropic') || process.env.ANTHROPIC_API_KEY;
                        break;
                    case 'MISTRAL_API_KEY':
                        keyValue = headers.get('x-provider-key-mistral') || process.env.MISTRAL_API_KEY;
                        break;
                    case 'GROQ_API_KEY':
                        keyValue = headers.get('x-provider-key-groq') || process.env.GROQ_API_KEY;
                        break;
                    case 'NVIDIA_API_KEY':
                        keyValue = headers.get('x-provider-key-nvidia') || process.env.NVIDIA_API_KEY;
                        break;
                    default:
                        keyValue = process.env[model.envKey];
                }
            }
            const isEnvConfigured = !!keyValue && !keyValue.startsWith('*****');
            return {
                ...model,
                isEnvConfigured
            };
        });

        return NextResponse.json({ models });
    } catch (error) {
        console.error('Failed to fetch models:', error);
        return NextResponse.json(
            { error: 'Failed to fetch models' },
            { status: 500 }
        );
    }
}
