"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AuthProvider } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api } from "@/lib/api";
import { CardSkeleton, ErrorBanner } from "@/components/ui";
import type { Transaction } from "@/lib/types";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

const COLORS = ["#10b981", "#06b6d4", "#8b5cf6", "#f59e0b", "#ec4899", "#14b8a6", "#f97316", "#6366f1"];

function DashboardContent() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.getTransactions(1, 100);
            setTransactions(res.items);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Calculate summary stats
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // Group by category for pie chart
    const categoryData = Object.entries(
        transactions
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => {
                acc[t.category] = (acc[t.category] || 0) + t.amount;
                return acc;
            }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    // Group by date for line chart
    const dailyData = Object.entries(
        transactions.reduce((acc, t) => {
            const d = t.date;
            if (!acc[d]) acc[d] = { date: d, income: 0, expense: 0 };
            if (t.type === "income") acc[d].income += t.amount;
            else acc[d].expense += t.amount;
            return acc;
        }, {} as Record<string, { date: string; income: number; expense: number }>)
    )
        .map(([, v]) => v)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

    const stats = [
        { label: "Total Income", value: `$${totalIncome.toLocaleString()}`, icon: "📈", color: "from-emerald-500 to-green-500" },
        { label: "Total Expenses", value: `$${totalExpense.toLocaleString()}`, icon: "📉", color: "from-red-500 to-rose-500" },
        { label: "Balance", value: `$${balance.toLocaleString()}`, icon: "💰", color: "from-cyan-500 to-blue-500" },
        { label: "Savings Rate", value: `${savingsRate.toFixed(1)}%`, icon: "🎯", color: "from-violet-500 to-purple-500" },
    ];

    if (loading) {
        return (
            <div>
                <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                    {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>
                <ErrorBanner message={error} onRetry={fetchData} />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-slate-400 text-sm mt-1">Your financial overview at a glance</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {stats.map((s) => (
                    <div
                        key={s.label}
                        className="relative overflow-hidden bg-slate-900/50 border border-slate-800 rounded-2xl p-6 group hover:border-slate-700 transition-all duration-300"
                    >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${s.color} opacity-10 rounded-bl-[80px] group-hover:opacity-20 transition-opacity`} />
                        <span className="text-2xl">{s.icon}</span>
                        <p className="text-sm text-slate-400 mt-3">{s.label}</p>
                        <p className="text-2xl font-bold text-white mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Line Chart */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Spending Trends</h3>
                    {dailyData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickFormatter={(v) => v.slice(5)} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
                                    labelStyle={{ color: "#94a3b8" }}
                                />
                                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">No data to display</div>
                    )}
                </div>

                {/* Pie Chart */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">By Category</h3>
                    {categoryData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                                    {categoryData.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: "12px" }}
                                />
                                <Legend wrapperStyle={{ fontSize: "12px" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">No expenses yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <AuthProvider>
            <DashboardLayout>
                <DashboardContent />
            </DashboardLayout>
        </AuthProvider>
    );
}
