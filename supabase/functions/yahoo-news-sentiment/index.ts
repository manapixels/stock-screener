import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YahooNewsItem {
  title?: string
  link?: string
  providerPublishTime?: number
  type?: string
  uuid?: string
  publisher?: string
}

interface YahooNewsResponse {
  news?: YahooNewsItem[]
}

interface SentimentAnalysis {
  overall: 'bullish' | 'bearish' | 'neutral'
  score: number
  confidence: number
  reasoning: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const { symbol } = await req.json()

    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol parameter is required' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`📰 Fetching news and sentiment for ${symbol}...`)

    // Get news from Yahoo Finance
    const yahooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    const newsUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&lang=en-US&region=US&quotesCount=1&newsCount=10&listsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&newsQueryId=news_cie_vespa&enableCb=true&enableNavLinks=true&enableEnhancedTrivialQuery=true`
    
    const response = await fetch(newsUrl, { headers: yahooHeaders })

    if (!response.ok) {
      throw new Error('Failed to fetch news from Yahoo Finance')
    }

    const data = await response.json() as YahooNewsResponse
    const newsItems = data.news || []

    // Format news items
    const formattedNews = newsItems.map(item => ({
      title: item.title || 'No title',
      link: item.link || '#',
      providerPublishTime: item.providerPublishTime || Date.now() / 1000,
      type: item.type || 'STORY',
      uuid: item.uuid || Math.random().toString(),
      publisher: item.publisher || 'Yahoo Finance'
    })).slice(0, 5) // Limit to 5 news items

    // Generate basic sentiment analysis based on news titles
    const sentiment = generateBasicSentiment(formattedNews)

    console.log(`✅ Found ${formattedNews.length} news items for ${symbol}, sentiment: ${sentiment.overall}`)

    return new Response(JSON.stringify({
      symbol: symbol.toUpperCase(),
      news: formattedNews,
      sentiment,
      lastUpdated: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('❌ Error fetching stock news and sentiment:', error)
    return new Response(JSON.stringify({
      error: 'Unable to fetch news and sentiment at this time',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function generateBasicSentiment(newsItems: Array<{title: string}>): SentimentAnalysis {
  if (newsItems.length === 0) {
    return {
      overall: 'neutral',
      score: 0.5,
      confidence: 0.3,
      reasoning: 'No recent news available for sentiment analysis'
    }
  }

  // Simple keyword-based sentiment analysis
  const positiveKeywords = ['rises', 'gains', 'up', 'positive', 'growth', 'beats', 'exceeds', 'strong', 'buy', 'upgrade', 'rally']
  const negativeKeywords = ['falls', 'drops', 'down', 'negative', 'decline', 'misses', 'weak', 'sell', 'downgrade', 'crash']

  let positiveCount = 0
  let negativeCount = 0

  newsItems.forEach(item => {
    const title = item.title.toLowerCase()
    positiveKeywords.forEach(keyword => {
      if (title.includes(keyword)) positiveCount++
    })
    negativeKeywords.forEach(keyword => {
      if (title.includes(keyword)) negativeCount++
    })
  })

  const totalSignals = positiveCount + negativeCount
  let overall: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  let score = 0.5
  let confidence = 0.5

  if (totalSignals > 0) {
    score = positiveCount / totalSignals
    confidence = Math.min(0.8, totalSignals / newsItems.length)

    if (score > 0.6) {
      overall = 'bullish'
    } else if (score < 0.4) {
      overall = 'bearish'
    }
  }

  const reasoning = totalSignals === 0 
    ? 'No clear sentiment signals found in recent news headlines'
    : `Analysis of ${newsItems.length} news items shows ${positiveCount} positive and ${negativeCount} negative sentiment indicators`

  return {
    overall,
    score,
    confidence,
    reasoning
  }
} 