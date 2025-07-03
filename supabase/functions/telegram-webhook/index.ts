import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types and interfaces
interface TelegramWebhookPayload {
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      type: string;
    };
    text?: string;
    date: number;
  };
  callback_query?: {
    id: string;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    message: {
      message_id: number;
      chat: {
        id: number;
        type: string;
      };
    };
    data: string;
  };
}

interface TelegramBotCommand {
  command: string;
  symbol?: string;
  symbols?: string[];
  value?: number;
  direction?: "above" | "below";
  args: string[];
}

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface StockQuote {
  symbol: string;
  name: string;
  exchange?: string;
}

interface AnalysisData {
  analysis?: {
    recommendation?: {
      rating?: string;
      priceTarget?: number;
      confidence?: string;
      timeHorizon?: string;
    };
    investmentThesis?: string;
    bullishArguments?: string[];
    bearishArguments?: string[];
    financialHighlights?: {
      valuation?: string;
      profitability?: string;
      financialStrength?: string;
      dividend?: string;
    };
  };
  currentPrice?: number;
  quote?: {
    price?: number;
  };
  lastUpdated?: string;
  dataSource?: string;
}

interface InlineKeyboard {
  inline_keyboard: Array<Array<{
    text: string;
    callback_data: string;
  }>>;
}

interface WatchlistItem {
  id: string;
  symbol: string;
  company_name?: string;
  created_at: string;
}

// Analysis cache to track recent research
const recentAnalyses = new Map<
  string,
  { symbol: string; timestamp: number; recommendation: string }
>();
const RECENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Authentication Types and Constants
interface AuthenticatedUser {
  id: string;
  telegram_user_id: string;
  telegram_chat_id: string;
  email?: string;
  display_name?: string;
}

// Define protected (authenticated) commands
const PROTECTED_COMMANDS = [
  "research",
  "recent",
  "search",
  "alert",
  "alerts",
  "watchlist",
  "add",
  "remove",
];

// Authentication Functions
async function authenticateUser(
  telegramUserId: number,
  chatId: string,
): Promise<AuthenticatedUser | null> {
  try {
    console.log(
      `🔐 Authenticating user: telegram_id=${telegramUserId}, chat_id=${chatId}`,
    );

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, telegram_user_id, telegram_chat_id, email, display_name")
      .eq("telegram_user_id", telegramUserId.toString())
      .eq("telegram_chat_id", chatId)
      .single();

    if (error) {
      console.log(`❌ Authentication failed: ${error.message}`);
      return null;
    }

    if (!profile) {
      console.log(`❌ No user found for telegram_id=${telegramUserId}`);
      return null;
    }

    console.log(`✅ User authenticated: ${profile.id}`);
    return {
      id: profile.id,
      telegram_user_id: profile.telegram_user_id,
      telegram_chat_id: profile.telegram_chat_id,
      email: profile.email,
      display_name: profile.display_name,
    };
  } catch (error) {
    console.error("❌ Authentication error:", error);
    return null;
  }
}

function formatAuthenticationPrompt(): string {
  return `🔒 **Authentication Required**

To use research, alerts, and watchlist features, you need an account:

🆕 **New User?**
Use /signup to create an account with Telegram

🔗 **Have a web account?**
Use /link [TOKEN] to connect your accounts.
Get a token from your account settings on the web app.

💡 **Public Commands:**
• /help - View all commands
• /start - Welcome message

🚀 Create an account to unlock personalized stock analysis!`;
}

function createAuthenticationInlineKeyboard(): InlineKeyboard {
  return {
    inline_keyboard: [
      [
        {
          text: "📝 Sign Up with Telegram",
          callback_data: "auth_signup",
        },
        {
          text: "🔗 Link Web Account",
          callback_data: "auth_link",
        },
      ],
      [
        {
          text: "💡 Help",
          callback_data: "auth_help",
        },
      ],
    ],
  };
}

function formatSignupPrompt(firstName: string): string {
  return `📝 **Welcome ${firstName}!**

Let's create your Stock Screener account:

✨ **What you'll get:**
• 🚀 Professional stock analysis
• 📊 Personal watchlists
• 🚨 Price alerts via Telegram
• 📱 Cross-platform sync

🔄 **Creating your account...**
This will just take a moment!`;
}

function formatSignupSuccess(displayName: string): string {
  return `🎉 **Account Created Successfully!**

Welcome aboard, ${displayName}! 

✅ **You now have access to:**
• /research [STOCK] - Professional analysis
• /watchlist - Manage your stocks
• /alerts - Set price notifications
• /recent - View research history

🚀 **Try it out:**
Send /research AAPL to get started!

💡 Use /help anytime to see all commands.`;
}

function formatSignupError(error: string): string {
  return `❌ **Signup Failed**

${error}

🔄 **Try again:**
• Use /signup to retry
• Or /link [TOKEN] if you have a web account

💬 Contact support if you continue having issues.`;
}

