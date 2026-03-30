"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "./api";
import type { User } from "./types";

interface AuthContextType {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const me = await api.getMe();
            setUser(me);
        } catch {
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("token");
        if (stored) {
            setToken(stored);
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [fetchUser]);

    const login = async (email: string, password: string) => {
        const res = await api.login({ email, password });
        localStorage.setItem("token", res.access_token);
        setToken(res.access_token);
        const me = await api.getMe();
        setUser(me);
    };

    const signup = async (email: string, password: string, fullName: string) => {
        const res = await api.signup({ email, password, full_name: fullName });
        localStorage.setItem("token", res.access_token);
        setToken(res.access_token);
        const me = await api.getMe();
        setUser(me);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
