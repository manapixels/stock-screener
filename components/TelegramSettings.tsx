"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getTelegramSettings,
  saveTelegramSettings,
  isAuthError,
} from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

function AuthPrompt() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-gray-400 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Sign in to configure Telegram
      </h3>
      <p className="text-gray-600 mb-4">
        Connect your Telegram account to receive alert notifications
      </p>
      <Button
        onClick={() => (window.location.href = "/auth")}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Sign In
      </Button>
    </div>
  );
}

export default function TelegramSettings() {
  const [chatId, setChatId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchSettings = async () => {
      setLoading(true);
      try {
        const result = await getTelegramSettings();
        if (isAuthError(result)) {
          // Auth error handled by AuthGuard, just return
          return;
        }
        if (result) {
          setChatId(result.chat_id);
        }
      } catch (error) {
        console.error("Error fetching telegram settings:", error);
        toast.error("Failed to load Telegram settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const result = await saveTelegramSettings(chatId);
      if (isAuthError(result)) {
        return;
      }
      toast.success("Telegram settings saved");
    } catch (error) {
      console.error("Error saving telegram settings:", error);
      toast.error("Failed to save Telegram settings");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Telegram Settings</h2>
        <AuthPrompt />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Telegram Settings</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label
              htmlFor="chatId"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Telegram Chat ID
            </label>
            <Input
              id="chatId"
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Enter your Telegram chat ID"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              To get your chat ID, message @userinfobot on Telegram
            </p>
          </div>
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      )}
    </div>
  );
}
