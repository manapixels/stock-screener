import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface YahooQuoteResponse {
  chart: {
    result: [{
      meta: {
        symbol: string
        regularMarketPrice: number
        previousClose: number
        currency: string
      }
      timestamp: number[]
      indicators: {
        quote: [{
          open: number[]
          high: number[]
          low: number[]
          close: number[]
          volume: number[]
        }]
      }
    }]
  }
}

interface YahooStatsResponse {
  quoteSummary: {
    result: [{
      summaryDetail?: {
        trailingPE?: { raw: number }
        priceToBook?: { raw: number }
        marketCap?: { raw: number }
      }
      financialData?: {
        totalRevenue?: { raw: number }
        totalDebt?: { raw: number }
        totalCash?: { raw: number }
        returnOnEquity?: { raw: number }
        debtToEquity?: { raw: number }
        currentPrice?: { raw: number }
      }
      defaultKeyStatistics?: {
        trailingEps?: { raw: number }
        forwardEps?: { raw: number }
        bookValue?: { raw: number }
        enterpriseValue?: { raw: number }
      }
      assetProfile?: {
        sector?: string
        industry?: string
        longBusinessSummary?: string
      }
      price?: {
        longName?: string
        symbol?: string
      }
    }]
  }
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

    console.log(`Fetching data for ${symbol} from Yahoo Finance...`)

    // Fetch data from Yahoo Finance with headers
    const yahooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    const [quoteResponse, statsResponse, chartResponse] = await Promise.all([
      // Current quote data
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`, { headers: yahooHeaders }),
      // Fundamental data
      fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,financialData,defaultKeyStatistics,assetProfile,price`, { headers: yahooHeaders }),
      // Historical data for price changes
      fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`, { headers: yahooHeaders })
    ])

    let yahooData: any = null
    let useAlphaVantageBackup = false

    if (quoteResponse.ok && statsResponse.ok && chartResponse.ok) {
      const quote: YahooQuoteResponse = await quoteResponse.json()
      const stats: YahooStatsResponse = await statsResponse.json()
      const chart: YahooQuoteResponse = await chartResponse.json()

      console.log('Yahoo quote response status:', quote)
      console.log('Yahoo stats response status:', stats)

      // Transform Yahoo Finance data to match our expected format
      const quoteResult = quote.chart?.result?.[0]
      const statsResult = stats.quoteSummary?.result?.[0]
      const chartResult = chart.chart?.result?.[0]

      if (quoteResult && statsResult) {
        yahooData = {
          overview: {
            Symbol: symbol,
            Name: statsResult.price?.longName || symbol,
            Sector: statsResult.assetProfile?.sector || 'N/A',
            Industry: statsResult.assetProfile?.industry || 'N/A',
            PERatio: statsResult.summaryDetail?.trailingPE?.raw?.toString() || 'None',
            EPS: statsResult.defaultKeyStatistics?.trailingEps?.raw?.toString() || 'None',
            BookValue: statsResult.defaultKeyStatistics?.bookValue?.raw?.toString() || 'None',
            PriceToBookRatio: statsResult.summaryDetail?.priceToBook?.raw?.toString() || 'None',
            ReturnOnEquityTTM: statsResult.financialData?.returnOnEquity?.raw?.toString() || 'None',
            DebtToEquityRatio: statsResult.financialData?.debtToEquity?.raw?.toString() || 'None',
            MarketCapitalization: statsResult.summaryDetail?.marketCap?.raw?.toString() || 'None',
            Description: statsResult.assetProfile?.longBusinessSummary || 'N/A'
          },
          daily_data: transformYahooChartData(chartResult),
          currentPrice: quoteResult.meta?.regularMarketPrice || 0,
          currency: quoteResult.meta?.currency || 'USD',
          source: 'yahoo'
        }
        
        console.log('Successfully fetched data from Yahoo Finance')
      } else {
        useAlphaVantageBackup = true
      }
    } else {
      useAlphaVantageBackup = true
    }

    // Fall back to Alpha Vantage if Yahoo Finance fails
    if (useAlphaVantageBackup) {
      console.log('Yahoo Finance failed, falling back to Alpha Vantage...')
      
      const apiKey = Deno.env.get('ALPHA_VANTAGE_API_KEY')
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: 'No data available from Yahoo Finance and Alpha Vantage API key not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Fetch from Alpha Vantage (simplified - just overview for now)
      const [overview, dailyData] = await Promise.all([
        fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`),
        fetch(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&outputsize=compact&apikey=${apiKey}`)
      ])

      const overviewData = await overview.json()
      const dailyDataResponse = await dailyData.json()

      yahooData = {
        overview: overviewData,
        daily_data: dailyDataResponse,
        source: 'alphavantage'
      }
      
      console.log('Using Alpha Vantage as backup')
    }

    return new Response(
      JSON.stringify(yahooData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching stock data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function transformYahooChartData(chartResult: any) {
  if (!chartResult?.timestamp || !chartResult?.indicators?.quote?.[0]) {
    return {}
  }

  const timestamps = chartResult.timestamp
  const quotes = chartResult.indicators.quote[0]
  const timeSeriesData: any = {}

  timestamps.forEach((timestamp: number, index: number) => {
    const date = new Date(timestamp * 1000).toISOString().split('T')[0]
    timeSeriesData[date] = {
      '1. open': quotes.open[index]?.toString() || '0',
      '2. high': quotes.high[index]?.toString() || '0', 
      '3. low': quotes.low[index]?.toString() || '0',
      '4. close': quotes.close[index]?.toString() || '0',
      '5. volume': quotes.volume[index]?.toString() || '0'
    }
  })

  return {
    'Time Series (Daily)': timeSeriesData
  }
}