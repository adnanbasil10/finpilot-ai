"use client";

import React, { useState } from "react";
import { AuthProvider } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { Button, Select, ErrorBanner } from "@/components/ui";
import type { InsightsResponse } from "@/lib/types";

function InsightsContent() {
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [insights, setInsights] = useState<InsightsResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const analyze = async () => {
        setLoading(true);
        setError("");
        setInsights(null);
        try {
            const res = await api.analyzeSpending(month, year);
            setInsights(res);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Analysis failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">AI Insights</h1>
                    <p className="text-slate-400 text-sm mt-1">Get AI-powered analysis of your spending patterns</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <Select
                        label="Month"
                        options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
                        value={String(month)}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                    />
                    <Select
                        label="Year"
                        options={Array.from({ length: 5 }, (_, i) => ({ value: String(now.getFullYear() - 1 + i), label: String(now.getFullYear() - 1 + i) }))}
                        value={String(year)}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                    />
                    <Button onClick={analyze} loading={loading}>
                        🤖 Analyze Spending
                    </Button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={analyze} />}

            {/* Loading State */}
            {loading && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 flex items-center justify-center">
                        <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Analyzing your finances...</h3>
                    <p className="text-slate-400 text-sm">Our AI is reviewing your spending patterns for {monthNames[month - 1]} {year}</p>
                </div>
            )}

            {/* Results */}
            {insights && !loading && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-violet-500/10 border border-emerald-500/20 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center text-xl flex-shrink-0">
                                🤖
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-2">Financial Summary</h3>
                                <p className="text-slate-300 leading-relaxed">{insights.summary}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Highlights */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-amber-400">✨</span> Key Highlights
                            </h3>
                            <ul className="space-y-3">
                                {insights.highlights.map((h, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <p className="text-slate-300 text-sm leading-relaxed">{h}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Recommendations */}
                        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="text-emerald-400">💡</span> Recommendations
                            </h3>
                            <ul className="space-y-3">
                                {insights.recommendations.map((r, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                            {i + 1}
                                        </div>
                                        <p className="text-slate-300 text-sm leading-relaxed">{r}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Default State */}
            {!insights && !loading && !error && (
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                    <span className="text-5xl mb-4 block">🧠</span>
                    <h3 className="text-lg font-semibold text-white mb-2">Ready to analyze</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto">
                        Select a month and year, then click &ldquo;Analyze Spending&rdquo; to get AI-powered insights about your financial patterns.
                    </p>
                </div>
            )}
        </div>
    );
}

export default function InsightsPage() {
    return (
        <AuthProvider>
            <DashboardLayout>
                <InsightsContent />
            </DashboardLayout>
        </AuthProvider>
    );
}
