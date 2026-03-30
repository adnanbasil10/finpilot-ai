/* ── Types shared across the frontend ──────────────────────────── */

export interface User {
    id: string;
    email: string;
    full_name: string;
}

export interface Token {
    access_token: string;
    token_type: string;
}

export type TransactionType = "income" | "expense";

export interface Transaction {
    id: string;
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    date: string;
}

export interface PaginatedTransactions {
    items: Transaction[];
    total: number;
    page: number;
    per_page: number;
    pages: number;
}

export interface Budget {
    id: string;
    category: string;
    limit_amount: number;
    month: number;
    year: number;
    spent: number;
}

export interface InsightsResponse {
    summary: string;
    highlights: string[];
    recommendations: string[];
}

export interface TransactionCreate {
    amount: number;
    type: TransactionType;
    category: string;
    description: string;
    date: string;
}

export interface BudgetCreate {
    category: string;
    limit_amount: number;
    month: number;
    year: number;
}
