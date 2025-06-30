// @ts-ignore: Deno imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore: Deno imports  
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
    // Use Yahoo Finance for price data
    const yahooHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`, 
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

    const meta = result.meta
    const timestamps = result.timestamp || []
    const quotes = result.indicators?.quote?.[0] || {}
    const closes = quotes.close || []
    
    // Extract current price from latest data
    let currentPrice = closes[closes.length - 1] || meta?.regularMarketPrice || null
    const movingAverages: { [key: string]: number } = {}
    
    // Calculate simple moving averages from closes array
    if (closes.length >= 50) {
      const ma50 = closes.slice(-50).reduce((sum, price) => sum + price, 0) / 50
      movingAverages.ma_50 = ma50
    }
    
    if (closes.length >= 200) {
      const ma200 = closes.slice(-200).reduce((sum, price) => sum + price, 0) / 200
      movingAverages.ma_200 = ma200
    }

    // For now, set technical indicators to null as Yahoo Finance doesn't provide RSI/Bollinger directly
    const currentRsi = null
    const bollingerBands: { [key: string]: number } = {}
    
    // Basic P/E ratio from meta data
    let peRatio = null
    if (meta?.trailingPE) {
      peRatio = meta.trailingPE
    }

    return {
      symbol,
      current_price: currentPrice,
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

async function evaluateAlertCondition(alert: Alert, stockData: any): Promise<boolean> {
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

async function triggerAlert(alert: Alert, stockData: any, supabase: any) {
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

function formatAlertMessage(alert: Alert, stockData: any): string {
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