// Telegram Formatter Functions
function formatAnalysisForTelegram(
  analysis: AnalysisData,
  symbol: string,
  isCached: boolean = false,
): string {
  if (!analysis || !analysis.analysis) {
    return `📊 *${symbol} Analysis*\n\n❌ Unable to generate analysis at this time. Please try again later.`;
  }

  const data = analysis.analysis;
  const rating = data.recommendation?.rating || "HOLD";
  const priceTarget = data.recommendation?.priceTarget;
  const confidence = data.recommendation?.confidence || "MEDIUM";
  const timeHorizon = data.recommendation?.timeHorizon || "12 months";
  const currentPrice = analysis.currentPrice || analysis.quote?.price;

  const recEmoji = rating.toLowerCase().includes("buy")
    ? "📈"
    : rating.toLowerCase().includes("sell")
      ? "📉"
      : "⚖️";
  const confEmoji =
    confidence === "HIGH" ? "🟢" : confidence === "MEDIUM" ? "🟡" : "🔴";
  const cacheIndicator = isCached ? "📦 " : "🔍 ";

  // Store in recent analyses
  recentAnalyses.set(symbol, {
    symbol,
    timestamp: Date.now(),
    recommendation: rating,
  });

  // Helper function to format arguments with bold titles
  function formatArgument(arg: string, index: number): string {
    // Look for pattern "Title: Description" and make title bold
    const colonMatch = arg.match(/^([^:]+):\s*(.+)/);
    if (colonMatch) {
      const [, title, description] = colonMatch;
      return `${index + 1}. *${title.trim()}:* ${description.trim()}`;
    }
    return `${index + 1}. ${arg}`;
  }

  // Generate related stocks suggestions
  const relatedSuggestions = getRelatedStockSuggestions(symbol);

  return `${cacheIndicator}📊 *${symbol} Professional Analysis*

💭 *Investment Thesis:*
${data.investmentThesis || "Analysis in progress..."}

${currentPrice ? `💰 *Current Price:* $${typeof currentPrice === "number" ? currentPrice.toFixed(2) : currentPrice}` : ""}
${recEmoji} *Recommendation:* ${rating}
${priceTarget ? `🎯 *Price Target:* $${priceTarget}` : ""}
${confEmoji} *Confidence:* ${confidence} (${timeHorizon})

📈 *Bull Case:*
${
  data.bullishArguments
    ?.slice(0, 3)
    .map((arg: string, i: number) => formatArgument(arg, i))
    .join("\n") || "Analyzing positive factors..."
}

📉 *Bear Case:*
${
  data.bearishArguments
    ?.slice(0, 2)
    .map((arg: string, i: number) => formatArgument(arg, i))
    .join("\n") || "Analyzing risk factors..."
}

💰 *Financial Highlights:*
📊 ${data.financialHighlights?.valuation || "Valuation metrics loading..."}
💼 ${data.financialHighlights?.profitability || "Profitability analysis loading..."}
🏦 ${data.financialHighlights?.financialStrength || "Financial strength assessment loading..."}
💸 ${data.financialHighlights?.dividend || "Dividend analysis loading..."}

${relatedSuggestions ? `💡 *Related:* ${relatedSuggestions}` : ""}

🔍 Use /recent for research history or /help for commands.`;
}

function getRelatedStockSuggestions(symbol: string): string {
  const techStocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META"];
  const bankStocks = ["JPM", "BAC", "WFC", "C", "GS", "MS"];
  const retailStocks = ["WMT", "HD", "COST", "TGT", "LOW"];

  if (techStocks.includes(symbol)) {
    const others = techStocks.filter((s) => s !== symbol).slice(0, 2);
    return others.map((s) => `/research ${s}`).join(", ");
  } else if (bankStocks.includes(symbol)) {
    const others = bankStocks.filter((s) => s !== symbol).slice(0, 2);
    return others.map((s) => `/research ${s}`).join(", ");
  } else if (retailStocks.includes(symbol)) {
    const others = retailStocks.filter((s) => s !== symbol).slice(0, 2);
    return others.map((s) => `/research ${s}`).join(", ");
  }

  return "";
}

function createAnalysisInlineKeyboard(
  symbol: string,
  priceTarget?: number,
): InlineKeyboard {
  const buttons = [];

  if (priceTarget) {
    buttons.push([
      {
        text: `🚨 Alert at $${priceTarget}`,
        callback_data: `alert_${symbol}_${priceTarget}_above`,
      },
    ]);
  }

  buttons.push([
    {
      text: "⭐ Add to Watchlist",
      callback_data: `watchlist_add_${symbol}`,
    },
    {
      text: "🔍 Related Stocks",
      callback_data: `related_${symbol}`,
    },
  ]);

  return {
    inline_keyboard: buttons,
  };
}

function formatStockSearchForTelegram(results: any[]): string {
  if (!results || results.length === 0) {
    return "🔍 *Search Results*\n\n❌ No stocks found matching your query.\n\n💡 Try searching with a company name or different keywords.";
  }

  const formatted = results
    .slice(0, 5)
    .map(
      (stock, i) =>
        `${i + 1}. *${stock.symbol}* - ${stock.name}\n   📍 ${stock.exchange || "N/A"} | /research ${stock.symbol}`,
    )
    .join("\n\n");

  return `🔍 *Search Results*\n\n${formatted}\n\n💡 Tap any /research command above for analysis.`;
}

