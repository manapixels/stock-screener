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
    const { keywords } = await req.json()
    
    if (!keywords) {
      return new Response(
        JSON.stringify({ error: 'Keywords parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Searching for "${keywords}" using Yahoo Finance...`)

    // Yahoo Finance search endpoint
    const yahooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }

    try {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(keywords)}&lang=en-US&region=US&quotesCount=10&newsCount=0`,
        { headers: yahooHeaders }
      )

      if (!response.ok) {
        throw new Error('Yahoo Finance search failed')
      }

      const data = await response.json()
      
      // Transform Yahoo data to standard format
      const bestMatches = data.quotes?.map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        type: quote.quoteType === 'EQUITY' ? 'Equity' : quote.quoteType || 'Unknown',
        region: quote.region || 'United States',
        marketOpen: '09:30',
        marketClose: '16:00', 
        timezone: quote.gmtOffSetMilliseconds ? `UTC${quote.gmtOffSetMilliseconds / 3600000}` : 'UTC-04',
        currency: quote.currency || 'USD',
        matchScore: '1.0000'
      })) || []

      // Filter to only include valid stocks
      const validMatches = bestMatches.filter((match: any) => 
        match.symbol && 
        match.type.toLowerCase().includes('equity') || 
        match.type.toLowerCase().includes('stock') ||
        match.type === 'Unknown'
      ).slice(0, 8) // Limit to 8 results

      console.log(`Found ${validMatches.length} matches from Yahoo Finance`)

      return new Response(
        JSON.stringify({ bestMatches: validMatches }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } catch (yahooError) {
      console.error('Yahoo Finance search failed:', yahooError)
      return new Response(
        JSON.stringify({ error: 'Search failed - no results available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Search error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})