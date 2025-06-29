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

    console.log(`Fetching simple data for ${symbol}...`)

    // Get basic chart data from Yahoo Finance (1 year for maximum data)
    const yahooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1y`, 
      { headers: yahooHeaders }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch from Yahoo Finance')
    }

    const data = await response.json()
    const result = data.chart?.result?.[0]
    
    if (!result) {
      throw new Error('No data found for symbol')
    }

    // Get basic info
    const meta = result.meta
    const timestamps = result.timestamp || []
    const quotes = result.indicators?.quote?.[0] || {}
    const closes = quotes.close || []
    
    // Current price
    const currentPrice = closes[closes.length - 1] || meta?.regularMarketPrice || 0
    
    // Create simplified overview data for analysis
    const overview = {
      Symbol: symbol.toUpperCase(),
      Name: meta?.longName || symbol.toUpperCase(),
      PERatio: meta?.trailingPE?.toString() || 'None',
      EPS: '5.00', // Placeholder - Yahoo Finance doesn't provide this in chart endpoint
      BookValue: '50.00', // Placeholder
      PriceToBookRatio: '2.0', // Placeholder
      ReturnOnEquityTTM: '0.25', // Placeholder
      DebtToEquityRatio: '0.3', // Placeholder
      MarketCapitalization: meta?.marketCap?.toString() || 'None',
      Sector: 'Technology', // Placeholder
      Industry: 'Consumer Electronics' // Placeholder
    }

    // Create time series data
    const timeSeriesData: any = {}
    timestamps.forEach((timestamp: number, index: number) => {
      const date = new Date(timestamp * 1000).toISOString().split('T')[0]
      timeSeriesData[date] = {
        '1. open': quotes.open?.[index]?.toString() || '0',
        '2. high': quotes.high?.[index]?.toString() || '0',
        '3. low': quotes.low?.[index]?.toString() || '0',
        '4. close': quotes.close?.[index]?.toString() || '0',
        '5. volume': quotes.volume?.[index]?.toString() || '0'
      }
    })

    const result_data = {
      overview,
      daily_data: {
        'Time Series (Daily)': timeSeriesData
      },
      currentPrice,
      currency: meta?.currency || 'USD',
      source: 'yahoo-simple'
    }

    console.log(`Successfully created simple data for ${symbol}, price: ${currentPrice}`)

    return new Response(
      JSON.stringify(result_data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in simple stock data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})