function formatRecentAnalyses(): string {
  const recent = Array.from(recentAnalyses.values())
    .filter((item) => Date.now() - item.timestamp < RECENT_CACHE_TTL)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  if (recent.length === 0) {
    return `📊 *Recent Research*\n\n📭 No recent analyses found.\n\n💡 Use /research SYMBOL to start analyzing stocks.`;
  }

  const formatted = recent
    .map((item, i) => {
      const timeAgo = formatTimeAgo(Date.now() - item.timestamp);
      const recEmoji = item.recommendation.toLowerCase().includes("buy")
        ? "📈"
        : item.recommendation.toLowerCase().includes("sell")
          ? "📉"
          : "⚖️";
      return `${i + 1}. ${recEmoji} *${item.symbol}* - ${item.recommendation} (${timeAgo})`;
    })
    .join("\n");

  return `📊 *Recent Research*\n\n${formatted}\n\n🔄 Use /research SYMBOL for fresh analysis`;
}

function formatTimeAgo(ms: number): string {
  const minutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatErrorForTelegram(
  message: string,
  command?: string,
  suggestions?: string[],
): string {
  let helpText = "";

  if (suggestions && suggestions.length > 0) {
    helpText = `\n\n💡 *Suggestions:*\n${suggestions.map((s) => `• ${s}`).join("\n")}`;
  } else if (command) {
    helpText = `\n\n💡 Use /${command} [PARAMS] or /help for guidance.`;
  } else {
    helpText = "\n\n💡 Use /help to see available commands.";
  }

  return `❌ *Error*\n\n${message}${helpText}`;
}

function formatHelpForTelegram(): string {
  return `🤖 *Stock Screener Bot Commands*

📊 *Analysis:*
• /research AAPL - Get professional stock analysis
• /research AAPL TSLA MSFT - Analyze multiple stocks
• /search apple inc - Search for stocks
• /recent - View recent research history

📋 *Watchlist Management:*
• /watchlist - View your watchlist
• /add AAPL - Add stock to watchlist
• /remove AAPL - Remove stock from watchlist

🚨 *Price Alerts:*
• /alert AAPL 150 above - Set price alert
• /alert TSLA 200 below - Set price alert
• /alerts - View your active alerts

🔗 *Account Features:*
• /link TOKEN - Link your web account
• /signup - Create account with Telegram

ℹ️ *Help & Info:*
• /help - Show this message
• /start - Welcome message

🌐 *Getting Started:*
1. Try /research AAPL for instant analysis
2. Use /add AAPL to build your watchlist
3. Set /alert AAPL 150 above for notifications
4. Link your account for full sync

💡 *Pro Tips:*
• Use inline buttons after analysis for quick actions
• Research multiple stocks: /research AAPL MSFT GOOGL
• Build watchlist first, then set alerts
• Check /recent for your analysis history`;
}

function formatWatchlistForTelegram(watchlist: any[]): string {
  if (!watchlist || watchlist.length === 0) {
    return `📋 *Your Watchlist*

📭 Your watchlist is empty.

💡 **Get Started:**
• /add AAPL - Add a stock to your watchlist
• /research AAPL - Analyze a stock first
• /search apple - Find stocks by name

🚀 **Quick adds:**
• /add AAPL - Apple Inc.
• /add TSLA - Tesla Inc.
• /add MSFT - Microsoft Corp.`;
  }

  const formatted = watchlist
    .slice(0, 15)
    .map((item, i) => {
      const symbol = item.symbol;
      const name = item.company_name || "N/A";
      const dateAdded = item.created_at ? new Date(item.created_at).toLocaleDateString() : "";
      
      return `${i + 1}. *${symbol}* - ${name}${dateAdded ? ` (${dateAdded})` : ""}`;
    })
    .join("\n");

  const totalCount = watchlist.length;
  const showingText = totalCount > 15 ? `\n\n📊 Showing 15 of ${totalCount} stocks` : "";

  return `📋 *Your Watchlist*

${formatted}${showingText}

💡 **Quick actions:**
• /research SYMBOL - Analyze any stock
• /add SYMBOL - Add new stock
• /remove SYMBOL - Remove stock
• /alert SYMBOL PRICE - Set price alert`;
}

function formatAlertConfirmationForTelegram(
  symbol: string,
  price: number,
  direction: string,
): string {
  const directionEmoji = direction === "above" ? "📈" : "📉";
  return `🚨 *Alert Set Successfully!*

${directionEmoji} *${symbol}* - Alert when price goes *${direction}* $${price}

📱 You'll receive notifications here when triggered.
📊 Use /alerts to view all your active alerts.`;
}

// Global environment variables
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Global Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req: Request) => {
  console.log("📱 Webhook request received:", req.method);
  
  // Validate environment variables first
  if (!TELEGRAM_BOT_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing required environment variables");
    return new Response("Configuration error", { status: 500 });
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload: TelegramWebhookPayload = await req.json();
    console.log(
      "📱 Telegram webhook received:",
      JSON.stringify(payload, null, 2),
    );

    // Handle callback queries from inline keyboards FIRST (button presses)
    if (payload.callback_query) {
      console.log("🔘 Processing callback query:", payload.callback_query.data);
      await handleCallbackQuery(payload.callback_query);
      return new Response("OK", { status: 200 });
    }

    // Handle regular messages
    if (!payload.message || !payload.message.text) {
      return new Response("OK", { status: 200 });
    }

    const message = payload.message;
    const chatId = message.chat.id.toString();
    const text = message.text.trim();
    
    // Validate chat ID format (should be a valid number)
    if (!/^-?\d+$/.test(chatId)) {
      console.error(`❌ Invalid chat ID format: ${chatId}`);
      return new Response("OK", { status: 200 });
    }

    // Parse command
    const command = parseCommand(text);
    console.log("🔍 Parsed command:", command);

    // Check authentication for protected commands
    let authenticatedUser: AuthenticatedUser | null = null;
    if (PROTECTED_COMMANDS.includes(command.command)) {
      authenticatedUser = await authenticateUser(message.from.id, chatId);

      if (!authenticatedUser) {
        console.log(
          `🔒 Unauthenticated user tried to access protected command: ${command.command}`,
        );
        await sendTelegramMessage(
          chatId,
          formatAuthenticationPrompt(),
          createAuthenticationInlineKeyboard(),
        );
        return new Response("OK", { status: 200 });
      }
      console.log(
        `✅ Authenticated user ${authenticatedUser.id} accessing ${command.command}`,
      );
    }

    // Handle different commands
    let response: string;
    let inlineKeyboard: InlineKeyboard | undefined = undefined;

    switch (command.command) {
      case "start":
        response = await handleStartCommand(chatId, message.from);
        break;
      case "help":
        response = formatHelpForTelegram();
        break;
      case "link":
        response = await handleLinkCommand(
          chatId,
          command.args[0],
          message.from,
        );
        break;
      case "signup":
        const signupResult = await handleSignupCommand(chatId, message.from);
        response = signupResult.response;
        inlineKeyboard = signupResult.inlineKeyboard;
        break;
      case "research":
        const result = await handleResearchCommand(
          chatId,
          command.symbols || [command.symbol].filter(Boolean),
          authenticatedUser!,
        );
        response = result.response;
        inlineKeyboard = result.inlineKeyboard;
        break;
      case "search":
        response = await handleSearchCommand(command.args.join(" "));
        break;
      case "alert":
        response = await handleAlertCommand(
          chatId,
          command.symbol,
          command.value,
          command.direction,
          authenticatedUser!,
        );
        break;
      case "alerts":
        response = await handleAlertsCommand(chatId, authenticatedUser!);
        break;
      case "watchlist":
        response = await handleWatchlistCommand(chatId, authenticatedUser!);
        break;
      case "add":
        response = await handleAddCommand(chatId, command.symbol, authenticatedUser!);
        break;
      case "remove":
        response = await handleRemoveCommand(chatId, command.symbol, authenticatedUser!);
        break;
      case "recent":
        response = formatRecentAnalyses();
        break;
      default:
        response = formatErrorForTelegram(
          "Unknown command. Use /help to see available commands.",
        );
    }

    // Send response to Telegram
    await sendTelegramMessage(chatId, response, inlineKeyboard);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("❌ Telegram webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

function parseCommand(text: string): TelegramBotCommand {
  const parts = text.split(" ").filter((part) => part.length > 0);
  const command = parts[0].toLowerCase().replace("/", "");
  const args = parts.slice(1);

  let symbol: string | undefined;
  let symbols: string[] | undefined;
  let value: number | undefined;
  let direction: "above" | "below" = "above";

  // Parse based on command type
  switch (command) {
    case "research":
      if (args.length > 1) {
        // Multiple symbols
        symbols = args
          .map((arg) => arg.toUpperCase())
          .filter((s) => s.length > 0);
      } else {
        symbol = args[0]?.toUpperCase();
      }
      break;
    case "alert":
      symbol = args[0]?.toUpperCase();
      value = args[1] ? parseFloat(args[1]) : undefined;
      direction = args[2]?.toLowerCase() === "below" ? "below" : "above";
      break;
    case "add":
    case "remove":
      symbol = args[0]?.toUpperCase();
      break;
  }

  return {
    command,
    symbol,
    symbols,
    value,
    direction,
    args,
  };
}

async function handleStartCommand(chatId: string, from: any): Promise<string> {
  const name = from.first_name || "there";

  return `👋 Hello ${name}! Welcome to the Stock Screener Bot!

🔗 **Link Your Account:**
If you have a web account, use /link [TOKEN] to connect your accounts.

📊 **Get Started:**
• /research AAPL - Analyze a stock
• /search apple - Search for stocks  
• /help - See all commands

🚀 Start exploring the markets with professional analysis!`;
}

async function handleSignupCommand(
  chatId: string,
  from: any,
): Promise<{ response: string; inlineKeyboard?: any }> {
  try {
    // Check if user already exists
    const existingUser = await authenticateUser(from.id, chatId);
    if (existingUser) {
      return {
        response: `✅ **Account Already Exists**

You're already signed up, ${existingUser.display_name || from.first_name}! 

🚀 **Start using your account:**
• /research AAPL - Professional analysis
• /watchlist - Manage your stocks
• /alerts - Set price notifications

💡 Use /help to see all commands.`,
      };
    }

    // Show signup progress message
    await sendTelegramMessage(chatId, formatSignupPrompt(from.first_name));
    await sendChatAction(chatId, "typing");

    // Call signup function
    const supabaseUrl = SUPABASE_URL;
    const supabaseServiceKey = SUPABASE_SERVICE_ROLE_KEY;

    const signupResponse = await fetch(
      `${supabaseUrl}/functions/v1/telegram-signup`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: from.id,
          telegram_chat_id: chatId,
          first_name: from.first_name,
          last_name: from.last_name,
          username: from.username,
        }),
      },
    );

    if (!signupResponse.ok) {
      const errorData = await signupResponse.json();
      return {
        response: formatSignupError(
          errorData.message || "Failed to create account",
        ),
      };
    }

    const result = await signupResponse.json();

    if (result.success) {
      const displayName = `${from.first_name}${from.last_name ? " " + from.last_name : ""}`;
      return {
        response: formatSignupSuccess(displayName),
      };
    } else {
      return {
        response: formatSignupError(
          result.message || "Account creation failed",
        ),
      };
    }
  } catch (error) {
    console.error("❌ Signup command error:", error);
    return {
      response: formatSignupError(
        "An unexpected error occurred during signup. Please try again.",
      ),
    };
  }
}

