import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface YahooNewsItem {
  title?: string;
  link?: string;
  providerPublishTime?: number;
  type?: string;
  uuid?: string;
  publisher?: string;
  summary?: string;
}

interface YahooNewsResponse {
  news?: YahooNewsItem[];
  stream?: YahooNewsItem[];
}

interface SentimentAnalysis {
  overall: "bullish" | "bearish" | "neutral";
  score: number;
  confidence: number;
  reasoning: string;
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

    console.log(`📰 Fetching news and sentiment for ${symbol}...`);

    // Get news from Yahoo Finance using the correct news endpoint
    const yahooHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    // Use the correct Yahoo Finance news endpoint that filters by symbol
    const newsEndpoints = [
      `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol.toUpperCase()}&modules=news&count=10`,
      `https://query2.finance.yahoo.com/v1/finance/search?q=${symbol.toUpperCase()}&modules=news&count=10`,
    ];

    let response: Response | null = null;
    let lastError: Error | null = null;

    // Try each endpoint until one works
    for (const newsUrl of newsEndpoints) {
      try {
        console.log(`📰 Trying endpoint: ${newsUrl}`);
        response = await fetch(newsUrl, { headers: yahooHeaders });

        if (response.ok) {
          console.log(`✅ Successfully fetched from: ${newsUrl}`);
          break;
        } else {
          console.log(`❌ Failed endpoint (${response.status}): ${newsUrl}`);
          lastError = new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error with endpoint: ${newsUrl}`, error);
        lastError = error instanceof Error ? error : new Error("Unknown error");
        response = null;
      }
    }

    if (!response || !response.ok) {
      throw lastError || new Error("All news endpoints failed");
    }

    const data = (await response.json()) as YahooNewsResponse;
    console.log(`📊 Raw response structure:`, Object.keys(data));

    // Yahoo Finance news endpoint returns items in 'stream' property
    const newsItems = data.stream || data.news || [];
    console.log(`📰 Found ${newsItems.length} raw news items`);

    if (newsItems.length === 0) {
      console.log(
        "⚠️ No news items found in response:",
        JSON.stringify(data, null, 2),
      );
    }

    // Format news items
    const formattedNews = newsItems
      .map((item) => ({
        title: item.title || "No title",
        link: item.link || "#",
        providerPublishTime: item.providerPublishTime || Date.now() / 1000,
        type: item.type || "STORY",
        uuid: item.uuid || Math.random().toString(),
        publisher: item.publisher || "Yahoo Finance",
        summary: item.summary || "",
      }))
      .slice(0, 5); // Limit to 5 news items

    console.log(
      `📰 Formatted news titles:`,
      formattedNews.map((n) => n.title),
    );

    // Generate basic sentiment analysis based on news titles
    const sentiment = generateBasicSentiment(formattedNews);

    console.log(
      `✅ Found ${formattedNews.length} news items for ${symbol}, sentiment: ${sentiment.overall}`,
    );

    return new Response(
      JSON.stringify({
        symbol: symbol.toUpperCase(),
        news: formattedNews,
        sentiment,
        lastUpdated: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Error fetching stock news and sentiment:", error);
    return new Response(
      JSON.stringify({
        error: "Unable to fetch news and sentiment at this time",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

function generateBasicSentiment(
  newsItems: Array<{ title: string }>,
): SentimentAnalysis {
  if (newsItems.length === 0) {
    return {
      overall: "neutral",
      score: 0.5,
      confidence: 0.3,
      reasoning: "No recent news available for sentiment analysis",
    };
  }

  // Simple keyword-based sentiment analysis
  const positiveKeywords = [
    "rises",
    "gains",
    "up",
    "positive",
    "growth",
    "beats",
    "exceeds",
    "strong",
    "buy",
    "upgrade",
    "rally",
  ];
  const negativeKeywords = [
    "falls",
    "drops",
    "down",
    "negative",
    "decline",
    "misses",
    "weak",
    "sell",
    "downgrade",
    "crash",
  ];

  let positiveCount = 0;
  let negativeCount = 0;

  newsItems.forEach((item) => {
    const title = item.title.toLowerCase();
    positiveKeywords.forEach((keyword) => {
      if (title.includes(keyword)) positiveCount++;
    });
    negativeKeywords.forEach((keyword) => {
      if (title.includes(keyword)) negativeCount++;
    });
  });

  const totalSignals = positiveCount + negativeCount;
  let overall: "bullish" | "bearish" | "neutral" = "neutral";
  let score = 0.5;
  let confidence = 0.5;

  if (totalSignals > 0) {
    score = positiveCount / totalSignals;
    confidence = Math.min(0.8, totalSignals / newsItems.length);

    if (score > 0.6) {
      overall = "bullish";
    } else if (score < 0.4) {
      overall = "bearish";
    }
  }

  const reasoning =
    totalSignals === 0
      ? "No clear sentiment signals found in recent news headlines"
      : `Analysis of ${newsItems.length} news items shows ${positiveCount} positive and ${negativeCount} negative sentiment indicators`;

  return {
    overall,
    score,
    confidence,
    reasoning,
  };
}
