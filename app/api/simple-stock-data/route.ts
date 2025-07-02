export async function POST(request: Request) {
  try {
    const { symbol } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol parameter is required' }, { status: 400 })
    }

    console.log(`📊 Calling centralized stock data function for ${symbol}...`)

    // Call the centralized Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase configuration missing')
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/yahoo-stock-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ symbol })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch stock data')
    }

    const stockData = await response.json()
    console.log(`✅ Stock data received for ${symbol}, price: ${stockData.currentPrice}`)

    return Response.json(stockData)
  } catch (error) {
    console.error('❌ Error in simple stock data API route:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 