async function handleAuthCallbackQuery(
  chatId: string,
  data: string,
  from: any,
): Promise<string> {
  switch (data) {
    case "auth_signup":
      // Trigger signup flow
      const signupResult = await handleSignupCommand(chatId, from);
      return signupResult.response;

    case "auth_link":
      return `🔗 **Link Your Web Account**

To link your existing web account:

1️⃣ Open the Stock Screener web app
2️⃣ Go to Account Settings
3️⃣ Generate a Telegram Link Token
4️⃣ Send: /link [YOUR_TOKEN]

📱 **Don't have a web account yet?**
Use /signup to create one with Telegram!`;

    case "auth_help":
      return formatHelpForTelegram();

    default:
      return "Unknown authentication option. Please try again.";
  }
}

async function handleLinkCommand(
  chatId: string,
  token: string,
  from: any,
): Promise<string> {
  if (!token) {
    return formatErrorForTelegram(
      "Please provide a link token. Get one from your account settings on the web app.",
      "link",
    );
  }

  try {
    const { data, error } = await supabase.rpc("link_telegram_account", {
      p_token: token,
      p_chat_id: chatId,
      p_username: from.username || null,
      p_first_name: from.first_name || null,
      p_last_name: from.last_name || null,
    });

    if (error) {
      console.error("Database error linking account:", error);
      return formatErrorForTelegram(
        "Database error occurred while linking account.",
      );
    }

    if (data.success) {
      return `✅ **Account Linked Successfully!**

Your Telegram account is now connected to your web account. You can now:

📊 Get personalized analysis
🚨 Receive your price alerts
📋 Access your watchlist
⚙️ Sync with web app settings

Use /help to see all available commands!`;
    } else {
      return formatErrorForTelegram(
        data.message ||
          "Failed to link account. Please check your token and try again.",
      );
    }
  } catch (error) {
    console.error("Error linking account:", error);
    return formatErrorForTelegram(
      "An error occurred while linking your account. Please try again.",
    );
  }
}

