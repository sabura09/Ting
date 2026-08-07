import { NextResponse } from 'next/server';
import { RazorpayGateway } from '@/lib/gateways/razorpay';

/**
 * Admin endpoint to test Razorpay API key validity.
 * Follows the same pattern as test-paypal and test-flutterwave.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { razorpayKeyId, razorpayKeySecret } = body;

        if (!razorpayKeyId || !razorpayKeySecret) {
            return NextResponse.json(
                { error: 'Razorpay Key ID and Key Secret are required.' },
                { status: 400 }
            );
        }

        // Create a temporary gateway instance with the provided credentials
        const gateway = new RazorpayGateway({
            razorpayKeyId,
            razorpayKeySecret,
            defaultTokens: 0,
            aiLimits: {},
            paymentEnabled: true,
        });

        await gateway.testConnection();

        return NextResponse.json({ success: true, message: 'Razorpay connection verified successfully.' });

    } catch (error: any) {
        console.error('Razorpay test connection error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to connect to Razorpay.' },
            { status: 400 }
        );
    }
}
