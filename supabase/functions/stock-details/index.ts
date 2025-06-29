import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY')
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Alpha Vantage API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch multiple data sources in parallel
    const [overview, earnings, dailyData, rsi, bbands, newsSentiment] = await Promise.all([
      fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`),
      fetch(`https://www.alphavantage.co/query?function=EARNINGS&symbol=${symbol}&apikey=${apiKey}`),
      fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`),
      fetch(`https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${apiKey}`),
      fetch(`https://www.alphavantage.co/query?function=BBANDS&symbol=${symbol}&interval=daily&time_period=20&series_type=close&apikey=${apiKey}`),
      fetch(`https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&apikey=${apiKey}`)
    ])

    const data = {
      overview: await overview.json(),
      earnings: await earnings.json(),
      daily_data: await dailyData.json(),
      rsi: await rsi.json(),
      bbands: await bbands.json(),
      news_sentiment: await newsSentiment.json(),
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})