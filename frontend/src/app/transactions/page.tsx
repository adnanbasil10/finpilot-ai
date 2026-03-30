"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AuthProvider } from "@/lib/auth";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { api, ApiError } from "@/lib/api";
import { Button, Input, Select, Modal, EmptyState, ErrorBanner, TableSkeleton } from "@/components/ui";
import type { Transaction, TransactionCreate } from "@/lib/types";

const CATEGORIES = [
    "Food & Dining", "Transportation", "Housing", "Utilities",
    "Entertainment", "Shopping", "Healthcare", "Education",
    "Travel", "Salary", "Freelance", "Investments", "Other",
];

function TransactionsContent() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);
    const [filterType, setFilterType] = useState("");
    const [form, setForm] = useState<TransactionCreate>({
        amount: 0, type: "expense", category: "Food & Dining", description: "", date: new Date().toISOString().slice(0, 10),
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchTransactions = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.getTransactions(page, 10, filterType || undefined);
            setTransactions(res.items);
            setTotalPages(res.pages);
            setTotal(res.total);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to load");
        } finally {
            setLoading(false);
        }
    }, [page, filterType]);

    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingTxn) {
                await api.updateTransaction(editingTxn.id, form);
            } else {
                await api.createTransaction(form);
            }
            setShowModal(false);
            setEditingTxn(null);
            setForm({ amount: 0, type: "expense", category: "Food & Dining", description: "", date: new Date().toISOString().slice(0, 10) });
            fetchTransactions();
        } catch (err: unknown) {
            setError(err instanceof ApiError ? err.message : "Operation failed");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (txn: Transaction) => {
        setEditingTxn(txn);
        setForm({ amount: txn.amount, type: txn.type, category: txn.category, description: txn.description, date: txn.date });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this transaction?")) return;
        try {
            await api.deleteTransaction(id);
            fetchTransactions();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Transactions</h1>
                    <p className="text-slate-400 text-sm mt-1">{total} total transactions</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select
                        options={[
                            { value: "", label: "All Types" },
                            { value: "income", label: "Income" },
                            { value: "expense", label: "Expense" },
                        ]}
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                    />
                    <Button onClick={() => { setEditingTxn(null); setForm({ amount: 0, type: "expense", category: "Food & Dining", description: "", date: new Date().toISOString().slice(0, 10) }); setShowModal(true); }}>
                        + Add Transaction
                    </Button>
                </div>
            </div>

            {error && <ErrorBanner message={error} onRetry={fetchTransactions} />}

            {loading ? (
                <TableSkeleton rows={6} />
            ) : transactions.length === 0 ? (
                <EmptyState
                    icon="💳"
                    title="No transactions yet"
                    description="Start tracking your income and expenses by adding your first transaction."
                    action={<Button onClick={() => setShowModal(true)}>+ Add Transaction</Button>}
                />
            ) : (
                <>
                    {/* Transactions Table */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Date</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Description</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Category</th>
                                    <th className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Type</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Amount</th>
                                    <th className="text-right text-xs font-medium text-slate-400 uppercase tracking-wider px-6 py-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {transactions.map((txn) => (
                                    <tr key={txn.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-300">{txn.date}</td>
                                        <td className="px-6 py-4 text-sm text-white font-medium">{txn.description || "—"}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 text-slate-300">
                                                {txn.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${txn.type === "income"
                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                    : "bg-red-500/10 text-red-400"
                                                }`}>
                                                {txn.type}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right font-semibold text-sm ${txn.type === "income" ? "text-emerald-400" : "text-red-400"
                                            }`}>
                                            {txn.type === "income" ? "+" : "-"}${txn.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(txn)} className="text-slate-500 hover:text-white text-sm transition-colors">Edit</button>
                                                <button onClick={() => handleDelete(txn.id)} className="text-slate-500 hover:text-red-400 text-sm transition-colors">Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-3 mt-6">
                            <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                                ← Previous
                            </Button>
                            <span className="text-sm text-slate-400">Page {page} of {totalPages}</span>
                            <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                                Next →
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Add/Edit Modal */}
            <Modal open={showModal} onClose={() => { setShowModal(false); setEditingTxn(null); }} title={editingTxn ? "Edit Transaction" : "New Transaction"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Amount" type="number" step="0.01" min="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} required />
                        <Select label="Type" options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "income" | "expense" })} />
                    </div>
                    <Select label="Category" options={CATEGORIES.map((c) => ({ value: c, label: c }))} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
                    <Input label="Description" type="text" placeholder="What was this for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <Input label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="secondary" type="button" onClick={() => { setShowModal(false); setEditingTxn(null); }}>Cancel</Button>
                        <Button type="submit" loading={submitting}>{editingTxn ? "Update" : "Add"} Transaction</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default function TransactionsPage() {
    return (
        <AuthProvider>
            <DashboardLayout>
                <TransactionsContent />
            </DashboardLayout>
        </AuthProvider>
    );
}
