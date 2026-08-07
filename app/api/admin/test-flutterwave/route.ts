import { NextResponse } from 'next/server';
import { FlutterwaveGateway } from '@/lib/gateways/flutterwave';
import { SystemSettings } from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { flutterwaveSecretKey } = await req.json();

        if (!flutterwaveSecretKey) {
            return NextResponse.json({ error: 'Incomplete Flutterwave configuration' }, { status: 400 });
        }

        // Mock the settings object for the gateway
        const mockSettings: SystemSettings = {
            defaultTokens: 0,
            aiLimits: {},
            paymentEnabled: true,
            flutterwaveSecretKey,
        };

        const gateway = new FlutterwaveGateway(mockSettings);
        await gateway.testConnection();

        return NextResponse.json({ success: true, message: 'Flutterwave connection successful!' });

    } catch (error: any) {
        console.error('Test Flutterwave Error:', error);
        return NextResponse.json({ 
            error: error.message || 'Failed to connect to Flutterwave',
        }, { status: 500 });
    }
}
