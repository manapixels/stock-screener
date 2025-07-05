"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

// Telegram Login Widget component
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

function TelegramLoginWidget({
  onAuth,
}: {
  onAuth: (user: TelegramUser) => void;
}) {
  const [showSetupInstructions, setShowSetupInstructions] = useState(false);

  useEffect(() => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

    // Check if bot is configured
    if (!botUsername || botUsername === "your_bot_username_here") {
      setShowSetupInstructions(true);
      return;
    }

    // Load Telegram Login Widget script
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    // Add global callback function
    (window as unknown as Record<string, unknown>).onTelegramAuth = onAuth;

    const container = document.getElementById("telegram-login-container");
    if (container) {
      container.appendChild(script);
    }

    return () => {
      // Cleanup
      delete (window as unknown as Record<string, unknown>).onTelegramAuth;
      if (container && script.parentNode === container) {
        container.removeChild(script);
      }
    };
  }, [onAuth]);

  if (showSetupInstructions) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <svg
            className="w-5 h-5 text-blue-600"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          <span className="text-sm font-medium text-blue-800">
            Telegram Sign-in Setup Required
          </span>
        </div>
        <p className="text-xs text-blue-700 mb-3">
          To enable Telegram authentication, configure your bot in{" "}
          <code className="bg-blue-100 px-1 rounded">.env.local</code>:
        </p>
        <div className="text-left bg-blue-100 rounded p-2 text-xs font-mono text-blue-800">
          NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot_username
          <br />
          TELEGRAM_BOT_TOKEN=your_bot_token
        </div>
        <p className="text-xs text-blue-600 mt-2">
          Get these from{" "}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            @BotFather
          </a>{" "}
          on Telegram
        </p>
      </div>
    );
  }

  return (
    <div id="telegram-login-container" className="flex justify-center"></div>
  );
}

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [error, setError] = useState("");
  const { signIn, signInWithTelegram } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signIn(email, password);
      toast.success("Successfully logged in!");

      // Redirect back to intended destination
      const redirectPath = sessionStorage.getItem("redirectAfterAuth");
      if (redirectPath) {
        sessionStorage.removeItem("redirectAfterAuth");
        router.push(redirectPath);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramAuth = async (user: TelegramUser) => {
    setIsTelegramLoading(true);
    setError("");

    console.log("🔍 Telegram auth data received:", user);

    try {
      await signInWithTelegram(user);
      toast.success("Successfully logged in with Telegram!");

      // Redirect back to intended destination
      const redirectPath = sessionStorage.getItem("redirectAfterAuth");
      if (redirectPath) {
        sessionStorage.removeItem("redirectAfterAuth");
        router.push(redirectPath);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("❌ Telegram auth error:", err);
      setError(err instanceof Error ? err.message : "Telegram login failed");
    } finally {
      setIsTelegramLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Telegram Login Section */}
      <div className="text-center">
        {isTelegramLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <TelegramLoginWidget onAuth={handleTelegramAuth} />
        )}
      </div>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">
            Or continue with email
          </span>
        </div>
      </div>

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <Input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full"
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>
    </div>
  );
}
