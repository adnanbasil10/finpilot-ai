/**
 * Typed HTTP client for the FinPilot AI backend.
 * Handles JWT header injection, JSON parsing, and error propagation.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: res.statusText }));
        throw new ApiError(body.detail || "Something went wrong", res.status);
    }

    // 204 No Content
    if (res.status === 204) return undefined as T;

    return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────
import type {
    Token,
    User,
    PaginatedTransactions,
    Transaction,
    TransactionCreate,
    Budget,
    BudgetCreate,
    InsightsResponse,
} from "./types";

export const api = {
    // Auth
    signup: (data: { email: string; password: string; full_name: string }) =>
        request<Token>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),

    login: (data: { email: string; password: string }) =>
        request<Token>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

    getMe: () => request<User>("/auth/me"),

    // Transactions
    getTransactions: (page = 1, perPage = 20, type?: string, category?: string) => {
        const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
        if (type) params.set("type", type);
        if (category) params.set("category", category);
        return request<PaginatedTransactions>(`/transactions?${params}`);
    },

    createTransaction: (data: TransactionCreate) =>
        request<Transaction>("/transactions", { method: "POST", body: JSON.stringify(data) }),

    updateTransaction: (id: string, data: Partial<TransactionCreate>) =>
        request<Transaction>(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(data) }),

    deleteTransaction: (id: string) =>
        request<void>(`/transactions/${id}`, { method: "DELETE" }),

    // Budgets
    getBudgets: (month: number, year: number) =>
        request<Budget[]>(`/budgets?month=${month}&year=${year}`),

    createBudget: (data: BudgetCreate) =>
        request<Budget>("/budgets", { method: "POST", body: JSON.stringify(data) }),

    // AI Insights
    analyzeSpending: (month: number, year: number) =>
        request<InsightsResponse>("/insights/analyze", {
            method: "POST",
            body: JSON.stringify({ month, year }),
        }),
};

export { ApiError };
