// @ts-expect-error: Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-expect-error: Deno imports  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Alert {
  id: string
  user_id: string
  symbol: string
  alert_type: string
  threshold: number
  is_active: boolean
}

interface StockData {
  symbol: string
  current_price: number | null
  pe_ratio: number | null
  rsi: number | null
  moving_averages: { [key: string]: number }
  bollinger_bands: { [key: string]: number }
  overview: { symbol: string }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get all active alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('is_active', true)

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`)
    }

    // Group alerts by symbol to minimize API calls
    const alertsBySymbol: { [key: string]: Alert[] } = {}
    for (const alert of alerts) {
      if (!alertsBySymbol[alert.symbol]) {
        alertsBySymbol[alert.symbol] = []
      }
      alertsBySymbol[alert.symbol].push(alert)
    }

    const results = []

    // Check each symbol's alerts
    for (const [symbol, symbolAlerts] of Object.entries(alertsBySymbol)) {
      try {
        const stockData = await getStockData(symbol)
        
        if (!stockData) {
          console.warn(`Could not fetch data for ${symbol}`)
          continue
        }

        // Check each alert for this symbol
        for (const alert of symbolAlerts) {
          const shouldTrigger = await evaluateAlertCondition(alert, stockData)
          
          if (shouldTrigger) {
            await triggerAlert(alert, stockData, supabase)
            results.push({
              alert_id: alert.id,
              symbol: alert.symbol,
              alert_type: alert.alert_type,
              triggered: true
            })
          }
        }
      } catch (error) {
        console.error(`Error checking alerts for ${symbol}:`, error)
        results.push({
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Alert monitoring completed', 
        checked_alerts: alerts.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Alert monitor error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getStockData(symbol: string) {
  try {
    // Use centralized price fetching function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const response = await fetch(`${supabaseUrl}/functions/v1/yahoo-stock-price`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ symbol })
    })

    if (!response.ok) {
      throw new Error('Failed to fetch price data from centralized function')
    }

    const priceData = await response.json()
    
    // Also get stock data for moving averages calculation
    const stockDataResponse = await fetch(`${supabaseUrl}/functions/v1/yahoo-stock-data`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ symbol })
    })

         const movingAverages: { [key: string]: number } = {}
     let peRatio = null

     if (stockDataResponse.ok) {
       const stockData = await stockDataResponse.json()
       
       // Calculate moving averages from time series data
       const timeSeries = stockData.daily_data?.['Time Series (Daily)'] || {}
       const closes = Object.values(timeSeries)
         .map((day: { '4. close': string }) => parseFloat(day['4. close']))
         .filter(price => !isNaN(price))
         .reverse() // Most recent first
      
      // Calculate simple moving averages
      if (closes.length >= 50) {
        const ma50 = closes.slice(0, 50).reduce((sum, price) => sum + price, 0) / 50
        movingAverages.ma_50 = ma50
      }
      
      if (closes.length >= 200) {
        const ma200 = closes.slice(0, 200).reduce((sum, price) => sum + price, 0) / 200
        movingAverages.ma_200 = ma200
      }

      // Extract P/E ratio from overview
      if (stockData.overview?.PERatio) {
        peRatio = parseFloat(stockData.overview.PERatio)
      }
    }

    // For now, set technical indicators to null as they require more complex calculations
    const currentRsi = null
    const bollingerBands: { [key: string]: number } = {}

    return {
      symbol,
      current_price: priceData.price,
      pe_ratio: peRatio,
      rsi: currentRsi,
      moving_averages: movingAverages,
      bollinger_bands: bollingerBands,
      overview: { symbol: symbol.toUpperCase() }
    }
  } catch (error) {
    console.error(`Error fetching stock data for ${symbol}:`, error)
    return null
  }
}

async function evaluateAlertCondition(alert: Alert, stockData: StockData): Promise<boolean> {
  const { alert_type, threshold } = alert

  switch (alert_type) {
    case 'PE_RATIO_BELOW':
      return stockData.pe_ratio !== null && stockData.pe_ratio < threshold

    case 'RSI_BELOW':
      return stockData.rsi !== null && stockData.rsi < threshold

    case 'PRICE_ABOVE_MA_50':
      return stockData.current_price !== null && 
             stockData.moving_averages.ma_50 !== undefined &&
             stockData.current_price > stockData.moving_averages.ma_50

    case 'PRICE_ABOVE_MA_200':
      return stockData.current_price !== null && 
             stockData.moving_averages.ma_200 !== undefined &&
             stockData.current_price > stockData.moving_averages.ma_200

    case 'GOLDEN_CROSS':
      return stockData.moving_averages.ma_50 !== undefined &&
             stockData.moving_averages.ma_200 !== undefined &&
             stockData.moving_averages.ma_50 > stockData.moving_averages.ma_200

    case 'PRICE_BELOW_BOLLINGER_LOWER':
      return stockData.current_price !== null &&
             stockData.bollinger_bands.lower !== undefined &&
             stockData.current_price < stockData.bollinger_bands.lower

    case 'INSTITUTIONAL_BUY':
      // This would require additional data source for 13F filings
      // For now, return false as this is more complex to implement
      return false

    default:
      return false
  }
}

async function triggerAlert(alert: Alert, stockData: StockData, supabase: ReturnType<typeof createClient>) {
  try {
    // Get user's Telegram settings
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('telegram_chat_id, telegram_bot_token')
      .eq('id', alert.user_id)
      .single()

    if (error || !profile?.telegram_chat_id) {
      console.warn(`User ${alert.user_id} has no Telegram chat ID configured`)
      return
    }

    // Format alert message
    const message = formatAlertMessage(alert, stockData)

    // Send Telegram notification
    await sendTelegramMessage(profile.telegram_chat_id, message, profile.telegram_bot_token)

    console.log(`Alert triggered for ${alert.symbol} - ${alert.alert_type}`)
  } catch (error) {
    console.error('Error sending alert notification:', error)
  }
}

function formatAlertMessage(alert: Alert, stockData: StockData): string {
  const { symbol, alert_type, threshold } = alert
  const currentPrice = stockData.current_price || 'N/A'
  
  let message = `📈 **SIGNAL on ${symbol}** 📉\n`

  switch (alert_type) {
    case 'PE_RATIO_BELOW':
      message += `**Trigger:** P/E Ratio below ${threshold}\n`
      message += `**Current P/E:** ${stockData.pe_ratio || 'N/A'}\n`
      break

    case 'RSI_BELOW':
      message += `**Trigger:** RSI below ${threshold}\n`
      message += `**Current RSI:** ${stockData.rsi?.toFixed(2) || 'N/A'}\n`
      break

    case 'PRICE_ABOVE_MA_50':
      message += `**Trigger:** Price above 50-day MA\n`
      message += `**50-day MA:** $${stockData.moving_averages.ma_50?.toFixed(2) || 'N/A'}\n`
      break

    case 'PRICE_ABOVE_MA_200':
      message += `**Trigger:** Price above 200-day MA\n`
      message += `**200-day MA:** $${stockData.moving_averages.ma_200?.toFixed(2) || 'N/A'}\n`
      break

    case 'GOLDEN_CROSS':
      message += `**Trigger:** Golden Cross (50-day MA > 200-day MA)\n`
      message += `**50-day MA:** $${stockData.moving_averages.ma_50?.toFixed(2) || 'N/A'}\n`
      message += `**200-day MA:** $${stockData.moving_averages.ma_200?.toFixed(2) || 'N/A'}\n`
      break

    case 'PRICE_BELOW_BOLLINGER_LOWER':
      message += `**Trigger:** Price below Bollinger Lower Band\n`
      message += `**Lower Band:** $${stockData.bollinger_bands.lower?.toFixed(2) || 'N/A'}\n`
      break
  }

  message += `**Current Price:** $${currentPrice}\n`
  message += `**Time:** ${new Date().toISOString()}`

  return message
}

async function sendTelegramMessage(chatId: string, message: string, botToken?: string) {
  const telegramBotToken = botToken || Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!telegramBotToken) {
    throw new Error('Telegram bot token not configured')
  }

  const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
  
  const response = await fetch(telegramUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Failed to send Telegram message: ${JSON.stringify(errorData)}`)
  }
}