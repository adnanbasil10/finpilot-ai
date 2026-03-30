"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button, Input } from "@/components/ui";

function SignupForm() {
    const { signup } = useAuth();
    const router = useRouter();
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }
        setLoading(true);
        try {
            await signup(email, password, fullName);
            router.push("/dashboard");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex">
            {/* Left Panel – Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-cyan-950/30 to-slate-900 items-center justify-center p-12 relative border-r border-slate-800/50">
                <div className="max-w-md">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-2xl font-bold text-slate-900">
                            F
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">FinPilot AI</h1>
                            <p className="text-cyan-400 text-sm">Start Your Journey</p>
                        </div>
                    </div>
                    <p className="text-slate-400 text-lg leading-relaxed mb-8">
                        Join thousands of users who are taking control of their financial future
                        with AI-powered insights and smart budgeting tools.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { num: "10K+", label: "Active Users" },
                            { num: "$2M+", label: "Tracked" },
                            { num: "98%", label: "Satisfaction" },
                            { num: "24/7", label: "AI Support" },
                        ].map((s) => (
                            <div key={s.label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                <p className="text-2xl font-bold text-white">{s.num}</p>
                                <p className="text-xs text-slate-400">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Professional Watermark */}
                <div className="absolute bottom-8 left-12 flex items-center gap-3">
                    <div className="h-px w-6 bg-cyan-500/50" />
                    <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                        Crafted by <span className="text-cyan-400/90 hover:text-cyan-400 transition-colors">Adnan Basil</span>
                    </p>
                </div>
            </div>

            {/* Right Panel – Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <h2 className="text-2xl font-bold text-white mb-2">Create your account</h2>
                    <p className="text-slate-400 mb-8">Get started with FinPilot AI today</p>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-6">
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <Input
                            label="Full Name"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                        />
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
                            placeholder="Min. 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                        <Button type="submit" loading={loading} className="w-full justify-center">
                            Create Account
                        </Button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                        Already have an account?{" "}
                        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SignupPage() {
    return (
        <AuthProvider>
            <SignupForm />
        </AuthProvider>
    );
}
