"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";

interface TelegramLinkToken {
  token: string;
  expires_at: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  telegram_chat_id?: string;
  telegram_username?: string;
  telegram_first_name?: string;
  telegram_last_name?: string;
  telegram_linked_at?: string;
  telegram_active?: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [linkToken, setLinkToken] = useState<TelegramLinkToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Define loadProfile function first
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user?.id,
            email: user?.email,
            full_name: user?.user_metadata?.full_name || "",
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      }
    } catch (error: unknown) {
      console.error("Error loading profile:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email, user?.user_metadata?.full_name]);

  // Load user profile
  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const generateLinkToken = async () => {
    try {
      setSaving(true);
      setError("");

      // Generate a random token
      const token =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

      const { error } = await supabase
        .from("telegram_link_tokens")
        .insert({
          user_id: user?.id,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setLinkToken({
        token,
        expires_at: expiresAt.toISOString(),
      });

      setSuccess("Link token generated! Use it in Telegram within 10 minutes.");
    } catch (error: unknown) {
      console.error("Error generating link token:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const unlinkTelegram = async () => {
    try {
      setSaving(true);
      setError("");

      const { data, error } = await supabase.rpc("unlink_telegram_account", {
        p_user_id: user?.id,
      });

      if (error) throw error;

      if (data.success) {
        setSuccess("Telegram account unlinked successfully!");
        await loadProfile(); // Reload profile
      } else {
        throw new Error(data.error || "Failed to unlink Telegram account");
      }
    } catch (error: unknown) {
      console.error("Error unlinking Telegram:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setSaving(true);
      setError("");

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user?.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      setSuccess("Profile updated successfully!");
    } catch (error: unknown) {
      console.error("Error updating profile:", error);
      setError(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Account Settings
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your account and Telegram integration
            </p>
          </div>

          <div className="p-6 space-y-8">
            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="text-green-800 text-sm">{success}</div>
              </div>
            )}

            {/* Profile Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Profile Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    type="text"
                    value={profile?.full_name || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, full_name: e.target.value } : null,
                      )
                    }
                    onBlur={() =>
                      profile?.full_name &&
                      updateProfile({ full_name: profile.full_name })
                    }
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            </div>

            {/* Telegram Integration */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Telegram Integration
              </h2>

              {profile?.telegram_active ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-green-900">
                        ✅ Telegram Account Linked
                      </h3>
                      <div className="text-sm text-green-700 mt-1">
                        <p>
                          <strong>Username:</strong> @
                          {profile.telegram_username || "Not provided"}
                        </p>
                        <p>
                          <strong>Name:</strong>{" "}
                          {[
                            profile.telegram_first_name,
                            profile.telegram_last_name,
                          ]
                            .filter(Boolean)
                            .join(" ") || "Not provided"}
                        </p>
                        <p>
                          <strong>Linked:</strong>{" "}
                          {profile.telegram_linked_at
                            ? new Date(
                                profile.telegram_linked_at,
                              ).toLocaleDateString()
                            : "Unknown"}
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={unlinkTelegram}
                      disabled={saving}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {saving ? "Unlinking..." : "Unlink"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">
                    🤖 Link Your Telegram Account
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Get stock analysis and alerts directly in Telegram! Link
                    your account to use our bot.
                  </p>

                  {linkToken ? (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">
                        🔗 Your Link Token
                      </h4>
                      <div className="bg-gray-100 rounded p-3 mb-3">
                        <code className="text-lg font-mono text-blue-600">
                          {linkToken.token}
                        </code>
                      </div>
                      <div className="text-sm text-gray-600 mb-3">
                        <p>
                          <strong>Instructions:</strong>
                        </p>
                        <ol className="list-decimal list-inside space-y-1 mt-1">
                          <li>
                            Open Telegram and search for{" "}
                            <code>@YourStockBot</code>
                          </li>
                          <li>Start a chat with the bot</li>
                          <li>
                            Send: <code>/link {linkToken.token}</code>
                          </li>
                          <li>Your account will be linked automatically!</li>
                        </ol>
                      </div>
                      <p className="text-xs text-red-600">
                        ⏰ Token expires:{" "}
                        {new Date(linkToken.expires_at).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={generateLinkToken}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? "Generating..." : "Generate Link Token"}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Telegram Bot Features */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">
                🚀 Telegram Bot Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-800">
                    📊 Analysis Commands
                  </h4>
                  <ul className="mt-1 space-y-1">
                    <li>
                      • <code>/research AAPL</code> - Get stock analysis
                    </li>
                    <li>
                      • <code>/search apple</code> - Search for stocks
                    </li>
                    <li>
                      • <code>/watchlist</code> - View your watchlist
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">
                    🚨 Alert Features
                  </h4>
                  <ul className="mt-1 space-y-1">
                    <li>
                      • <code>/alert AAPL 150</code> - Set price alerts
                    </li>
                    <li>
                      • <code>/alerts</code> - Manage alerts
                    </li>
                    <li>• Real-time notifications</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
