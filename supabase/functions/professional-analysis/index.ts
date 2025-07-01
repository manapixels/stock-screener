// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

console.log("Hello from Functions!")

// Simple in-memory cache for Edge Function
const cache = new Map<string, any>()
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

interface ProfessionalAnalysis {
  investmentThesis: string
  bullishArguments: string[]
  bearishArguments: string[]
  financialHighlights: {
    valuation: string
    profitability: string
    financialStrength: string
    dividend: string
  }
  recommendation: {
    rating: string
    priceTarget: number
    timeHorizon: string
    confidence: string
  }
}

interface AnalysisResult {
  symbol: string
  analysis: ProfessionalAnalysis
  currentPrice?: number
  lastUpdated: string
  dataSource: string
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { symbol } = await req.json()

    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol parameter is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    console.log(`🚀 Professional analysis requested for: ${symbol}`)

    // Check cache
    const cacheKey = symbol.toUpperCase()
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 Returning cached analysis for ${symbol}`)
      return new Response(JSON.stringify(cached.data), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const result = await generateProfessionalAnalysis(symbol)
    
    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    })

    console.log(`✅ Professional analysis complete for ${symbol}`)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error(`❌ Error in professional analysis:`, error)
    
    return new Response(JSON.stringify({
      error: 'Unable to generate analysis at this time',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

async function generateProfessionalAnalysis(symbol: string): Promise<AnalysisResult> {
  try {
    // Get financial data
    const financialData = await aggregateFinancialData(symbol)
    if (!financialData) {
      throw new Error('Failed to fetch financial data')
    }

    // Generate analysis with Gemini
    const analysis = await generateWithGemini(symbol, financialData)
    
    return {
      symbol,
      analysis,
      currentPrice: financialData?.quote?.price || undefined,
      lastUpdated: new Date().toISOString(),
      dataSource: 'Financial Modeling Prep + Gemini 2.5 Flash'
    }
  } catch (error) {
    console.error(`❌ Error generating analysis for ${symbol}:`, error)
    
    // Return fallback analysis
    const fallbackAnalysis = generateFallbackAnalysis(symbol)
    return {
      symbol,
      analysis: fallbackAnalysis,
      currentPrice: undefined, // No current price available for fallback
      lastUpdated: new Date().toISOString(),
      dataSource: 'Fallback Analysis'
    }
  }
}

async function aggregateFinancialData(symbol: string) {
  const apiKey = Deno.env.get('FINANCIAL_MODELING_PREP_API_KEY')
  
  if (!apiKey) {
    throw new Error('Financial Modeling Prep API key not configured')
  }

  try {
    console.log(`📊 Fetching financial data for ${symbol}...`)
    
    // Get multiple data points in parallel
    const [profile, ratios, metrics, quote] = await Promise.allSettled([
      fetchFMPData(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`),
      fetchFMPData(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?apikey=${apiKey}&limit=1`),
      fetchFMPData(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?apikey=${apiKey}&limit=1`),
      fetchFMPData(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`)
    ])

    return {
      profile: profile.status === 'fulfilled' ? profile.value?.[0] : null,
      ratios: ratios.status === 'fulfilled' ? ratios.value?.[0] : null,
      metrics: metrics.status === 'fulfilled' ? metrics.value?.[0] : null,
      quote: quote.status === 'fulfilled' ? quote.value?.[0] : null
    }
  } catch (error) {
    console.error('❌ Error aggregating financial data:', error)
    return null
  }
}

async function fetchFMPData(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  return await response.json()
}

async function generateWithGemini(symbol: string, financialData: any): Promise<ProfessionalAnalysis> {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
  
  if (!geminiApiKey) {
    throw new Error('Gemini API key not configured')
  }

  const prompt = buildAnalysisPrompt(symbol, financialData)
  
  console.log('🤖 Calling Gemini API...')
  
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.8,
          maxOutputTokens: 2048,
        }
      })
    }
  )

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  const analysisText = data.candidates?.[0]?.content?.parts?.[0]?.text

  if (!analysisText) {
    throw new Error('No analysis generated by Gemini')
  }

  return parseAnalysisResponse(analysisText)
}

function buildAnalysisPrompt(symbol: string, data: any): string {
  const { profile, ratios, metrics, quote } = data
  
  const displaySymbol = symbol.toUpperCase()
  const companyName = profile?.companyName || displaySymbol
  
  return `You are a senior equity research analyst at Goldman Sachs Asia. Generate a professional investment analysis for ${displaySymbol} (${companyName}).

COMPANY PROFILE:
Company: ${companyName}
Symbol: ${displaySymbol}
Sector: ${profile?.sector || 'Financial Services'}
Market Cap: ${profile?.mktCap ? '$' + (profile.mktCap / 1000000).toFixed(0) + 'M' : 'N/A'}

CURRENT VALUATION:
Price: ${quote?.price ? '$' + quote.price.toFixed(2) : 'N/A'}
P/E Ratio: ${ratios?.priceEarningsRatio?.toFixed(1) || 'N/A'}x
P/B Ratio: ${ratios?.priceToBookRatio?.toFixed(1) || 'N/A'}x

PROFITABILITY:
ROE: ${ratios?.returnOnEquity ? (ratios.returnOnEquity * 100).toFixed(1) + '%' : 'N/A'}
ROA: ${ratios?.returnOnAssets ? (ratios.returnOnAssets * 100).toFixed(1) + '%' : 'N/A'}

Generate analysis in JSON format:
{
  "investmentThesis": "Brief 1-2 sentence thesis",
  "bullishArguments": ["3 specific bullish points"],
  "bearishArguments": ["3 specific bearish points"],
  "financialHighlights": {
    "valuation": "P/E and P/B summary",
    "profitability": "ROE/ROA summary", 
    "financialStrength": "Balance sheet summary",
    "dividend": "Dividend yield and sustainability"
  },
  "recommendation": {
    "rating": "BUY/HOLD/SELL",
    "priceTarget": 15.50,
    "timeHorizon": "12 months",
    "confidence": "HIGH/MEDIUM/LOW"
  }
}`
}

function parseAnalysisResponse(response: string): ProfessionalAnalysis {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
    throw new Error('No JSON found in response')
  } catch (error) {
    console.error('Error parsing Gemini response:', error)
    throw new Error('Failed to parse analysis response')
  }
}



function generateFallbackAnalysis(symbol: string): ProfessionalAnalysis {
  return {
    investmentThesis: `${symbol} represents a Financial Services investment opportunity with mixed fundamental signals requiring careful evaluation of risk-adjusted returns.`,
    bullishArguments: [
      "Established market position in regional banking sector",
      "Potential for fee income growth and digital transformation",
      "Regulatory environment provides operational stability"
    ],
    bearishArguments: [
      "Interest rate environment creates margin pressure challenges",
      "Economic uncertainty affects loan growth prospects", 
      "Technology disruption requires significant capital investment"
    ],
    financialHighlights: {
      valuation: "Trading at sector-average multiples with limited visibility",
      profitability: "Profitability metrics within industry range",
      financialStrength: "Adequate capital ratios meeting regulatory requirements",
      dividend: "Dividend policy subject to earnings volatility and regulatory requirements"
    },
    recommendation: {
      rating: "HOLD",
      priceTarget: 15.00,
      timeHorizon: "12 months", 
      confidence: "MEDIUM"
    }
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
