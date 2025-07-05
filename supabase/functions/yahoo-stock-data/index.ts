import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface YahooFinanceValue {
  raw?: number;
  fmt?: string;
  longFmt?: string;
}

interface YahooFinanceResponse {
  chart: {
    result: Array<{
      meta: {
        longName?: string;
        regularMarketPrice?: number;
        currency?: string;
        marketCap?: number;
        trailingPE?: number;
        exchangeName?: string;
        quoteType?: string;
        symbol?: string;
      };
      timestamp: number[];
      indicators: {
        quote: Array<{
          high: number[];
          low: number[];
          open: number[];
          close: number[];
          volume: number[];
        }>;
      };
    }>;
    error?: unknown;
  };
}

interface YahooFinancialData {
  currentPrice?: YahooFinanceValue;
  targetHighPrice?: YahooFinanceValue;
  targetLowPrice?: YahooFinanceValue;
  totalCash?: YahooFinanceValue;
  totalDebt?: YahooFinanceValue;
  totalRevenue?: YahooFinanceValue;
  debtToEquity?: YahooFinanceValue;
  currentRatio?: YahooFinanceValue;
  quickRatio?: YahooFinanceValue;
  returnOnAssets?: YahooFinanceValue;
  returnOnEquity?: YahooFinanceValue;
  grossMargins?: YahooFinanceValue;
  operatingMargins?: YahooFinanceValue;
  profitMargins?: YahooFinanceValue;
  operatingCashflow?: YahooFinanceValue;
  freeCashflow?: YahooFinanceValue;
  earningsGrowth?: YahooFinanceValue;
  revenueGrowth?: YahooFinanceValue;
  revenuePerShare?: YahooFinanceValue;
}

interface YahooKeyStatistics {
  trailingPE?: YahooFinanceValue;
  forwardPE?: YahooFinanceValue;
  priceToBook?: YahooFinanceValue;
  pegRatio?: YahooFinanceValue;
  trailingEps?: YahooFinanceValue;
  forwardEps?: YahooFinanceValue;
  bookValue?: YahooFinanceValue;
  marketCap?: YahooFinanceValue;
  sharesOutstanding?: YahooFinanceValue;
  floatShares?: YahooFinanceValue;
  beta?: YahooFinanceValue;
}

interface YahooSummaryDetail {
  trailingPE?: YahooFinanceValue;
  forwardPE?: YahooFinanceValue;
  marketCap?: YahooFinanceValue;
  dividendRate?: YahooFinanceValue;
  dividendYield?: YahooFinanceValue;
  payoutRatio?: YahooFinanceValue;
  beta?: YahooFinanceValue;
  fiftyTwoWeekLow?: YahooFinanceValue;
  fiftyTwoWeekHigh?: YahooFinanceValue;
  priceToSalesTrailing12Months?: YahooFinanceValue;
}

interface YahooAssetProfile {
  sector?: string;
  industry?: string;
  longBusinessSummary?: string;
  country?: string;
  website?: string;
  fullTimeEmployees?: number;
}

