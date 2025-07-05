import {
  ProfessionalAnalysis,
  AnalysisResult,
  AnalysisError,
} from "../types/analysis";
import { analysisCache } from "./analysis-cache";

/**
 * Generate professional analysis for a stock symbol
 * Checks cache first, then generates new analysis if needed
 */
export async function generateProfessionalAnalysis(
  symbol: string,
): Promise<AnalysisResult | AnalysisError> {
  try {
    console.log(`🚀 Starting analysis for ${symbol}...`);

    // Check cache first
    const cached = analysisCache.get(symbol);
    if (cached) {
      console.log(`📦 Returning cached analysis for ${symbol}`);
      return cached;
    }

    // Generate analysis with Gemini (no external financial data needed)
    const analysis = await generateWithGemini(symbol);

    const result: AnalysisResult = {
      symbol,
      analysis,
      lastUpdated: new Date().toISOString(),
      dataSource: "Gemini 2.5 Flash",
    };

    // Cache the result
    analysisCache.set(symbol, result);

    console.log(`✅ Analysis completed for ${symbol}`);
    return result;
  } catch (error) {
    console.error(`❌ Error generating analysis for ${symbol}:`, error);

    // Return error with fallback analysis
    const fallbackAnalysis = generateFallbackAnalysis(symbol);
    const fallbackResult: AnalysisResult = {
      symbol,
      analysis: fallbackAnalysis,
      lastUpdated: new Date().toISOString(),
      dataSource: "Fallback Analysis",
    };

    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
      details: "Analysis generated using fallback method due to API failure",
      fallback: true,
      ...fallbackResult,
    } as AnalysisError & AnalysisResult;
  }
}

/**
 * Generate analysis using Gemini API
 */
async function generateWithGemini(
  symbol: string,
): Promise<ProfessionalAnalysis> {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    throw new Error("Gemini API key not configured");
  }

  const prompt = buildAnalysisPrompt(symbol);

  console.log("🤖 Calling Gemini API...");

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
          maxOutputTokens: 4096,
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
    console.error(`Gemini API error: ${response.status} - ${errorData}`);
    throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
  }

  const data = await response.json();

  // Enhanced debugging
  console.log(`Gemini API response structure:`, {
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
      `Content blocked by Gemini safety filters:`,
      data.candidates[0].safetyRatings,
    );
    throw new Error(
      "Content blocked by Gemini safety filters. Using fallback analysis.",
    );
  }

  // Check for token limit exceeded
  if (data.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    console.error(`Gemini hit token limit. Response was truncated.`);
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
      `Gemini finished with reason: ${data.candidates[0].finishReason}`,
    );
  }

  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!analysisText) {
    console.error(`No analysis text returned from Gemini.`);
    console.error(`Full API response:`, JSON.stringify(data, null, 2));
    throw new Error("No content returned from Gemini API.");
  }

  console.log(`Gemini response received, length: ${analysisText.length}`);

  return parseAnalysisResponse(analysisText);
}

/**
 * Build comprehensive analysis prompt for Gemini
 */
function buildAnalysisPrompt(symbol: string): string {
  const displaySymbol = symbol.toUpperCase();
  const companyName = displaySymbol;

  return `Act as an elite equity research analyst at a top-tier investment fund. Your task is to analyze and provide investment analysis for ${displaySymbol} (${companyName}) using both fundamental and macroeconomic perspectives.

COMPANY CONTEXT:
Symbol: ${displaySymbol}
Company: ${companyName}
Sector: Please identify the sector

IMPORTANT: Use your knowledge of current financial data for ${displaySymbol}:
- Current stock price and recent performance
- TTM P/E ratio, P/B ratio, and other valuation metrics
- ROE, ROA, and profitability metrics
- Revenue growth, margins, and financial health
- Recent earnings, guidance, and business developments
- Market cap and financial position

Analyze this company's competitive position within its industry sector. Consider market share, moats, competitive dynamics, and industry trends.

Respond with valid JSON only:
{
  "investmentThesis": "Brief investment summary in 1-2 sentences, providing current data when appropriate",
  "bullishArguments": ["Positive factor 1 with current context", "Positive factor 2 with current context", "Positive factor 3 with current context"],
  "bearishArguments": ["Risk factor 1 with current context", "Risk factor 2 with current context", "Risk factor 3 with current context"],
  "financialHighlights": {
    "valuation": "Current valuation assessment with specific P/E, P/B ratios and market cap",
    "profitability": "Current profitability summary with ROE, margins, and growth rates", 
    "financialStrength": "Current financial health including debt levels, cash position, and cash flow",
    "dividend": "Current dividend yield and sustainability analysis (if applicable)"
  },
  "competitorAnalysis": {
    "marketPosition": "Company's current position in the industry with market share context and recent developments",
    "competitiveAdvantages": ["Current competitive advantage 1", "Current competitive advantage 2", "Current competitive advantage 3"],
    "threats": ["Current competitive threat 1", "Current competitive threat 2", "Current competitive threat 3"],
    "industryOutlook": "Current industry growth prospects, recent trends, and regulatory environment"
  },
  "recommendation": {
    "rating": "BUY/HOLD/SELL/STRONG_BUY/STRONG_SELL",
    "priceTarget": 25.0,
    "timeHorizon": "12 months",
    "confidence": "LOW/MEDIUM/HIGH"
  }
}`;
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
    }
    throw new Error("No JSON found in response");
  } catch (error) {
    console.error(
      "Error parsing Gemini response:",
      error instanceof Error ? error.message : String(error),
    );
    console.log("Raw Gemini response:", response);
    throw new Error("Failed to parse analysis response");
  }
}

/**
 * Generate fallback analysis when APIs fail
 */
function generateFallbackAnalysis(symbol: string): ProfessionalAnalysis {
  return {
    investmentThesis: `${symbol} represents a Financial Services investment opportunity with mixed fundamental signals requiring careful evaluation of risk-adjusted returns.`,
    bullishArguments: [
      "Established market position in regional banking sector",
      "Potential for fee income growth and digital transformation",
      "Regulatory environment provides operational stability",
    ],
    bearishArguments: [
      "Interest rate environment creates margin pressure challenges",
      "Economic uncertainty affects loan growth prospects",
      "Technology disruption requires significant capital investment",
    ],
    financialHighlights: {
      valuation: "Trading at sector-average multiples with limited visibility",
      profitability: "Profitability metrics within industry range",
      financialStrength:
        "Adequate capital ratios meeting regulatory requirements",
      dividend:
        "Dividend policy subject to earnings volatility and regulatory requirements",
    },
    competitorAnalysis: {
      marketPosition:
        "Mid-tier player in competitive landscape with regional focus and established customer relationships",
      competitiveAdvantages: [
        "Local market knowledge and customer relationships",
        "Regulatory compliance expertise and established operations",
        "Digital banking capabilities and technology infrastructure",
      ],
      threats: [
        "Larger competitors with greater scale and resources",
        "Fintech disruption in traditional banking services",
        "Economic downturns affecting loan portfolio quality",
      ],
      industryOutlook:
        "Financial services sector facing transformation with digital disruption and regulatory changes creating both opportunities and challenges",
    },
    recommendation: {
      rating: "HOLD",
      priceTarget: 15.0,
      timeHorizon: "12 months",
      confidence: "MEDIUM",
    },
  };
}
