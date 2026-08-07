'use client';

import React, { useState, useEffect } from 'react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from '@/components/ui/button';
import { ShieldCheck, RefreshCw, KeyRound, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TwoFactorVerifyProps {
    tempToken: string;
    onSuccess: (user: any) => void;
    onCancel: () => void;
}

export default function TwoFactorVerify({ tempToken, onSuccess, onCancel }: TwoFactorVerifyProps) {
    const { verify2FA } = useAuth();
    const [code, setCode] = useState('');
    const [isRecovery, setIsRecovery] = useState(false);
    const [recoveryCode, setRecoveryCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds

    // Countdown timer
    useEffect(() => {
        if (timeLeft <= 0) {
            setError('Verification session expired. Please log in again.');
            return;
        }

        const timer = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const verificationCode = isRecovery ? recoveryCode.trim() : code;
        if (!verificationCode) {
            setError(isRecovery ? 'Please enter a recovery code' : 'Please enter your verification code');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await verify2FA(tempToken, verificationCode);

            if (!result.success) {
                throw new Error(result.error || 'Verification failed');
            }

            // Success!
            onSuccess(result.user);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
            if (!isRecovery) setCode('');
        } finally {
            setIsLoading(false);
        }
    };

    // Auto submit OTP code when 6 digits are entered
    useEffect(() => {
        if (code.length === 6 && !isRecovery) {
            handleSubmit();
        }
    }, [code, isRecovery]);

    return (
        <div className="w-full max-w-md mx-auto p-8 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            {/* Background glowing effects */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center relative z-10">
                <div className="p-4 rounded-full bg-indigo-100 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 mb-6 animate-pulse">
                    {isRecovery ? <KeyRound className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
                    {isRecovery ? 'Two-Factor Recovery' : 'Two-Factor Authentication'}
                </h2>
                
                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-8 max-w-xs leading-relaxed">
                    {isRecovery
                        ? 'Enter one of your 8-character recovery codes (format: XXXX-XXXX).'
                        : 'Open your authenticator app and enter the 6-digit security code.'}
                </p>

                {error && (
                    <div className="w-full flex items-start gap-3 p-3 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 text-red-600 dark:text-red-400 text-xs text-left mb-6">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="w-full flex flex-col items-center">
                    {!isRecovery ? (
                        <div className="mb-6">
                            <InputOTP
                                maxLength={6}
                                value={code}
                                onChange={setCode}
                                disabled={isLoading || timeLeft <= 0}
                            >
                                <InputOTPGroup className="gap-2">
                                    {[0, 1, 2, 3, 4, 5].map((index) => (
                                        <InputOTPSlot key={index} index={index} className="w-12 h-12 text-lg font-bold border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                    ) : (
                        <div className="w-full mb-6">
                            <input
                                type="text"
                                placeholder="e.g. abcd-efgh"
                                value={recoveryCode}
                                onChange={(e) => setRecoveryCode(e.target.value)}
                                disabled={isLoading || timeLeft <= 0}
                                className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white text-center font-mono placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                            />
                        </div>
                    )}

                    {isRecovery && (
                        <Button
                            type="submit"
                            disabled={isLoading || timeLeft <= 0}
                            className="w-full py-6 rounded-lg font-semibold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg shadow-indigo-500/10 mb-4 transition"
                        >
                            {isLoading ? (
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                'Verify Recovery Code'
                            )}
                        </Button>
                    )}

                    <div className="flex flex-col gap-3 w-full text-xs mt-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsRecovery(!isRecovery);
                                setError(null);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition"
                        >
                            {isRecovery ? 'Use authenticator app instead' : 'Use a recovery code instead'}
                        </button>

                        <div className="text-zinc-500">
                            Code expires in <span className="font-mono text-zinc-700 dark:text-zinc-400 font-bold">{formatTime(timeLeft)}</span>
                        </div>

                        <div className="border-t border-zinc-200 dark:border-zinc-900 pt-4 mt-2">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition font-medium"
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