interface YahooQuoteSummaryResponse {
  quoteSummary: {
    result: Array<{
      financialData?: YahooFinancialData;
      defaultKeyStatistics?: YahooKeyStatistics;
      summaryDetail?: YahooSummaryDetail;
      assetProfile?: YahooAssetProfile;
    }>;
    error?: unknown;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { symbol } = await req.json();

    if (!symbol) {
      return new Response(JSON.stringify({ error: "Symbol is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Fetching Yahoo Finance data for: ${symbol}`);

    // Fetch historical price data (chart endpoint)
    const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const chartResponse = await fetch(chartUrl);
    const chartData: YahooFinanceResponse = await chartResponse.json();

    if (chartData.chart.error || !chartData.chart.result?.[0]) {
      console.error("Yahoo Finance chart API error:", chartData.chart.error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch stock data from Yahoo Finance",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Fetch comprehensive financial data (quoteSummary endpoint)
    const modules = [
      "financialData",
      "defaultKeyStatistics",
      "summaryDetail",
      "assetProfile",
    ].join(",");

    const quoteSummaryUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
    const quoteSummaryResponse = await fetch(quoteSummaryUrl);
    const quoteSummaryData: YahooQuoteSummaryResponse =
      await quoteSummaryResponse.json();

    const result = chartData.chart.result[0];
    const meta = result.meta;
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    // Get latest price data
    const latestIndex = timestamps.length - 1;
    const currentPrice = quotes.close[latestIndex] || meta.regularMarketPrice;

    // Extract comprehensive financial data from quoteSummary
    const summaryResult = quoteSummaryData.quoteSummary?.result?.[0];
    const financialData = summaryResult?.financialData || {};
    const keyStats = summaryResult?.defaultKeyStatistics || {};
    const summaryDetail = summaryResult?.summaryDetail || {};
    const assetProfile = summaryResult?.assetProfile || {};

    // Helper function to safely extract numeric values
    const extractValue = (
      obj: Record<string, YahooFinanceValue | undefined>,
      key: string,
    ): number | undefined => {
      const value = obj[key];
      if (value && typeof value === "object" && "raw" in value) {
        return value.raw;
      }
      return typeof value === "number" ? value : undefined;
    };

    const stockData = {
      symbol: symbol.toUpperCase(),
      name: meta.longName || symbol.toUpperCase(),
      currentPrice: currentPrice,
      currency: meta.currency || "USD",

      // Market data
      marketCap:
        extractValue(summaryDetail, "marketCap") ||
        extractValue(keyStats, "marketCap") ||
        meta.marketCap,
      volume: quotes.volume[latestIndex],

      // Valuation metrics
      trailingPE:
        extractValue(summaryDetail, "trailingPE") ||
        extractValue(keyStats, "trailingPE") ||
        meta.trailingPE,
      forwardPE:
        extractValue(summaryDetail, "forwardPE") ||
        extractValue(keyStats, "forwardPE"),
      priceToBook: extractValue(keyStats, "priceToBook"),
      priceToSales: extractValue(summaryDetail, "priceToSalesTrailing12Months"),
      pegRatio: extractValue(keyStats, "pegRatio"),

      // Per-share metrics
      earningsPerShare: extractValue(keyStats, "trailingEps"),
      forwardEps: extractValue(keyStats, "forwardEps"),
      bookValuePerShare: extractValue(keyStats, "bookValue"),
      revenuePerShare: extractValue(financialData, "revenuePerShare"),

      // Financial health
      totalRevenue: extractValue(financialData, "totalRevenue"),
      totalCash: extractValue(financialData, "totalCash"),
      totalDebt: extractValue(financialData, "totalDebt"),
      debtToEquity: extractValue(financialData, "debtToEquity"),
      currentRatio: extractValue(financialData, "currentRatio"),
      quickRatio: extractValue(financialData, "quickRatio"),

      // Profitability metrics
      returnOnAssets: extractValue(financialData, "returnOnAssets"),
      returnOnEquity: extractValue(financialData, "returnOnEquity"),
      grossMargins: extractValue(financialData, "grossMargins"),
      operatingMargins: extractValue(financialData, "operatingMargins"),
      profitMargins: extractValue(financialData, "profitMargins"),

      // Cash flow
      operatingCashflow: extractValue(financialData, "operatingCashflow"),
      freeCashflow: extractValue(financialData, "freeCashflow"),

      // Growth metrics
      earningsGrowth: extractValue(financialData, "earningsGrowth"),
      revenueGrowth: extractValue(financialData, "revenueGrowth"),

      // Dividend information
      dividendRate: extractValue(summaryDetail, "dividendRate"),
      dividendYield: extractValue(summaryDetail, "dividendYield"),
      payoutRatio: extractValue(summaryDetail, "payoutRatio"),

      // Market metrics
      beta:
        extractValue(summaryDetail, "beta") || extractValue(keyStats, "beta"),
      fiftyTwoWeekLow: extractValue(summaryDetail, "fiftyTwoWeekLow"),
      fiftyTwoWeekHigh: extractValue(summaryDetail, "fiftyTwoWeekHigh"),

      // Share information
      sharesOutstanding: extractValue(keyStats, "sharesOutstanding"),
      floatShares: extractValue(keyStats, "floatShares"),

      // Business information
      sector: assetProfile.sector,
      industry: assetProfile.industry,

      // Exchange info
      exchange: meta.exchangeName,
      quoteType: meta.quoteType,

      // Price history (last 5 days)
      priceHistory: timestamps
        .slice(-5)
        .map((timestamp, index) => ({
          date: new Date(timestamp * 1000).toISOString().split("T")[0],
          price: quotes.close[quotes.close.length - 5 + index],
          volume: quotes.volume[quotes.volume.length - 5 + index],
        }))
        .filter((day) => day.price !== null),
    };

    console.log(`Successfully fetched comprehensive data for ${symbol}:`, {
      price: stockData.currentPrice,
      pe: stockData.trailingPE,
      marketCap: stockData.marketCap,
      sector: stockData.sector,
      industry: stockData.industry,
    });

    return new Response(JSON.stringify(stockData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in yahoo-stock-data function:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch stock data" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
