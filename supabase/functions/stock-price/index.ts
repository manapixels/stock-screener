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

    // Get daily time series for price changes calculation
    const response = await fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`)
    const data = await response.json()

    if (data.Note) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (data['Error Message']) {
      return new Response(
        JSON.stringify({ error: data['Error Message'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const timeSeries = data['Time Series (Daily)']
    if (!timeSeries) {
      return new Response(
        JSON.stringify({ error: 'No price data available for this symbol' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get sorted dates (most recent first)
    const dates = Object.keys(timeSeries).sort().reverse()
    
    if (dates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No price data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Current price (most recent close)
    const currentPrice = parseFloat(timeSeries[dates[0]]['4. close'])
    
    // Calculate price changes
    const calculateChange = (daysBack: number) => {
      if (dates.length <= daysBack) return { change: 0, changePercent: 0 }
      
      const oldPrice = parseFloat(timeSeries[dates[daysBack]]['4. close'])
      const change = currentPrice - oldPrice
      const changePercent = (change / oldPrice) * 100
      
      return { change: parseFloat(change.toFixed(2)), changePercent: parseFloat(changePercent.toFixed(2)) }
    }

    // Calculate 1D, 1W (5 days), 1M (21 trading days) changes
    const oneDayChange = calculateChange(1)
    const oneWeekChange = calculateChange(5)
    const oneMonthChange = calculateChange(21)

    const result = {
      symbol,
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      currency: 'USD',
      lastUpdated: dates[0],
      changes: {
        oneDay: oneDayChange,
        oneWeek: oneWeekChange,
        oneMonth: oneMonthChange,
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})