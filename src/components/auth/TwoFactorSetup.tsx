'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { 
    QrCode, Key, Shield, ShieldAlert, CheckCircle2, 
    Copy, Download, RefreshCw, AlertTriangle, Eye, EyeOff 
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function TwoFactorSetup() {
    const { refreshUser } = useAuth();
    const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [setupStep, setSetupStep] = useState<'idle' | 'showing_qr' | 'success'>('idle');
    
    // Setup data
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [code, setCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    
    // Disable / Regenerate inputs
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const [showRegenConfirm, setShowRegenConfirm] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [confirmCode, setConfirmCode] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/auth/2fa/status');
            const data = await res.json();
            if (res.ok) {
                setIsEnabled(data.enabled);
            }
        } catch (err) {
            console.error('Failed to fetch 2FA status:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInitiateSetup = async () => {
        setActionLoading(true);
        try {
            const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to initiate 2FA setup');
            
            setQrCode(data.qrCode);
            setSecret(data.secret);
            setSetupStep('showing_qr');
            setCode('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to start 2FA setup');
        } finally {
            setActionLoading(false);
        }
    };

    const handleVerifySetup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.location.href.includes('mounikai')) {
            toast.error("In the demo, this feature is disabled");
            return;
        }
        if (!code || code.length < 6) {
            toast.error('Please enter the 6-digit confirmation code');
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch('/api/auth/2fa/verify-setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to verify verification code');

            setRecoveryCodes(data.recoveryCodes);
            setIsEnabled(true);
            setSetupStep('success');
            await refreshUser();
            toast.success('2FA has been successfully enabled!');
        } catch (err: any) {
            toast.error(err.message || 'Verification failed');
            setCode('');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDisable2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmPassword || !confirmCode) {
            toast.error('Both password and verification code are required');
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch('/api/auth/2fa/disable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: confirmPassword, code: confirmCode })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA');

            setIsEnabled(false);
            setShowDisableConfirm(false);
            setConfirmPassword('');
            setConfirmCode('');
            await refreshUser();
            toast.success('2FA has been disabled.');
        } catch (err: any) {
            toast.error(err.message || 'Failed to disable 2FA');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRegenerateCodes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmPassword) {
            toast.error('Account password is required');
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch('/api/auth/2fa/recovery-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: confirmPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to regenerate recovery codes');

            setRecoveryCodes(data.recoveryCodes);
            setSetupStep('success');
            setShowRegenConfirm(false);
            setConfirmPassword('');
            toast.success('New recovery codes generated successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Failed to regenerate codes');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCopyCodes = () => {
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        toast.success('Recovery codes copied to clipboard');
    };

    const handleDownloadCodes = () => {
        const element = document.createElement("a");
        const file = new Blob([recoveryCodes.join('\r\n')], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = "2fa_recovery_codes.txt";
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
        toast.success('Recovery codes downloaded');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
        );
    }

    // SUCCESS STEP: Showing Recovery Codes
    if (setupStep === 'success') {
        return (
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950/40 backdrop-blur-lg">
                <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-6">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Save Your Recovery Codes</h3>
                </div>

                <p className="text-zinc-600 dark:text-zinc-400 text-sm mb-6 leading-relaxed">
                    If you lose access to your authenticator app, you can use these recovery codes to log in. 
                    Each code can only be used once. Store them in a secure place (like a password manager).
                </p>

                <div className="grid grid-cols-2 gap-3 p-4 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 font-mono text-center text-zinc-900 dark:text-white text-sm mb-6">
                    {recoveryCodes.map((code, idx) => (
                        <div key={idx} className="p-2 border border-zinc-200 dark:border-zinc-800/40 bg-zinc-50 dark:bg-zinc-950/50 rounded-lg selection:bg-indigo-500">
                            {code}
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                    <Button onClick={handleCopyCodes} variant="secondary" className="flex items-center gap-2">
                        <Copy className="w-4 h-4" /> Copy Codes
                    </Button>
                    <Button onClick={handleDownloadCodes} variant="secondary" className="flex items-center gap-2">
                        <Download className="w-4 h-4" /> Download .txt
                    </Button>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-900 pt-6">
                    <Button 
                        onClick={() => {
                            setSetupStep('idle');
                            fetchStatus();
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                    >
                        I've Saved the Codes
                    </Button>
                </div>
            </div>
        );
    }

    // SETUP STEP: Displaying QR Code and Verification Input
    if (setupStep === 'showing_qr') {
        return (
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950/40 backdrop-blur-lg">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-6">Set Up Authenticator App</h3>

                <div className="flex flex-col md:flex-row gap-8 mb-8 items-center">
                    {/* QR Code Container */}
                    <div className="p-3 bg-white rounded-xl shadow-xl w-48 h-48 flex items-center justify-center shrink-0 border border-zinc-200 dark:border-zinc-800">
                        {qrCode ? (
                            <img src={qrCode} alt="Scan to set up 2FA" className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-lg" />
                        )}
                    </div>

                    {/* Step-by-Step Instructions */}
                    <div className="flex-1 space-y-4">
                        <div className="flex gap-3 items-start">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">1</span>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">Scan this QR code using your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.).</p>
                        </div>
                        <div className="flex gap-3 items-start">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">2</span>
                            <div className="text-sm text-zinc-700 dark:text-zinc-300">
                                If you can't scan the code, enter this secret key manually in your app:
                                <div className="mt-2 p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-300 dark:border-zinc-800 font-mono text-indigo-600 dark:text-indigo-300 select-all break-all text-xs">
                                    {secret}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Verification Form */}
                <form onSubmit={handleVerifySetup} className="border-t border-zinc-200 dark:border-zinc-900 pt-6">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Verify the Setup</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6">Enter the 6-digit verification code generated by your authenticator app to complete the setup.</p>
                    
                    <div className="mb-6 flex justify-center md:justify-start">
                        <InputOTP
                            maxLength={6}
                            value={code}
                            onChange={setCode}
                            disabled={actionLoading}
                        >
                            <InputOTPGroup className="gap-2">
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <InputOTPSlot key={index} index={index} className="w-10 h-10 border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-zinc-900 dark:text-white rounded-lg" />
                                ))}
                            </InputOTPGroup>
                        </InputOTP>
                    </div>

                    <div className="flex gap-3">
                        <Button 
                            type="submit" 
                            disabled={actionLoading || code.length < 6}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
                        >
                            {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm & Enable'}
                        </Button>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => setSetupStep('idle')} 
                            disabled={actionLoading}
                            className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                        >
                            Cancel
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    // ACTIVE / ENABLED PANEL
    if (isEnabled) {
        return (
            <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950/40 backdrop-blur-lg">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-zinc-900 dark:text-white font-semibold">Two-Factor Authentication is Enabled</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-1">Your account is secured with 2FA TOTP.</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button 
                                onClick={() => {
                                    setShowRegenConfirm(true);
                                    setShowDisableConfirm(false);
                                }}
                                variant="secondary"
                            >
                                Regenerate Recovery Codes
                            </Button>
                            <Button 
                                onClick={() => {
                                    setShowDisableConfirm(true);
                                    setShowRegenConfirm(false);
                                }}
                                variant="destructive"
                                className="bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-300"
                            >
                                Disable 2FA
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Confirm Regenerate Recovery Codes */}
                {showRegenConfirm && (
                    <form onSubmit={handleRegenerateCodes} className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950/40 backdrop-blur-lg animate-in fade-in slide-in-from-top-2 duration-250">
                        <div className="flex gap-2 items-center text-amber-600 dark:text-amber-400 mb-4">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <h4 className="font-semibold text-zinc-900 dark:text-white">Regenerate Recovery Codes</h4>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            Regenerating recovery codes will invalidate your current ones. Enter your password to continue.
                        </p>
                        <div className="max-w-md space-y-4 mb-6">
                            <div>
                                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-medium mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                        placeholder="Confirm account password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button type="submit" disabled={actionLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Regenerate Codes'}
                            </Button>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => {
                                    setShowRegenConfirm(false);
                                    setConfirmPassword('');
                                }}
                                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}

                {/* Confirm Disable 2FA */}
                {showDisableConfirm && (
                    <form onSubmit={handleDisable2FA} className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950/40 backdrop-blur-lg animate-in fade-in slide-in-from-top-2 duration-250">
                        <div className="flex gap-2 items-center text-red-600 dark:text-red-400 mb-4">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                            <h4 className="font-semibold text-zinc-900 dark:text-white">Confirm Disabling 2FA</h4>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
                            Disabling two-factor authentication makes your account less secure. You must verify your identity to perform this action.
                        </p>
                        <div className="max-w-md space-y-4 mb-6">
                            <div>
                                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-medium mb-2">Password</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                        placeholder="Confirm account password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-zinc-600 dark:text-zinc-400 text-xs font-medium mb-2">Verification Code</label>
                                <input
                                    type="text"
                                    required
                                    value={confirmCode}
                                    onChange={(e) => setConfirmCode(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-zinc-900 dark:text-white font-mono placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                                    placeholder="6-digit code or recovery code"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button type="submit" disabled={actionLoading} variant="destructive">
                                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Disable 2FA'}
                            </Button>
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => {
                                    setShowDisableConfirm(false);
                                    setConfirmPassword('');
                                    setConfirmCode('');
                                }}
                                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        );
    }

    // IDLE / DISABLED STATE
    return (
        <div className="p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-zinc-950/40 backdrop-blur-lg">
            <div className="flex items-center gap-4 flex-wrap justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-zinc-200 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700/50 text-zinc-600 dark:text-zinc-400 rounded-full">
                        <QrCode className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-zinc-900 dark:text-white font-semibold">Two-Factor Authentication is Disabled</h3>
                        <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">Add an extra layer of security to your account by requiring a security code when logging in.</p>
                    </div>
                </div>
                <Button 
                    onClick={handleInitiateSetup} 
                    disabled={actionLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Set Up 2FA'}
                </Button>
            </div>
        </div>
    );
}
