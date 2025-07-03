export async function POST(request: Request) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return Response.json(
        { error: "Symbol parameter is required" },
        { status: 400 },
      );
    }

    console.log(`📈 Calling centralized price function for ${symbol}...`);

    // Call the centralized Supabase Edge Function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/yahoo-stock-price`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symbol }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch price data");
    }

    const priceData = await response.json();
    console.log(
      `✅ Price data received for ${symbol}: $${priceData.price?.toFixed(2)}`,
    );

    return Response.json(priceData);
  } catch (error) {
    console.error("❌ Error in price API route:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
