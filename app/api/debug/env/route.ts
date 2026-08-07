
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        NVIDIA_API_KEY: process.env.NVIDIA_API_KEY ? 'Present' : 'Missing',
        NVIDIA_API_KEY_VALUE: process.env.NVIDIA_API_KEY ? process.env.NVIDIA_API_KEY.substring(0, 10) + '...' : null,
        ALL_KEYS: Object.keys(process.env).filter(key => key.includes('API_KEY'))
    });
}
