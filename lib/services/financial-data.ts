import { FinancialData } from '../types/analysis'

export async function aggregateFinancialData(symbol: string): Promise<FinancialData | null> {
  const apiKey = process.env.FINANCIAL_MODELING_PREP_API_KEY
  
  if (!apiKey) {
    throw new Error('Financial Modeling Prep API key not configured')
  }

  try {
    console.log(`📊 Fetching financial data for ${symbol}...`)
    
    // Get multiple data points in parallel
    const [profile, ratios, metrics, peers, news, quote] = await Promise.allSettled([
      fetchFMPData(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${apiKey}`),
      fetchFMPData(`https://financialmodelingprep.com/api/v3/ratios/${symbol}?apikey=${apiKey}&limit=1`),
      fetchFMPData(`https://financialmodelingprep.com/api/v3/key-metrics/${symbol}?apikey=${apiKey}&limit=1`),
      fetchFMPData(`https://financialmodelingprep.com/api/v4/stock_peers?symbol=${symbol}&apikey=${apiKey}`),
      fetchFMPData(`https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=5&apikey=${apiKey}`),
      fetchFMPData(`https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=${apiKey}`)
    ])

    const result = {
      profile: profile.status === 'fulfilled' ? profile.value?.[0] : null,
      ratios: ratios.status === 'fulfilled' ? ratios.value?.[0] : null,
      metrics: metrics.status === 'fulfilled' ? metrics.value?.[0] : null,
      peers: peers.status === 'fulfilled' ? peers.value : null,
      news: news.status === 'fulfilled' ? news.value : null,
      quote: quote.status === 'fulfilled' ? quote.value?.[0] : null
    }

    console.log(`📊 Financial data aggregated for ${symbol}`)
    return result
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