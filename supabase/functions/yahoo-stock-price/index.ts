import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface YahooQuoteMeta {
  regularMarketPrice?: number;
  previousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  currency?: string;
  exchangeName?: string;
  longName?: string;
  shortName?: string;
}

interface YahooQuoteIndicators {
  quote?: Array<{
    close?: number[];
    high?: number[];
    low?: number[];
    open?: number[];
    volume?: number[];
  }>;
}

interface YahooQuoteResult {
  meta?: YahooQuoteMeta;
  timestamp?: number[];
  indicators?: YahooQuoteIndicators;
}

interface YahooQuoteResponse {
  chart?: {
    result?: YahooQuoteResult[];
  };
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
    const { symbol } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: "Symbol parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`📈 Fetching price data for ${symbol}...`);

    const yahooHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    // Fetch current price and 1-month historical data for trend analysis
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`,
      { headers: yahooHeaders },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch from Yahoo Finance");
    }

    const data = (await response.json()) as YahooQuoteResponse;
    const result = data.chart?.result?.[0];

    if (!result || !result.meta) {
      throw new Error("No price data found for symbol");
    }

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];

    const currentPrice =
      meta.regularMarketPrice || closes[closes.length - 1] || 0;
    const previousClose = meta.previousClose || currentPrice;

    // Calculate changes for different periods
    const oneDayChange =
      meta.regularMarketChange || currentPrice - previousClose;
    const oneDayChangePercent =
      meta.regularMarketChangePercent || (oneDayChange / previousClose) * 100;

    // Calculate 1-week change (5-7 trading days ago)
    let oneWeekChange = 0;
    let oneWeekChangePercent = 0;
    if (closes.length >= 7) {
      const oneWeekPrice = closes[Math.max(0, closes.length - 7)];
      if (oneWeekPrice && oneWeekPrice > 0) {
        oneWeekChange = currentPrice - oneWeekPrice;
        oneWeekChangePercent = (oneWeekChange / oneWeekPrice) * 100;
      }
    }

    // Calculate 1-month change (20-22 trading days ago)
    let oneMonthChange = 0;
    let oneMonthChangePercent = 0;
    if (closes.length >= 20) {
      const oneMonthPrice = closes[Math.max(0, closes.length - 22)];
      if (oneMonthPrice && oneMonthPrice > 0) {
        oneMonthChange = currentPrice - oneMonthPrice;
        oneMonthChangePercent = (oneMonthChange / oneMonthPrice) * 100;
      }
    }

    const priceData = {
      symbol: symbol.toUpperCase(),
      name: meta.longName || meta.shortName || symbol.toUpperCase(),
      price: currentPrice,
      change: oneDayChange,
      changePercent: oneDayChangePercent,
      previousClose: previousClose,
      currency: meta.currency || "USD",
      exchange: meta.exchangeName || "Unknown",
      // Additional historical changes
      oneWeekChange,
      oneWeekChangePercent,
      oneMonthChange,
      oneMonthChangePercent,
      lastUpdated: new Date().toISOString(),
    };

    console.log(
      `✅ Price data for ${symbol}: $${currentPrice.toFixed(2)} (1D: ${oneDayChange >= 0 ? "+" : ""}${oneDayChange.toFixed(2)})`,
    );

    return new Response(JSON.stringify(priceData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("❌ Error fetching stock price:", error);
    return new Response(
      JSON.stringify({
        error: "Unable to fetch stock price at this time",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
