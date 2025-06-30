import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NewsItem {
  title: string
  link: string
  providerPublishTime: number
  type: string
  uuid: string
  relatedTickers?: string[]
}

interface SentimentAnalysis {
  overall: 'bullish' | 'bearish' | 'neutral'
  score: number // -1 to 1, where -1 is very bearish, 1 is very bullish
  confidence: number // 0 to 1
  reasoning: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { symbol } = await req.json()
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching news and sentiment for ${symbol}...`)

    // Fetch news from Yahoo Finance
    const news = await fetchYahooNews(symbol)
    
    // Perform sentiment analysis on the news
    const sentimentAnalysis = await analyzeSentiment(news, symbol)

    const result = {
      symbol,
      news: news.slice(0, 5), // Return top 5 news items
      sentiment: sentimentAnalysis,
      lastUpdated: new Date().toISOString()
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching news and sentiment:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function fetchYahooNews(symbol: string): Promise<NewsItem[]> {
  const yahooHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }

  try {
    // Yahoo Finance news endpoint
    const response = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${symbol}&lang=en-US&region=US&quotesCount=1&newsCount=10`,
      { headers: yahooHeaders }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch news from Yahoo Finance')
    }

    const data = await response.json()
    return data.news || []
  } catch (error) {
    console.error('Error fetching Yahoo news:', error)
    return []
  }
}

async function analyzeSentiment(news: NewsItem[], symbol: string): Promise<SentimentAnalysis> {
  if (!news.length) {
    return {
      overall: 'neutral',
      score: 0,
      confidence: 0,
      reasoning: 'No recent news available for sentiment analysis'
    }
  }

  // Extract headlines for analysis
  const headlines = news.slice(0, 10).map(item => item.title).join('. ')
  
  // Simple sentiment analysis based on keywords
  const sentimentScore = calculateSimpleSentiment(headlines)
  
  let overall: 'bullish' | 'bearish' | 'neutral'
  let reasoning = ''
  
  if (sentimentScore >= 0.2) {
    overall = 'bullish'
    reasoning = 'Recent news contains predominantly positive sentiment with bullish indicators'
  } else if (sentimentScore <= -0.2) {
    overall = 'bearish'
    reasoning = 'Recent news shows negative sentiment with bearish indicators'
  } else {
    overall = 'neutral'
    reasoning = 'Mixed or neutral sentiment in recent news coverage'
  }

  return {
    overall,
    score: Math.max(-1, Math.min(1, sentimentScore)), // Clamp between -1 and 1
    confidence: Math.min(0.8, news.length * 0.1), // Higher confidence with more news
    reasoning
  }
}

function calculateSimpleSentiment(text: string): number {
  const bullishWords = [
    'growth', 'profit', 'gains', 'rise', 'surge', 'bullish', 'positive', 'strong',
    'beat', 'exceed', 'outperform', 'upgrade', 'buy', 'soar', 'rally', 'boom',
    'breakthrough', 'success', 'expansion', 'milestone', 'record', 'high',
    'promising', 'optimistic', 'confident', 'robust', 'solid', 'impressive'
  ]
  
  const bearishWords = [
    'loss', 'decline', 'fall', 'drop', 'bearish', 'negative', 'weak',
    'miss', 'underperform', 'downgrade', 'sell', 'plunge', 'crash', 'slump',
    'concern', 'worry', 'risk', 'warning', 'caution', 'struggling', 'challenges',
    'problems', 'issues', 'disappointing', 'poor', 'cut', 'reduce', 'layoffs'
  ]

  const words = text.toLowerCase().split(/\W+/)
  let score = 0
  let totalWords = 0

  words.forEach(word => {
    if (bullishWords.includes(word)) {
      score += 1
      totalWords += 1
    } else if (bearishWords.includes(word)) {
      score -= 1
      totalWords += 1
    }
  })

  // Normalize score
  return totalWords > 0 ? score / Math.max(totalWords, 5) : 0
}