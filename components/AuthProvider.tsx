"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithTelegram: (telegramUser: TelegramUser) => Promise<void>;
  signOut: () => Promise<void>;
  clearSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();

      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("supabase.auth.token");
        localStorage.removeItem("sb-127.0.0.1:54321-auth-token");
        localStorage.removeItem("sb-localhost-auth-token");
        // Clear any other potential auth keys
        Object.keys(localStorage).forEach((key) => {
          if (key.includes("supabase") || key.includes("auth")) {
            localStorage.removeItem(key);
          }
        });
      }

      setUser(null);
    } catch (error) {
      console.error("Error clearing session:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth session error:", error);
          // If there's an error getting the session (like invalid refresh token),
          // clear the corrupted session
          if (
            error.message.includes("refresh") ||
            error.message.includes("token")
          ) {
            await clearSession();
          }
        } else if (mounted) {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        await clearSession();
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        setUser(session?.user ?? null);
      } else if (event === "SIGNED_IN") {
        setUser(session?.user ?? null);
      } else if (event === "USER_UPDATED") {
        setUser(session?.user ?? null);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      // If login fails due to token issues, clear session first
      if (
        error instanceof Error &&
        (error.message?.includes("refresh") || error.message?.includes("token"))
      ) {
        await clearSession();
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      // Always clear local state even if signOut fails
      await clearSession();
    }
  };

  const signInWithTelegram = async (telegramUser: TelegramUser) => {
    try {
      // Call our API endpoint to validate Telegram auth and sign in/create user
      const response = await fetch("/api/auth/telegram-signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ telegramUser }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Telegram authentication failed");
      }

      const { redirectUrl } = await response.json();

      // Redirect to the magic link URL to complete authentication
      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        throw new Error("No authentication URL received");
      }
    } catch (error) {
      console.error("Telegram signin error:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signInWithTelegram,
        signOut,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
