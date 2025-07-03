// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

console.log("Hello from Functions!");

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query parameter is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log(`🔍 Stock search requested for: ${query}`);

    const results = await searchStocks(query);

    console.log(`✅ Stock search complete for: ${query}`);
    return new Response(JSON.stringify({ quotes: results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`❌ Error in stock search:`, error);

    return new Response(
      JSON.stringify({
        error: "Unable to search stocks at this time",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});

async function searchStocks(query: string) {
  const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");

  if (!rapidApiKey) {
    console.log("RapidAPI key not configured, using fallback search");
    return generateFallbackResults(query);
  }

  try {
    console.log("🔍 Searching with Yahoo Finance API...");

    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/search?search=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "yahoo-finance15.p.rapidapi.com",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.body && Array.isArray(data.body)) {
      return data.body
        .map((item: any) => ({
          symbol: item.symbol || "N/A",
          name: item.name || item.longName || "N/A",
          exchange: item.exchange || item.fullExchangeName || "N/A",
          type: item.type || item.quoteType || "stock",
        }))
        .slice(0, 10);
    }

    return [];
  } catch (error) {
    console.error("Error with Yahoo Finance API:", error);
    return generateFallbackResults(query);
  }
}

function generateFallbackResults(query: string) {
  console.log("🔄 Generating fallback search results...");

  const lowerQuery = query.toLowerCase();

  // Common stock mappings for fallback
  const stockMappings = [
    {
      keywords: ["apple", "aapl"],
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
    },
    {
      keywords: ["microsoft", "msft"],
      symbol: "MSFT",
      name: "Microsoft Corporation",
      exchange: "NASDAQ",
    },
    {
      keywords: ["google", "alphabet", "googl"],
      symbol: "GOOGL",
      name: "Alphabet Inc.",
      exchange: "NASDAQ",
    },
    {
      keywords: ["amazon", "amzn"],
      symbol: "AMZN",
      name: "Amazon.com Inc.",
      exchange: "NASDAQ",
    },
    {
      keywords: ["tesla", "tsla"],
      symbol: "TSLA",
      name: "Tesla Inc.",
      exchange: "NASDAQ",
    },
    {
      keywords: ["nvidia", "nvda"],
      symbol: "NVDA",
      name: "NVIDIA Corporation",
      exchange: "NASDAQ",
    },
    {
      keywords: ["meta", "facebook", "meta"],
      symbol: "META",
      name: "Meta Platforms Inc.",
      exchange: "NASDAQ",
    },
    {
      keywords: ["netflix", "nflx"],
      symbol: "NFLX",
      name: "Netflix Inc.",
      exchange: "NASDAQ",
    },
    {
      keywords: ["ocbc", "o39"],
      symbol: "O39.SI",
      name: "OCBC Bank",
      exchange: "Singapore",
    },
    {
      keywords: ["dbs", "d05"],
      symbol: "D05.SI",
      name: "DBS Group Holdings Ltd",
      exchange: "Singapore",
    },
    {
      keywords: ["uob", "u11"],
      symbol: "U11.SI",
      name: "United Overseas Bank Ltd",
      exchange: "Singapore",
    },
    {
      keywords: ["singtel", "z74"],
      symbol: "Z74.SI",
      name: "Singapore Telecommunications Limited",
      exchange: "Singapore",
    },
    {
      keywords: ["keppel", "bn4"],
      symbol: "BN4.SI",
      name: "Keppel Corporation Limited",
      exchange: "Singapore",
    },
  ];

  const matches = stockMappings.filter((stock) =>
    stock.keywords.some(
      (keyword) => lowerQuery.includes(keyword) || keyword.includes(lowerQuery),
    ),
  );

  if (matches.length > 0) {
    return matches.map((stock) => ({
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      type: "stock",
    }));
  }

  // If no matches, create a generic result
  return [
    {
      symbol: query.toUpperCase(),
      name: `${query.toUpperCase()} - Symbol Search Result`,
      exchange: "Unknown",
      type: "stock",
    },
  ];
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/yahoo-stock-search' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
