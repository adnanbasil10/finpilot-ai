"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button, Input } from "@/components/ui";

function LoginForm() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Left Panel – Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-emerald-950/30 to-slate-900 items-center justify-center p-12 relative border-r border-slate-800/50">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-2xl font-bold text-slate-900">
                            F
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">FinPilot AI</h1>
                            <p className="text-emerald-400 text-sm">AI-Powered Finance</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-lg leading-relaxed mb-8">
                        Take control of your finances with AI-powered insights. Track spending,
                        manage budgets, and get personalized recommendations.
                    </p>
                    <div className="space-y-4">
                        {["Smart Analytics Dashboard", "AI Spending Insights", "Budget Tracking", "Secure & Private"].map((f) => (
                            <div key={f} className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-slate-300 text-sm">{f}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Professional Watermark */}
                <div className="absolute bottom-8 left-12 flex items-center gap-3">
                    <div className="h-px w-6 bg-emerald-500/50" />
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                        Crafted by <span className="text-emerald-400/90 hover:text-emerald-400 transition-colors">Adnan Basil</span>
                    </p>
                </div>
            </div>

            {/* Right Panel – Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
                    <p className="text-slate-400 mb-8">Sign in to your account to continue</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <Button type="submit" loading={loading} className="w-full justify-center">
                            Sign In
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Don&apos;t have an account?{" "}
                        <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 font-medium">
                            Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <AuthProvider>
            <LoginForm />
        </AuthProvider>
    );
}
