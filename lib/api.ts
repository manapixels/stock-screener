import { supabase } from "./supabase";

export interface AuthError {
  isAuthError: true;
  message: string;
}

export function isAuthError(error: unknown): error is AuthError {
  return (
    error !== null &&
    typeof error === "object" &&
    (error as AuthError).isAuthError === true
  );
}

// Helper function to get authenticated user
async function getAuthenticatedUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      error: {
        isAuthError: true,
        message: "Please sign in to continue",
      } as AuthError,
    };
  }
  return { user };
}

// Stock search function using Yahoo Finance
export const searchStocks = async (query: string) => {
  try {
    // Use Next.js API route
    const response = await fetch("/api/yahoo-stock-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keywords: query }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error searching stocks:", error);
    throw error;
  }
};

// Get stock details function using Yahoo Finance
export const getStockDetails = async (symbol: string) => {
  try {
    // Use Next.js API route
    const response = await fetch("/api/simple-stock-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching stock details:", error);
    throw error;
  }
};

// Get current stock price and price changes using Yahoo Finance
export const getStockPrice = async (symbol: string) => {
  try {
    // Use Next.js API route
    const response = await fetch("/api/yahoo-stock-price", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();

    // Transform the data to match what Watchlist component expects
    const transformedData = {
      symbol: rawData.symbol,
      name: rawData.name,
      currentPrice: rawData.price,
      changes: {
        oneDay: {
          change: rawData.change || 0,
          changePercent: rawData.changePercent || 0,
        },
        oneWeek: {
          change: rawData.oneWeekChange || 0,
          changePercent: rawData.oneWeekChangePercent || 0,
        },
        oneMonth: {
          change: rawData.oneMonthChange || 0,
          changePercent: rawData.oneMonthChangePercent || 0,
        },
      },
      currency: rawData.currency,
      exchange: rawData.exchange,
      lastUpdated: rawData.lastUpdated,
    };

    return transformedData;
  } catch (error) {
    console.error("Error fetching stock price:", error);
    throw error;
  }
};

// Get stock news and sentiment analysis using Yahoo Finance
export const getStockNewsAndSentiment = async (symbol: string) => {
  try {
    // Use Next.js API route
    const response = await fetch("/api/stock-news-sentiment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching stock news and sentiment:", error);
    throw error;
  }
};

// Get professional investment analysis using Gemini 2.5 Flash
export const getProfessionalAnalysis = async (symbol: string) => {
  try {
    // Use local Next.js API route for development
    const response = await fetch("/api/professional-analysis", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching professional analysis:", error);
    throw error;
  }
};

// Watchlist functions
export const addWatchlistItem = async (symbol: string, companyName: string) => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase.from("watchlist_items").insert({
      user_id: authResult.user.id,
      symbol,
      company_name: companyName,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error adding to watchlist:", error);
    throw error;
  }
};

export const getWatchlist = async () => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase
      .from("watchlist_items")
      .select("*")
      .eq("user_id", authResult.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    throw error;
  }
};

export const removeWatchlistItem = async (id: string) => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("id", id)
      .eq("user_id", authResult.user.id);

    if (error) throw error;
  } catch (error) {
    console.error("Error removing from watchlist:", error);
    throw error;
  }
};

// Stock notes functions
export const saveStockNote = async (symbol: string, note: string) => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase.from("stock_notes").upsert({
      user_id: authResult.user.id,
      symbol,
      note,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error saving stock note:", error);
    throw error;
  }
};

export const getStockNote = async (symbol: string) => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase
      .from("stock_notes")
      .select("*")
      .eq("user_id", authResult.user.id)
      .eq("symbol", symbol)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error fetching stock note:", error);
    return null; // Return null instead of throwing for missing notes
  }
};

// Alert functions
export const createAlert = async (
  symbol: string,
  condition: string,
  targetPrice: number,
  message?: string,
) => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase.from("alerts").insert({
      user_id: authResult.user.id,
      symbol,
      condition,
      target_price: targetPrice,
      message,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating alert:", error);
    throw error;
  }
};

export const getAlerts = async () => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", authResult.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching alerts:", error);
    throw error;
  }
};

export const deleteAlert = async (id: string) => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { error } = await supabase
      .from("alerts")
      .delete()
      .eq("id", id)
      .eq("user_id", authResult.user.id);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting alert:", error);
    throw error;
  }
};

// Telegram settings functions
export const getTelegramSettings = async () => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase
      .from("telegram_settings")
      .select("*")
      .eq("user_id", authResult.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (error) {
    console.error("Error fetching telegram settings:", error);
    throw error;
  }
};

export const saveTelegramSettings = async (chatId: string) => {
  const authResult = await getAuthenticatedUser();
  if (authResult.error) return authResult.error;

  try {
    const { data, error } = await supabase.from("telegram_settings").upsert({
      user_id: authResult.user.id,
      chat_id: chatId,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error saving telegram settings:", error);
    throw error;
  }
};

export async function getUserProfile() {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.user.id)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateUserSettings(
  telegramChatId: string,
  telegramBotToken: string,
) {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      telegram_chat_id: telegramChatId,
      telegram_bot_token: telegramBotToken,
    })
    .eq("id", user.user.id)
    .select();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
