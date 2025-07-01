interface YahooQuote {
  symbol: string
  shortname?: string
  longname?: string
  exchDisp?: string
  exchange?: string
  quoteType?: string
  region?: string
}

interface YahooSearchResponse {
  quotes?: YahooQuote[]
}

export async function POST(request: Request) {
  try {
    const { keywords } = await request.json()

    if (!keywords) {
      return Response.json({ error: 'Keywords parameter is required' }, { status: 400 })
    }

    console.log(`Searching for stocks with keywords: ${keywords}`)

    // Call Yahoo Finance search API
    const yahooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(keywords)}&lang=en-US&region=US&quotesCount=10&newsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query&multiQuoteQueryId=multi_quote_single_token_query&enableCb=true&enableNavLinks=true&enableEnhancedTrivialQuery=true`
    
    const response = await fetch(searchUrl, { headers: yahooHeaders })
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`)
    }

    const data = await response.json() as YahooSearchResponse
    
    // Extract and format the search results
    const quotes = data.quotes || []
    const results = quotes.map((quote: YahooQuote) => ({
      symbol: quote.symbol,
      name: quote.shortname || quote.longname || quote.symbol,
      exchange: quote.exchDisp || quote.exchange,
      type: quote.quoteType || 'EQUITY',
      region: quote.region || 'US'
    }))

    console.log(`Found ${results.length} results for "${keywords}"`)

    return Response.json({
      query: keywords,
      results,
      count: results.length
    })
  } catch (error) {
    console.error('Error in stock search:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 