async function handleResearchCommand(
  chatId: string,
  symbols: string[],
  user: AuthenticatedUser,
): Promise<{ response: string; inlineKeyboard?: any }> {
  if (!symbols || symbols.length === 0) {
    return {
      response: formatErrorForTelegram(
        "Please provide a stock symbol. Example: /research AAPL",
        "research",
        [
          "Try /research AAPL",
          "Use /search apple to find symbols",
          "Check /recent for history",
        ],
      ),
    };
  }

  // Handle multiple symbols
  if (symbols.length > 1) {
    if (symbols.length > 5) {
      return {
        response: formatErrorForTelegram(
          "Too many symbols. Please analyze up to 5 stocks at once.",
          "research",
          [
            `Try /research ${symbols.slice(0, 3).join(" ")}`,
            "Analyze stocks individually for detailed reports",
          ],
        ),
      };
    }

    return await handleMultipleResearch(chatId, symbols);
  }

  const symbol = symbols[0];

  try {
    // Send initial status message
    await sendTelegramMessage(
      chatId,
      `🔍 Analyzing ${symbol}... This may take 10-15 seconds.`,
    );

    // Send typing indicator
    await sendChatAction(chatId, "typing");

    // Check if we need to suggest correct symbol
    const suggestedSymbol = await validateOrSuggestSymbol(symbol);
    if (suggestedSymbol && suggestedSymbol !== symbol) {
      return {
        response: formatErrorForTelegram(
          `Symbol "${symbol}" not found. Did you mean ${suggestedSymbol}?`,
          "research",
          [
            `Try /research ${suggestedSymbol}`,
            `Use /search ${symbol} to find correct symbol`,
          ],
        ),
      };
    }

    // Send progress update
    await sendTelegramMessage(chatId, "📊 Fetching financial data...");
    await sendChatAction(chatId, "typing");

    // Call the professional analysis API
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/professional-analysis`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol }),
      },
    );

    console.log(`📊 Professional analysis response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ Professional analysis API error: ${response.status} - ${errorText}`,
      );
      throw new Error(`API call failed: ${response.status} - ${errorText}`);
    }

    // Send final progress update
    await sendTelegramMessage(chatId, "🤖 Generating AI insights...");
    await sendChatAction(chatId, "typing");

    const analysis = await response.json();
    console.log(`✅ Professional analysis received for ${symbol}:`, {
      hasAnalysis: !!analysis.analysis,
      dataSource: analysis.dataSource,
      currentPrice: analysis.currentPrice,
    });

    // Check if this was from cache
    const isCached =
      analysis.lastUpdated &&
      Date.now() - new Date(analysis.lastUpdated).getTime() < 1800000; // 30 min

    const finalResponse = formatAnalysisForTelegram(analysis, symbol, isCached);
    const priceTarget = analysis.analysis?.recommendation?.priceTarget;
    const inlineKeyboard = createAnalysisInlineKeyboard(symbol, priceTarget);

    return {
      response: finalResponse,
      inlineKeyboard,
    };
  } catch (error) {
    console.error("Error getting analysis:", error);

    let errorMessage = "Unable to analyze stock at this time.";
    const suggestions = [
      "Check if symbol is correct",
      "Try again in a few moments",
      "Use /search to find symbols",
    ];

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage =
          "⏱️ Analysis timed out. This can happen during high traffic.";
        suggestions.unshift("Try again in 30 seconds");
      } else if (error.message.includes("404")) {
        errorMessage = `Stock symbol "${symbol}" not found.`;
        suggestions.unshift(`Use /search ${symbol} to find correct symbol`);
      }
    }

    return {
      response: formatErrorForTelegram(errorMessage, "research", suggestions),
    };
  }
}

async function handleMultipleResearch(
  chatId: string,
  symbols: string[],
): Promise<{ response: string }> {
  const estimatedTime = symbols.length * 15;
  await sendTelegramMessage(
    chatId,
    `🔍 Analyzing ${symbols.length} stocks... (~${estimatedTime} seconds total)`,
  );

  const results: string[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];

    try {
      await sendChatAction(chatId, "typing");
      await sendTelegramMessage(
        chatId,
        `✅ ${symbol} complete (${i + 1}/${symbols.length})`,
      );

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/professional-analysis`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ symbol }),
        },
      );

      if (response.ok) {
        const analysis = await response.json();
        const rating = analysis.analysis?.recommendation?.rating || "HOLD";
        const priceTarget = analysis.analysis?.recommendation?.priceTarget;
        const confidence =
          analysis.analysis?.recommendation?.confidence || "MEDIUM";

        const recEmoji = rating.toLowerCase().includes("buy")
          ? "📈"
          : rating.toLowerCase().includes("sell")
            ? "📉"
            : "⚖️";
        const confEmoji =
          confidence === "HIGH" ? "🟢" : confidence === "MEDIUM" ? "🟡" : "🔴";

        results.push(
          `${recEmoji} *${symbol}*: ${rating}${priceTarget ? ` ($${priceTarget})` : ""} ${confEmoji}`,
        );
      } else {
        results.push(`❌ *${symbol}*: Analysis failed`);
      }
    } catch {
      results.push(`❌ *${symbol}*: Error occurred`);
    }
  }

  const summary = results.join("\n");
  return {
    response: `📊 *Multi-Stock Analysis Summary*\n\n${summary}\n\n💡 Use /research SYMBOL individually for detailed analysis.`,
  };
}

