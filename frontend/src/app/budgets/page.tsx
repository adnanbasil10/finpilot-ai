"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AuthProvider } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, ApiError } from "@/lib/api";
import { Button, Input, Select, Modal, EmptyState, ErrorBanner, CardSkeleton } from "@/components/ui";
import type { Budget, BudgetCreate } from "@/lib/types";

const CATEGORIES = [
    "Food & Dining", "Transportation", "Housing", "Utilities",
    "Entertainment", "Shopping", "Healthcare", "Education", "Travel", "Other",
];

function BudgetsContent() {
    const now = new Date();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState<BudgetCreate>({
        category: "Food & Dining", limit_amount: 500, month: now.getMonth() + 1, year: now.getFullYear(),
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchBudgets = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.getBudgets(month, year);
            setBudgets(res);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await api.createBudget({ ...form, month, year });
            setShowModal(false);
            fetchBudgets();
        } catch (err: unknown) {
            setError(err instanceof ApiError ? err.message : "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Budgets</h1>
                    <p className="text-slate-400 text-sm mt-1">{monthNames[month - 1]} {year} – Track your spending limits</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        options={monthNames.map((m, i) => ({ value: String(i + 1), label: m }))}
                        value={String(month)}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                    />
                    <Select
                        options={Array.from({ length: 5 }, (_, i) => ({ value: String(now.getFullYear() - 1 + i), label: String(now.getFullYear() - 1 + i) }))}
                        value={String(year)}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                    />
                    <Button onClick={() => { setForm({ ...form, month, year }); setShowModal(true); }}>
                        + Set Budget
                    </Button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={fetchBudgets} />}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            ) : budgets.length === 0 ? (
                <EmptyState
                    icon="🎯"
                    title="No budgets set"
                    description="Create monthly budgets for your spending categories to stay on track."
                    action={<Button onClick={() => setShowModal(true)}>+ Set Budget</Button>}
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {budgets.map((b) => {
                        const pct = Math.min((b.spent / b.limit_amount) * 100, 100);
                        const overBudget = b.spent > b.limit_amount;
                        const color = overBudget ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-emerald-500";

                        return (
                            <div key={b.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-white">{b.category}</h3>
                                    {overBudget && (
                                        <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500/10 text-red-400">
                                            Over Budget!
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-end justify-between mb-3">
                                    <div>
                                        <p className="text-sm text-slate-400">Spent</p>
                                        <p className={`text-xl font-bold ${overBudget ? "text-red-400" : "text-white"}`}>
                                            ${b.spent.toLocaleString()}
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        of ${b.limit_amount.toLocaleString()}
                                    </p>
                                </div>
                                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                                </div>
                                <p className="text-xs text-slate-500 mt-2 text-right">{pct.toFixed(0)}% used</p>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal open={showModal} onClose={() => setShowModal(false)} title="Set Budget Limit">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                    <Input label="Monthly Limit ($)" type="number" step="0.01" min="1" value={form.limit_amount || ""} onChange={(e) => setForm({ ...form, limit_amount: parseFloat(e.target.value) || 0 })} required />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button type="submit" loading={submitting}>Set Budget</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default function BudgetsPage() {
    return (
        <AuthProvider>
            <DashboardLayout>
                <BudgetsContent />
            </DashboardLayout>
        </AuthProvider>
    );
}
