"use client";

import React from "react";

/* ── Skeleton ──────────────────────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse bg-slate-800 rounded-xl ${className}`}
        />
    );
}

/* ── Card Skeleton ─────────────────────────────────────────────── */
export function CardSkeleton() {
    return (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

/* ── Table Skeleton ────────────────────────────────────────────── */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
            ))}
        </div>
    );
}

/* ── Empty State ───────────────────────────────────────────────── */
export function EmptyState({
    icon = "📭",
    title,
    description,
    action,
}: {
    icon?: string;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-4">{icon}</span>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-slate-400 text-sm max-w-md mb-6">{description}</p>
            {action}
        </div>
    );
}

/* ── Error Banner ──────────────────────────────────────────────── */
export function ErrorBanner({
    message,
    onRetry,
}: {
    message: string;
    onRetry?: () => void;
}) {
    return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <span className="text-red-400 text-lg">⚠️</span>
                <p className="text-red-300 text-sm">{message}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-1.5 text-xs font-medium text-red-300 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                    Retry
                </button>
            )}
        </div>
    );
}

/* ── Button ────────────────────────────────────────────────────── */
export function Button({
    children,
    variant = "primary",
    loading = false,
    className = "",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger" | "ghost";
    loading?: boolean;
}) {
    const styles = {
        primary:
            "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/20",
        secondary:
            "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700",
        danger:
            "bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20",
        ghost:
            "text-slate-400 hover:text-white hover:bg-slate-800",
    };

    return (
        <button
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${styles[variant]} ${className}`}
            disabled={loading || props.disabled}
            {...props}
        >
            {loading && (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
        </button>
    );
}

/* ── Modal ─────────────────────────────────────────────────────── */
export function Modal({
    open,
    onClose,
    title,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl mx-4">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors text-xl"
                    >
                        ✕
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

/* ── Input ─────────────────────────────────────────────────────── */
export function Input({
    label,
    error,
    className = "",
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    error?: string;
}) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            )}
            <input
                className={`w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm ${error ? "border-red-500 focus:ring-red-500/50" : ""
                    } ${className}`}
                {...props}
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
    );
}

/* ── Select ────────────────────────────────────────────────────── */
export function Select({
    label,
    options,
    className = "",
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    options: { value: string; label: string }[];
}) {
    return (
        <div className="space-y-1.5">
            {label && (
                <label className="block text-sm font-medium text-slate-300">
                    {label}
                </label>
            )}
            <select
                className={`w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm ${className}`}
                {...props}
            >
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </div>
    );
}