async function validateOrSuggestSymbol(symbol: string): Promise<string | null> {
  try {
    // Try a quick search to validate or suggest correct symbol
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-stock-search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: symbol }),
      },
    );

    if (response.ok) {
      const results = await response.json();
      if (results.quotes && results.quotes.length > 0) {
        // If exact match found, return it
        const exactMatch = results.quotes.find((q: any) => q.symbol === symbol);
        if (exactMatch) return symbol;

        // Otherwise return the first result as suggestion
        return results.quotes[0].symbol;
      }
    }
  } catch (error) {
    console.error("Error validating symbol:", error);
  }

  return null;
}

async function handleSearchCommand(query: string): Promise<string> {
  if (!query || query.trim().length === 0) {
    return formatErrorForTelegram(
      "Please provide a search query. Example: /search apple inc",
      "search",
    );
  }

  try {
    // Call the stock search API
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/yahoo-stock-search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No Authorization header - function deployed with --no-verify-jwt
        },
        body: JSON.stringify({ query }),
      },
    );

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const results = await response.json();
    return formatStockSearchForTelegram(results.quotes || []);
  } catch (error) {
    console.error("Error searching stocks:", error);
    return formatErrorForTelegram(
      "Unable to search stocks at this time. Please try again later.",
      "search",
    );
  }
}

async function handleAlertCommand(
  chatId: string,
  symbol?: string,
  price?: number,
  direction: "above" | "below" = "above",
  user?: AuthenticatedUser,
): Promise<string> {
  if (!symbol || !price) {
    return formatErrorForTelegram(
      "Usage: /alert SYMBOL PRICE [above|below]\nExample: /alert AAPL 150 above",
      "alert",
    );
  }

  // Check if user is linked
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, telegram_chat_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!profile) {
    return formatErrorForTelegram(
      "Please link your account first using /link [TOKEN]. Get a token from the web app settings.",
    );
  }

  try {
    // Create alert in database
    const { error } = await supabase.from("alerts").insert({
      user_id: profile.id,
      symbol: symbol,
      target_price: price,
      alert_type: direction,
      is_active: true,
    });

    if (error) {
      console.error("Error creating alert:", error);
      return formatErrorForTelegram(
        "Failed to create alert. Please try again.",
      );
    }

    return formatAlertConfirmationForTelegram(symbol, price, direction);
  } catch (error) {
    console.error("Error handling alert command:", error);
    return formatErrorForTelegram(
      "An error occurred while creating your alert. Please try again.",
    );
  }
}

