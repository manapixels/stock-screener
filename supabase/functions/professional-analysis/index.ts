// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

console.log("Hello from Functions!");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache for Edge Function
interface CacheEntry {
  data: AnalysisResult;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface ProfessionalAnalysis {
  investmentThesis: string;
  bullishArguments: string[];
  bearishArguments: string[];
  financialHighlights: {
    valuation: string;
    profitability: string;
    financialStrength: string;
    dividend: string;
  };
  competitorAnalysis: {
    marketPosition: string;
    competitiveAdvantages: string[];
    threats: string[];
    industryOutlook: string;
  };
  recommendation: {
    rating: string;
    priceTarget: number;
    timeHorizon: string;
    confidence: string;
  };
}

interface AnalysisResult {
  symbol: string;
  analysis: ProfessionalAnalysis;
  lastUpdated: string;
  dataSource: string;
  currentPrice?: number;
}

interface YahooStockData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  marketCap?: number;
  volume: number;

  // Valuation metrics
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  priceToSales?: number;
  pegRatio?: number;

  // Per-share metrics
  earningsPerShare?: number;
  forwardEps?: number;
  bookValuePerShare?: number;
  revenuePerShare?: number;

  // Financial health
  totalRevenue?: number;
  totalCash?: number;
  totalDebt?: number;
  debtToEquity?: number;
  currentRatio?: number;
  quickRatio?: number;

  // Profitability metrics
  returnOnAssets?: number;
  returnOnEquity?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;

  // Cash flow
  operatingCashflow?: number;
  freeCashflow?: number;

  // Growth metrics
  earningsGrowth?: number;
  revenueGrowth?: number;

  // Dividend information
  dividendRate?: number;
  dividendYield?: number;
  payoutRatio?: number;

  // Market metrics
  beta?: number;
  fiftyTwoWeekLow?: number;
  fiftyTwoWeekHigh?: number;

  // Share information
  sharesOutstanding?: number;
  floatShares?: number;

  // Business information
  sector?: string;
  industry?: string;

