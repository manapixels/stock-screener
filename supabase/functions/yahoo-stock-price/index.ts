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

    console.log(`Fetching price data for ${symbol} from Yahoo Finance...`)

    // Get 1 month of daily data for price changes calculation
    const yahooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`, { headers: yahooHeaders })
    
    if (!response.ok) {
      // Fall back to Alpha Vantage
      console.log('Yahoo Finance failed, falling back to Alpha Vantage...')
      const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY')
      if (apiKey) {
        const alphaResponse = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`)
        const alphaData = await alphaResponse.json()
        
        if (alphaData['Time Series (Daily)']) {
          return Response.redirect(`${new URL(req.url).origin}/functions/v1/stock-price`, 307)
        }
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch price data from both Yahoo Finance and Alpha Vantage' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) {
      return new Response(
        JSON.stringify({ error: 'No price data available for this symbol' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const timestamps = result.timestamp || []
    const quotes = result.indicators?.quote?.[0] || {}
    const closes = quotes.close || []
    
    if (timestamps.length === 0 || closes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No price data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Current price (most recent)
    const currentPrice = closes[closes.length - 1]
    const currentDate = new Date(timestamps[timestamps.length - 1] * 1000).toISOString().split('T')[0]
    
    // Calculate price changes
    const calculateChange = (daysBack: number) => {
      const targetIndex = closes.length - 1 - daysBack
      if (targetIndex < 0 || !closes[targetIndex]) return { change: 0, changePercent: 0 }
      
      const oldPrice = closes[targetIndex]
      const change = currentPrice - oldPrice
      const changePercent = (change / oldPrice) * 100
      
      return { 
        change: parseFloat(change.toFixed(2)), 
        changePercent: parseFloat(changePercent.toFixed(2)) 
      }
    }

    // Calculate 1D, 1W (5 days), 1M (21 trading days) changes
    const oneDayChange = calculateChange(1)
    const oneWeekChange = calculateChange(5)
    const oneMonthChange = calculateChange(Math.min(21, closes.length - 1))

    const priceResult = {
      symbol,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      currency: result.meta?.currency || 'USD',
      lastUpdated: currentDate,
      changes: {
        oneDay: oneDayChange,
        oneWeek: oneWeekChange,
        oneMonth: oneMonthChange,
      },
      source: 'yahoo'
    }

    return new Response(
      JSON.stringify(priceResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching stock price:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})