async function handleAlertsCommand(
  chatId: string,
  user: AuthenticatedUser,
): Promise<string> {
  // Check if user is linked
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, telegram_chat_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!profile) {
    return formatErrorForTelegram(
      "Please link your account first using /link [TOKEN]. Get a token from the web app settings.",
    );
  }

  try {
    const { data: alerts, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("user_id", profile.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching alerts:", error);
      return formatErrorForTelegram(
        "Failed to fetch alerts. Please try again.",
      );
    }

    if (!alerts || alerts.length === 0) {
      return `🚨 *Your Price Alerts*

📭 No active alerts found.

💡 Create alerts with: /alert SYMBOL PRICE [above|below]
Example: /alert AAPL 150 above`;
    }

    const alertList = alerts
      .slice(0, 10)
      .map((alert, i) => {
        const direction = alert.alert_type === "above" ? "📈" : "📉";
        return `${i + 1}. ${direction} *${alert.symbol}* - $${alert.target_price} ${alert.alert_type}`;
      })
      .join("\n");

    return `🚨 *Your Price Alerts*

${alertList}

💡 Use /alert to create new alerts.`;
  } catch (error) {
    console.error("Error handling alerts command:", error);
    return formatErrorForTelegram(
      "An error occurred while fetching your alerts. Please try again.",
    );
  }
}

async function handleWatchlistCommand(
  chatId: string,
  user: AuthenticatedUser,
): Promise<string> {
  try {
    // Get user's watchlist
    const { data: watchlist, error } = await supabase
      .from("watchlist_items")
      .select("id, symbol, company_name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching watchlist:", error);
      return formatErrorForTelegram(
        "Failed to fetch your watchlist. Please try again.",
      );
    }

    return formatWatchlistForTelegram(watchlist || []);
  } catch (error) {
    console.error("Error handling watchlist command:", error);
    return formatErrorForTelegram(
      "An error occurred while fetching your watchlist. Please try again.",
    );
  }
}

async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: any,
): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ Telegram bot token not configured");
    return;
  }

  try {
    console.log(`📤 Sending message to chat_id: ${chatId}, text length: ${text.length}`);
    
    const body: any = {
      chat_id: chatId,
      text: text,
      parse_mode: "Markdown",
    };

    if (replyMarkup) {
      body.reply_markup = replyMarkup;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        "❌ Failed to send Telegram message:",
        response.status,
        errorData,
      );
      console.error("📋 Chat ID that failed:", chatId);
      console.error("📋 Bot token configured:", TELEGRAM_BOT_TOKEN ? "Yes" : "No");
      
      // If chat not found, this might be a test payload or invalid chat
      if (errorData.includes("chat not found")) {
        console.log("💡 This might be a test payload with invalid chat_id");
      }
    } else {
      console.log("✅ Telegram message sent successfully");
    }
  } catch (error) {
    console.error("❌ Error sending Telegram message:", error);
  }
}

async function sendChatAction(chatId: string, action: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    return;
  }

  try {
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          action: action,
        }),
      },
    );
  } catch (error) {
    console.error("❌ Error sending chat action:", error);
  }
}

async function handleCallbackQuery(callbackQuery: any): Promise<void> {
  const chatId = callbackQuery.message.chat.id.toString();
  const data = callbackQuery.data;
  const callbackQueryId = callbackQuery.id;

  let response = "";

  try {
    if (data.startsWith("alert_")) {
      // Format: alert_SYMBOL_PRICE_DIRECTION
      const parts = data.split("_");
      const symbol = parts[1];
      const price = parseFloat(parts[2]);
      const direction = parts[3] as "above" | "below";

      response = await handleAlertCommand(chatId, symbol, price, direction);
    } else if (data.startsWith("watchlist_add_")) {
      // Format: watchlist_add_SYMBOL
      const symbol = data.replace("watchlist_add_", "");
      response = await handleWatchlistAdd(chatId, symbol);
    } else if (data.startsWith("related_")) {
      // Format: related_SYMBOL
      const symbol = data.replace("related_", "");
      response = await handleRelatedStocks(symbol);
    } else if (data.startsWith("auth_")) {
      // Handle authentication callback queries
      response = await handleAuthCallbackQuery(
        chatId,
        data,
        callbackQuery.from,
      );
    } else {
      response = "Unknown action. Please try again.";
    }

    // Answer callback query
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: "✅ Action completed",
        }),
      },
    );

    // Send response message
    await sendTelegramMessage(chatId, response);
  } catch (error) {
    console.error("Error handling callback query:", error);

    // Answer callback query with error
    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text: "❌ Action failed",
        }),
      },
    );
  }
}

