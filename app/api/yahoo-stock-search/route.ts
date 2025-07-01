import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: Request) {
  try {
    const { keywords } = await request.json()

    if (!keywords) {
      return Response.json({ error: 'Keywords parameter is required' }, { status: 400 })
    }

    console.log(`Invoking Supabase function 'yahoo-stock-search' for: ${keywords}`)

    const { data, error } = await supabase.functions.invoke('yahoo-stock-search', {
      body: { query: keywords },
    })

    if (error) {
      console.error('Error invoking Supabase function:', error)
      throw new Error(`Supabase function error: ${error.message}`)
    }
    
    // The Edge Function already returns a formatted response, so we just pass it through.
    // The function returns an object with `quotes`, which we should rename to `results`
    // for consistency with the frontend expectations.
    const results = (data.quotes || []).map((quote: {
      symbol: string;
      name?: string;
      exchange?: string;
      type?: string;
    }) => ({
      symbol: quote.symbol,
      name: quote.name || quote.symbol,
      exchange: quote.exchange || 'N/A',
      type: quote.type || 'EQUITY'
    }))

    console.log(`Received ${results.length} results from Supabase function.`)

    return Response.json({
      query: keywords,
      bestMatches: results,
      count: results.length
    })

  } catch (error) {
    console.error('Error in stock search API route:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 