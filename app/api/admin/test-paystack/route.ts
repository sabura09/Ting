import { NextResponse } from 'next/server';
import { PaystackGateway } from '@/lib/gateways/paystack';

/**
 * Admin endpoint to test Paystack API key validity.
 * Follows the same pattern as test-razorpay and test-flutterwave.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { paystackSecretKey } = body;

        if (!paystackSecretKey) {
            return NextResponse.json(
                { error: 'Paystack Secret Key is required.' },
                { status: 400 }
            );
        }

        // Create a temporary gateway instance with the provided credentials
        const gateway = new PaystackGateway({
            paystackSecretKey,
            defaultTokens: 0,
            aiLimits: {},
            paymentEnabled: true,
        });

        await gateway.testConnection();

        return NextResponse.json({ success: true, message: 'Paystack connection verified successfully.' });

    } catch (error: any) {
        console.error('Paystack test connection error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to connect to Paystack.' },
            { status: 400 }
        );
    }
}