async function handleAddCommand(
  chatId: string,
  symbol: string | undefined,
  user: AuthenticatedUser,
): Promise<string> {
  if (!symbol) {
    return formatErrorForTelegram(
      "Please provide a stock symbol. Example: /add AAPL",
      "add",
      [
        "Try /add AAPL",
        "Use /search apple to find symbols",
        "Check /recent for analyzed stocks",
      ],
    );
  }

  try {
    // Check if already in watchlist
    const { data: existing } = await supabase
      .from("watchlist_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .single();

    if (existing) {
      return `⭐ *${symbol}* is already in your watchlist.\n\n💡 Use /watchlist to view your list or /remove ${symbol} to remove it.`;
    }

    // Try to validate the symbol by searching for it
    const validatedSymbol = await validateOrSuggestSymbol(symbol);
    if (!validatedSymbol) {
      return formatErrorForTelegram(
        `Stock symbol "${symbol}" not found.`,
        "add",
        [
          `Try /search ${symbol} to find correct symbol`,
          "Use /research SYMBOL to analyze first",
          "Check symbol spelling",
        ],
      );
    }

    // Add to watchlist
    const { error } = await supabase.from("watchlist_items").insert({
      user_id: user.id,
      symbol: symbol,
      company_name: null, // Will be populated by the web app
    });

    if (error) {
      console.error("Error adding to watchlist:", error);
      return formatErrorForTelegram(
        "Failed to add to watchlist. Please try again.",
      );
    }

    return `⭐ *${symbol}* added to your watchlist!\n\n📱 **Quick actions:**\n• /research ${symbol} - Analyze this stock\n• /alert ${symbol} [PRICE] - Set price alert\n• /watchlist - View your full list\n• /remove ${symbol} - Remove from watchlist`;
  } catch (error) {
    console.error("Error handling add command:", error);
    return formatErrorForTelegram(
      "An error occurred while adding to watchlist. Please try again.",
    );
  }
}

async function handleRemoveCommand(
  chatId: string,
  symbol: string | undefined,
  user: AuthenticatedUser,
): Promise<string> {
  if (!symbol) {
    return formatErrorForTelegram(
      "Please provide a stock symbol. Example: /remove AAPL",
      "remove",
      [
        "Try /remove AAPL",
        "Use /watchlist to see your stocks",
        "Check symbol spelling",
      ],
    );
  }

  try {
    // Check if exists in watchlist
    const { data: existing } = await supabase
      .from("watchlist_items")
      .select("id")
      .eq("user_id", user.id)
      .eq("symbol", symbol)
      .single();

    if (!existing) {
      return `📭 *${symbol}* is not in your watchlist.\n\n💡 Use /watchlist to see your stocks or /add ${symbol} to add it.`;
    }

    // Remove from watchlist
    const { error } = await supabase
      .from("watchlist_items")
      .delete()
      .eq("user_id", user.id)
      .eq("symbol", symbol);

    if (error) {
      console.error("Error removing from watchlist:", error);
      return formatErrorForTelegram(
        "Failed to remove from watchlist. Please try again.",
      );
    }

    return `🗑️ *${symbol}* removed from your watchlist.\n\n📱 **Quick actions:**\n• /watchlist - View your updated list\n• /add ${symbol} - Add it back\n• /research ${symbol} - Analyze this stock`;
  } catch (error) {
    console.error("Error handling remove command:", error);
    return formatErrorForTelegram(
      "An error occurred while removing from watchlist. Please try again.",
    );
  }
}

async function handleWatchlistAdd(
  chatId: string,
  symbol: string,
): Promise<string> {
  // Check if user is linked
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, telegram_chat_id")
    .eq("telegram_chat_id", chatId)
    .single();

  if (!profile) {
    return formatErrorForTelegram(
      "Please link your account first using /link [TOKEN]. Get a token from the web app settings.",
      undefined,
      [
        "Visit the web app settings page",
        "Generate a link token",
        "Use /link TOKEN command",
      ],
    );
  }

  try {
    // Check if already in watchlist
    const { data: existing } = await supabase
      .from("watchlist_items")
      .select("id")
      .eq("user_id", profile.id)
      .eq("symbol", symbol)
      .single();

    if (existing) {
      return `⭐ *${symbol}* is already in your watchlist.\n\n💡 View your watchlist in the web app or use /watchlist command.`;
    }

    // Add to watchlist
    const { error } = await supabase.from("watchlist_items").insert({
      user_id: profile.id,
      symbol: symbol,
      company_name: null, // Will be populated by the web app
    });

    if (error) {
      console.error("Error adding to watchlist:", error);
      return formatErrorForTelegram(
        "Failed to add to watchlist. Please try again.",
      );
    }

    return `⭐ *${symbol}* added to your watchlist!\n\n📱 View and manage your watchlist in the web app.\n💡 Use /watchlist to see your list.`;
  } catch (error) {
    console.error("Error handling watchlist add:", error);
    return formatErrorForTelegram(
      "An error occurred while adding to watchlist. Please try again.",
    );
  }
}

async function handleRelatedStocks(symbol: string): Promise<string> {
  const suggestions = getRelatedStockSuggestions(symbol);

  if (!suggestions) {
    return `🔍 *Related Stocks for ${symbol}*\n\n💡 Try searching for stocks in the same sector:\n• /search technology\n• /search banking\n• /search retail\n\nOr explore trending stocks:\n• /research NVDA\n• /research TSLA\n• /research GOOGL`;
  }

  return `🔍 *Related to ${symbol}*\n\n${suggestions}\n\n💡 Use any /research command above for analysis.`;
}
