'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
    CheckCircle, AlertCircle, RefreshCw, Mail, 
    ArrowRight, ArrowLeft, Loader2 
} from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [emailToResend, setEmailToResend] = useState('');
    const [isResending, setIsResending] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link. Missing token.');
            return;
        }

        const verifyToken = async () => {
            try {
                const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.error || 'Failed to verify email.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Connection error. Please try again.');
            }
        };

        verifyToken();
    }, [token]);

    const handleResend = async () => {
        if (!emailToResend) return;
        setIsResending(true);
        setResendSuccess(false);

        try {
            const res = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailToResend })
            });
            const data = await res.json();

            if (res.ok) {
                setResendSuccess(true);
                setEmailToResend('');
            } else {
                setMessage(data.error || 'Failed to resend verification email.');
            }
        } catch (error) {
            setMessage('Network error resending code.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient gradients */}
            <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />

            <div className="w-full max-w-md p-8 rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl relative z-10 text-center">
                
                {status === 'loading' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        </div>
                        <h1 className="text-xl font-semibold text-white">Verifying your email</h1>
                        <p className="text-zinc-400 text-sm">Please wait while we confirm your email address...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full animate-bounce">
                                <CheckCircle className="w-12 h-12" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Verification Complete</h1>
                        <p className="text-zinc-400 text-sm leading-relaxed">{message}</p>
                        
                        <div className="pt-4">
                            <Link href="/login" passHref>
                                <Button className="w-full py-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/15 transition flex items-center justify-center gap-2">
                                    Continue to Login <ArrowRight className="w-4 h-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-6">
                        <div className="flex justify-center">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full">
                                <AlertCircle className="w-12 h-12" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Verification Failed</h1>
                        <p className="text-red-400/90 text-sm leading-relaxed">{message}</p>
                        
                        <div className="border-t border-zinc-800/80 pt-6 mt-6 text-left space-y-4">
                            <h2 className="text-sm font-semibold text-white">Resend Verification Email</h2>
                            <p className="text-xs text-zinc-400">If your link has expired, enter your email below to request a new verification link.</p>
                            
                            {resendSuccess ? (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
                                    <Mail className="w-4 h-4 shrink-0" />
                                    <span>New verification link sent successfully!</span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="email"
                                        placeholder="Enter your email address"
                                        value={emailToResend}
                                        onChange={(e) => setEmailToResend(e.target.value)}
                                        className="w-full px-4 py-3 text-sm rounded-lg border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition"
                                    />
                                    <Button
                                        onClick={handleResend}
                                        disabled={isResending || !emailToResend}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white transition flex items-center justify-center gap-2"
                                    >
                                        {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send New Link'}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-zinc-800/50">
                            <Link href="/login" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm">
                                <ArrowLeft className="w-4 h-4" /> Back to Login
                            </Link>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