  // Exchange info
  exchange?: string;
  quoteType?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Main analysis function
    const { symbol, chatId } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`[${symbol}] Starting professional analysis...`);

    try {
      // Check cache first
      const cacheKey = symbol.toUpperCase();
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[${symbol}] Returning cached analysis`);
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(
        `[${symbol}] Fetching comprehensive financial data from Yahoo Finance...`,
      );

      // Fetch comprehensive financial data from Yahoo Finance
      let stockData: YahooStockData | null = null;

      try {
        // Get stock data from our yahoo-stock-data function
        const stockDataResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/yahoo-stock-data`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({ symbol }),
          },
        );

        if (stockDataResponse.ok) {
          stockData = await stockDataResponse.json();
          console.log(
            `[${symbol}] Successfully fetched comprehensive Yahoo Finance data:`,
            {
              price: stockData?.currentPrice,
              pe: stockData?.trailingPE,
              marketCap: stockData?.marketCap,
              sector: stockData?.sector,
              industry: stockData?.industry,
              revenue: stockData?.totalRevenue,
              debtToEquity: stockData?.debtToEquity,
            },
          );
        } else {
          console.log(
            `[${symbol}] Yahoo Finance data fetch failed, proceeding with Gemini only`,
          );
        }
      } catch (error) {
        console.log(
          `[${symbol}] Error fetching Yahoo Finance data:`,
          error.message,
        );
      }

      // Generate analysis with Gemini using the comprehensive financial data and retry logic
      const analysis = await generateWithGeminiWithRetry(
        symbol,
        stockData,
        chatId,
      );

      const result: AnalysisResult = {
        symbol,
        analysis,
        lastUpdated: new Date().toISOString(),
        dataSource: stockData ? "Yahoo Finance + Gemini" : "Gemini Only",
        currentPrice: stockData?.currentPrice,
      };

      // Cache the result
      cache.set(cacheKey, { data: result, timestamp: Date.now() });

      console.log(`✅ [${symbol}] Analysis completed successfully`);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error(`❌ [${symbol}] Error generating analysis:`, error.message);
      return new Response(
        JSON.stringify({
          error: "Analysis generation failed",
          details: error.message,
          symbol,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
  } catch (error) {
    console.error(`❌ Error in professional analysis:`, error);

    return new Response(
      JSON.stringify({
        error: "Unable to generate analysis at this time",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

// Helper function to send notifications to Telegram during analysis
async function sendTelegramNotification(
  chatId: string,
  message: string,
): Promise<void> {
  if (!chatId) return;

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) return;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }
}

// Retry wrapper for Gemini API calls with user notifications
async function generateWithGeminiWithRetry(
  symbol: string,
  stockData?: YahooStockData,
  chatId?: string,
  maxRetries: number = 3,
): Promise<ProfessionalAnalysis> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateWithGemini(symbol, stockData);
    } catch (error) {
      lastError = error;

      // Only retry on 503 errors (service overloaded)
      if (error.message.includes("503") && attempt < maxRetries) {
        const delay = attempt * 2; // 2s, 4s, 6s
        console.log(
          `[${symbol}] Attempt ${attempt} failed with 503, retrying in ${delay}s...`,
        );

        // Notify user about retry
        if (chatId) {
          await sendTelegramNotification(
            chatId,
            `⏳ *${symbol} Analysis*\n\nGemini AI is busy (attempt ${attempt}/${maxRetries}). Retrying in ${delay} seconds...\n\n_Please wait while we process your request._`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        continue;
      }

      // For non-503 errors or final attempt, break immediately
      break;
    }
  }

  // Final failure notification
  if (chatId) {
    await sendTelegramNotification(
      chatId,
      `❌ *${symbol} Analysis Failed*\n\nGemini AI is currently overloaded. Please try again in a few minutes.\n\n_We'll keep improving our service reliability!_`,
    );
  }

  throw lastError;
}

async function generateWithGemini(
  symbol: string,
  stockData?: YahooStockData,
): Promise<ProfessionalAnalysis> {
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

  if (!geminiApiKey) {
    console.error("GEMINI_API_KEY not configured.");
    throw new Error("Gemini API key not configured");
  }

  const prompt = buildAnalysisPrompt(symbol, stockData);

  console.log(`[${symbol}] Calling Gemini API...`);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.8,
            maxOutputTokens: 8096,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_NONE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_NONE",
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error(
        `[${symbol}] Gemini API error: ${response.status} - ${errorData}`,
      );
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    // Enhanced debugging
    console.log(`[${symbol}] Gemini API response structure:`, {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length || 0,
      firstCandidate: data.candidates?.[0]
        ? {
            hasContent: !!data.candidates[0].content,
            hasParts: !!data.candidates[0].content?.parts,
            partsLength: data.candidates[0].content?.parts?.length || 0,
            finishReason: data.candidates[0].finishReason,
            safetyRatings: data.candidates[0].safetyRatings,
          }
        : null,
    });

    // Check for safety filter blocks
    if (data.candidates?.[0]?.finishReason === "SAFETY") {
      console.error(
        `[${symbol}] Gemini blocked content due to safety filters:`,
        data.candidates[0].safetyRatings,
      );
      throw new Error(
        "Content blocked by Gemini safety filters. Using fallback analysis.",
      );
    }

    // Check for token limit exceeded
    if (data.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      console.error(
        `[${symbol}] Gemini hit token limit. Response was truncated.`,
      );
      throw new Error(
        "Response truncated due to token limit. Using fallback analysis.",
      );
    }

    // Check for other finish reasons
    if (
      data.candidates?.[0]?.finishReason &&
      data.candidates[0].finishReason !== "STOP"
    ) {
      console.warn(
        `[${symbol}] Gemini finished with reason: ${data.candidates[0].finishReason}`,
      );
    }

    const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      console.error(`[${symbol}] No analysis text returned from Gemini.`);
      console.error(
        `[${symbol}] Full API response:`,
        JSON.stringify(data, null, 2),
      );
      throw new Error("No content returned from Gemini API.");
    }

    console.log(
      `[${symbol}] Gemini response received, length: ${analysisText.length}`,
    );

    try {
      const parsedAnalysis = parseAnalysisResponse(analysisText);
      return parsedAnalysis;
    } catch (error) {
      console.error(
        `[${symbol}] Error parsing Gemini response:`,
        error.message,
      );
      console.log(`[${symbol}] Raw Gemini response:`, analysisText);
      throw new Error("Failed to parse Gemini analysis response.");
    }
  } catch (error) {
    console.error(`[${symbol}] Gemini API call failed:`, error.message);
    throw error;
  }
}

function buildAnalysisPrompt(
  symbol: string,
  stockData?: YahooStockData,
): string {
  const displaySymbol = symbol.toUpperCase();
  const companyName = stockData?.name || displaySymbol;

  // Build comprehensive financial data section if available from Yahoo Finance
  let financialDataSection = "";
  if (stockData) {
    const formatNumber = (num?: number, prefix = "", suffix = ""): string => {
      return num !== undefined && num !== null
        ? `${prefix}${num}${suffix}`
        : "N/A";
    };

    const formatCurrency = (num?: number): string => {
      if (num === undefined || num === null) return "N/A";
      if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
      if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
      if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
      return `$${num.toFixed(2)}`;
    };

    const formatPercent = (num?: number): string => {
      return num !== undefined && num !== null
        ? `${(num * 100).toFixed(2)}%`
        : "N/A";
    };

    financialDataSection = `

COMPREHENSIVE FINANCIAL DATA (Real-time from Yahoo Finance):
📈 MARKET DATA:
- Current Price: ${formatCurrency(stockData.currentPrice)}
- Market Cap: ${formatCurrency(stockData.marketCap)}
- Volume: ${stockData.volume?.toLocaleString() || "N/A"}
- Sector: ${stockData.sector || "N/A"}
- Industry: ${stockData.industry || "N/A"}

💰 VALUATION METRICS:
- P/E Ratio (TTM): ${formatNumber(stockData.trailingPE)}
- Forward P/E: ${formatNumber(stockData.forwardPE)}
- Price/Book: ${formatNumber(stockData.priceToBook)}
- Price/Sales: ${formatNumber(stockData.priceToSales)}
- PEG Ratio: ${formatNumber(stockData.pegRatio)}

📊 PER-SHARE METRICS:
- EPS (TTM): ${formatCurrency(stockData.earningsPerShare)}
- Forward EPS: ${formatCurrency(stockData.forwardEps)}
- Book Value/Share: ${formatCurrency(stockData.bookValuePerShare)}
- Revenue/Share: ${formatCurrency(stockData.revenuePerShare)}

💪 FINANCIAL HEALTH:
- Total Revenue: ${formatCurrency(stockData.totalRevenue)}
- Total Cash: ${formatCurrency(stockData.totalCash)}
- Total Debt: ${formatCurrency(stockData.totalDebt)}
- Debt/Equity: ${formatNumber(stockData.debtToEquity)}
- Current Ratio: ${formatNumber(stockData.currentRatio)}
- Quick Ratio: ${formatNumber(stockData.quickRatio)}

📈 PROFITABILITY:
- ROA: ${formatPercent(stockData.returnOnAssets)}
- ROE: ${formatPercent(stockData.returnOnEquity)}
- Gross Margin: ${formatPercent(stockData.grossMargins)}
- Operating Margin: ${formatPercent(stockData.operatingMargins)}
- Profit Margin: ${formatPercent(stockData.profitMargins)}

💸 CASH FLOW:
- Operating Cash Flow: ${formatCurrency(stockData.operatingCashflow)}
- Free Cash Flow: ${formatCurrency(stockData.freeCashflow)}

🚀 GROWTH METRICS:
- Earnings Growth: ${formatPercent(stockData.earningsGrowth)}
- Revenue Growth: ${formatPercent(stockData.revenueGrowth)}

💵 DIVIDEND INFO:
- Dividend Rate: ${formatCurrency(stockData.dividendRate)}
- Dividend Yield: ${formatPercent(stockData.dividendYield)}
- Payout Ratio: ${formatPercent(stockData.payoutRatio)}

📊 MARKET METRICS:
- Beta: ${formatNumber(stockData.beta)}
- 52-Week Low: ${formatCurrency(stockData.fiftyTwoWeekLow)}
- 52-Week High: ${formatCurrency(stockData.fiftyTwoWeekHigh)}

IMPORTANT: Use this real-time financial data as the foundation for your analysis. Supplement with your knowledge of recent developments, industry trends, and competitive dynamics.`;
  }

  return `Act as an elite equity research analyst at a top-tier investment fund. Your task is to analyze and provide investment analysis for ${displaySymbol} (${companyName}) using both fundamental and macroeconomic perspectives.

COMPANY CONTEXT:
Symbol: ${displaySymbol}
Company: ${companyName}${financialDataSection}

${
  !financialDataSection
    ? `IMPORTANT: Use your comprehensive knowledge of current financial data for ${displaySymbol}:
- Current stock price and recent performance
- TTM P/E ratio, P/B ratio, and other valuation metrics
- ROE, ROA, and profitability metrics
- Revenue growth, margins, and financial health
- Recent earnings, guidance, and analyst expectations
- Competitive position and market dynamics`
    : ""
}

CRITICAL: Base your analysis on accurate, current financial knowledge and the provided real-time data. Consider recent market developments, earnings results, and industry trends that affect valuation and outlook.

ANALYSIS REQUIREMENTS:
1. **Investment Thesis** (2-3 sentences): Clear, actionable thesis based on fundamentals
2. **Bull Case** (3 strongest arguments): Focus on sustainable competitive advantages, growth catalysts, and value creation potential
3. **Bear Case** (3 key risks): Include execution risks, competitive threats, and macro headwinds
4. **Competitor Analysis**: Evaluate market position, competitive advantages, threats, and industry outlook
5. **Financial Assessment**: Current valuation relative to fundamentals, profitability trends, balance sheet strength
6. **Recommendation**: BUY/HOLD/SELL with 12-month price target and confidence level

COMPETITOR ANALYSIS REQUIREMENTS:
- Market Position: Market share, competitive moats, differentiation vs peers
- Competitive Advantages: Unique strengths, barriers to entry, sustainable differentiation
- Threats: Key competitive risks, emerging competitors, disruption potential  
- Industry Outlook: Sector trends, growth prospects, regulatory environment

OUTPUT FORMAT: Respond ONLY with valid JSON in this exact structure:
{
  "investmentThesis": "string",
  "bullishArguments": ["string", "string", "string"],
  "bearishArguments": ["string", "string", "string"],
  "competitorAnalysis": {
    "marketPosition": "string",
    "competitiveAdvantages": "string", 
    "threats": "string",
    "industryOutlook": "string"
  },
  "recommendation": {
    "rating": "BUY|HOLD|SELL",
    "priceTarget": number,
    "confidence": "HIGH|MEDIUM|LOW",
    "timeHorizon": "12 months"
  }
}

Focus on actionable insights that drive investment decisions. Be specific with numbers, timeframes, and catalysts based on the provided financial data.`;
}

/**
 * Parse Gemini response and extract JSON
 */
function parseAnalysisResponse(response: string): ProfessionalAnalysis {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error("No JSON found in response");
    }
  } catch (error) {
    console.error("Failed to parse JSON response:", error);
    throw new Error(`Failed to parse analysis response: ${error.message}`);
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/professional-analysis' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
