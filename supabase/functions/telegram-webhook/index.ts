import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TelegramWebhookPayload {
  message?: {
    message_id: number
    from: {
      id: number
      is_bot: boolean
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
    date: number
  }
}

interface TelegramBotCommand {
  command: string
  symbol?: string
  value?: number
  direction?: 'above' | 'below'
  args: string[]
}

// Telegram Formatter Functions
function formatAnalysisForTelegram(analysis: any, symbol: string): string {
  if (!analysis || !analysis.analysis) {
    return `📊 *${symbol} Analysis*\n\n❌ Unable to generate analysis at this time. Please try again later.`
  }

  const data = analysis.analysis
  const rating = data.recommendation?.rating || 'HOLD'
  const priceTarget = data.recommendation?.priceTarget
  const confidence = data.recommendation?.confidence || 'MEDIUM'
  const timeHorizon = data.recommendation?.timeHorizon || '12 months'
  const currentPrice = analysis.currentPrice || analysis.quote?.price
  
  const recEmoji = rating.toLowerCase().includes('buy') ? '📈' : 
                   rating.toLowerCase().includes('sell') ? '📉' : '⚖️'
  const confEmoji = confidence === 'HIGH' ? '🟢' : confidence === 'MEDIUM' ? '🟡' : '🔴'

  // Helper function to format arguments with bold titles
  function formatArgument(arg: string, index: number): string {
    // Look for pattern "Title: Description" and make title bold
    const colonMatch = arg.match(/^([^:]+):\s*(.+)/)
    if (colonMatch) {
      const [, title, description] = colonMatch
      return `${index + 1}. *${title.trim()}:* ${description.trim()}`
    }
    return `${index + 1}. ${arg}`
  }

  return `📊 *${symbol} Professional Analysis*

💭 *Investment Thesis:*
${data.investmentThesis || 'Analysis in progress...'}

${currentPrice ? `💰 *Current Price:* $${typeof currentPrice === 'number' ? currentPrice.toFixed(2) : currentPrice}` : ''}
${recEmoji} *Recommendation:* ${rating}
${priceTarget ? `🎯 *Price Target:* $${priceTarget}` : ''}
${confEmoji} *Confidence:* ${confidence} (${timeHorizon})

📈 *Bull Case:*
${data.bullishArguments?.slice(0, 3).map((arg: string, i: number) => formatArgument(arg, i)).join('\n') || 'Analyzing positive factors...'}

📉 *Bear Case:*
${data.bearishArguments?.slice(0, 2).map((arg: string, i: number) => formatArgument(arg, i)).join('\n') || 'Analyzing risk factors...'}

💰 *Financial Highlights:*
📊 ${data.financialHighlights?.valuation || 'Valuation metrics loading...'}
💼 ${data.financialHighlights?.profitability || 'Profitability analysis loading...'}
🏦 ${data.financialHighlights?.financialStrength || 'Financial strength assessment loading...'}
💸 ${data.financialHighlights?.dividend || 'Dividend analysis loading...'}

🔍 Use /search to find more stocks or /help for commands.`
}

function formatStockSearchForTelegram(results: any[]): string {
  if (!results || results.length === 0) {
    return '🔍 *Search Results*\n\n❌ No stocks found matching your query.'
  }

  const formatted = results.slice(0, 5).map((stock, i) => 
    `${i + 1}. *${stock.symbol}* - ${stock.name}\n   📍 ${stock.exchange || 'N/A'}`
  ).join('\n\n')

  return `🔍 *Search Results*\n\n${formatted}\n\n💡 Use /research [SYMBOL] to analyze any stock.`
}

function formatErrorForTelegram(message: string, command?: string): string {
  const helpText = command ? `\n\n💡 Use /${command} [PARAMS] or /help for guidance.` : '\n\n💡 Use /help to see available commands.'
  return `❌ *Error*\n\n${message}${helpText}`
}

function formatHelpForTelegram(): string {
  return `🤖 *Stock Screener Bot Commands*

📊 *Analysis:*
• /research AAPL - Get professional stock analysis
• /search apple inc - Search for stocks

🔗 *Account Features:*
• /link TOKEN - Link your web account
• /alerts - View your price alerts  
• /watchlist - View your watchlist

🚨 *Alerts:*
• /alert AAPL 150 above - Set price alert
• /alert TSLA 200 below - Set price alert

ℹ️ *Help:*
• /help - Show this message
• /start - Welcome message

🌐 *Get Started:*
1. Try /research AAPL for instant analysis
2. Use /search to find stocks
3. Link your account for alerts & watchlist`
}

function formatWatchlistForTelegram(watchlist: any[]): string {
  if (!watchlist || watchlist.length === 0) {
    return '📋 *Your Watchlist*\n\n📭 Your watchlist is empty.\n\n💡 Add stocks through the web app or use /research to analyze stocks.'
  }

  const formatted = watchlist.slice(0, 10).map((item, i) => 
    `${i + 1}. *${item.symbol}* - ${item.name || 'N/A'}`
  ).join('\n')

  return `📋 *Your Watchlist*\n\n${formatted}\n\n💡 Use /research [SYMBOL] to analyze any stock.`
}

function formatAlertConfirmationForTelegram(symbol: string, price: number, direction: string): string {
  const directionEmoji = direction === 'above' ? '📈' : '📉'
  return `🚨 *Alert Set Successfully!*

${directionEmoji} *${symbol}* - Alert when price goes *${direction}* $${price}

📱 You'll receive notifications here when triggered.
📊 Use /alerts to view all your active alerts.`
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Use service role for database operations (webhooks don't provide user auth)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const payload: TelegramWebhookPayload = await req.json()
    console.log('📱 Telegram webhook received:', JSON.stringify(payload, null, 2))

    if (!payload.message || !payload.message.text) {
      return new Response('OK', { status: 200 })
    }

    const message = payload.message
    const chatId = message.chat.id.toString()
    const text = message.text.trim()

    // Parse command
    const command = parseCommand(text)
    console.log('🔍 Parsed command:', command)

    // Handle different commands
    let response: string
    
    switch (command.command) {
      case 'start':
        response = await handleStartCommand(chatId, message.from)
        break
      case 'help':
        response = formatHelpForTelegram()
        break
      case 'link':
        response = await handleLinkCommand(chatId, command.args[0], message.from)
        break
      case 'research':
        response = await handleResearchCommand(chatId, command.symbol)
        break
      case 'search':
        response = await handleSearchCommand(command.args.join(' '))
        break
      case 'alert':
        response = await handleAlertCommand(chatId, command.symbol, command.value, command.direction)
        break
      case 'alerts':
        response = await handleAlertsCommand(chatId)
        break
      case 'watchlist':
        response = await handleWatchlistCommand(chatId)
        break
      default:
        response = formatErrorForTelegram('Unknown command. Use /help to see available commands.')
    }

    // Send response to Telegram
    await sendTelegramMessage(chatId, response)
    
    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('❌ Telegram webhook error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

function parseCommand(text: string): TelegramBotCommand {
  const parts = text.split(' ').filter(part => part.length > 0)
  const command = parts[0].toLowerCase().replace('/', '')
  const args = parts.slice(1)

  let symbol: string | undefined
  let value: number | undefined
  let direction: 'above' | 'below' = 'above'

  // Parse based on command type
  switch (command) {
    case 'research':
      symbol = args[0]?.toUpperCase()
      break
    case 'alert':
      symbol = args[0]?.toUpperCase()
      value = args[1] ? parseFloat(args[1]) : undefined
      direction = args[2]?.toLowerCase() === 'below' ? 'below' : 'above'
      break
    case 'add':
    case 'remove':
      symbol = args[0]?.toUpperCase()
      break
  }

  return {
    command,
    symbol,
    value,
    direction,
    args
  }
}

async function handleStartCommand(chatId: string, from: any): Promise<string> {
  const name = from.first_name || 'there'
  
  return `👋 Hello ${name}! Welcome to the Stock Screener Bot!

🔗 **Link Your Account:**
If you have a web account, use /link [TOKEN] to connect your accounts.

📊 **Get Started:**
• /research AAPL - Analyze a stock
• /search apple - Search for stocks  
• /help - See all commands

🚀 Start exploring the markets with professional analysis!`
}

async function handleLinkCommand(chatId: string, token: string, from: any): Promise<string> {
  if (!token) {
    return formatErrorForTelegram('Please provide a link token. Get one from your account settings on the web app.', 'link')
  }

  try {
    const { data, error } = await supabase.rpc('link_telegram_account', {
      p_token: token,
      p_chat_id: chatId,
      p_username: from.username || null,
      p_first_name: from.first_name || null,
      p_last_name: from.last_name || null
    })

    if (error) {
      console.error('Database error linking account:', error)
      return formatErrorForTelegram('Database error occurred while linking account.')
    }

    if (data.success) {
      return `✅ **Account Linked Successfully!**

Your Telegram account is now connected to your web account. You can now:

📊 Get personalized analysis
🚨 Receive your price alerts
📋 Access your watchlist
⚙️ Sync with web app settings

Use /help to see all available commands!`
    } else {
      return formatErrorForTelegram(data.message || 'Failed to link account. Please check your token and try again.')
    }
  } catch (error) {
    console.error('Error linking account:', error)
    return formatErrorForTelegram('An error occurred while linking your account. Please try again.')
  }
}

async function handleResearchCommand(chatId: string, symbol?: string): Promise<string> {
  if (!symbol) {
    return formatErrorForTelegram('Please provide a stock symbol. Example: /research AAPL', 'research')
  }

  try {
    // Call the professional analysis API
    const response = await fetch(`${SUPABASE_URL}/functions/v1/professional-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header - function deployed with --no-verify-jwt
      },
      body: JSON.stringify({ symbol })
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }

    const analysis = await response.json()
    return formatAnalysisForTelegram(analysis, symbol)
  } catch (error) {
    console.error('Error getting analysis:', error)
    return formatErrorForTelegram('Unable to analyze stock at this time. Please try again later.', 'research')
  }
}

async function handleSearchCommand(query: string): Promise<string> {
  if (!query || query.trim().length === 0) {
    return formatErrorForTelegram('Please provide a search query. Example: /search apple inc', 'search')
  }

  try {
    // Call the stock search API
    const response = await fetch(`${SUPABASE_URL}/functions/v1/yahoo-stock-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // No Authorization header - function deployed with --no-verify-jwt
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }

    const results = await response.json()
    return formatStockSearchForTelegram(results.quotes || [])
  } catch (error) {
    console.error('Error searching stocks:', error)
    return formatErrorForTelegram('Unable to search stocks at this time. Please try again later.', 'search')
  }
}

async function handleAlertCommand(
  chatId: string, 
  symbol?: string, 
  price?: number, 
  direction: 'above' | 'below' = 'above'
): Promise<string> {
  if (!symbol || !price) {
    return formatErrorForTelegram('Usage: /alert SYMBOL PRICE [above|below]\nExample: /alert AAPL 150 above', 'alert')
  }

  // Check if user is linked
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .single()

  if (!profile) {
    return formatErrorForTelegram('Please link your account first using /link [TOKEN]. Get a token from the web app settings.')
  }

  try {
    // Create alert in database
    const { error } = await supabase
      .from('alerts')
      .insert({
        user_id: profile.id,
        symbol: symbol,
        target_price: price,
        alert_type: direction,
        is_active: true
      })

    if (error) {
      console.error('Error creating alert:', error)
      return formatErrorForTelegram('Failed to create alert. Please try again.')
    }

    return formatAlertConfirmationForTelegram(symbol, price, direction)
  } catch (error) {
    console.error('Error handling alert command:', error)
    return formatErrorForTelegram('An error occurred while creating your alert. Please try again.')
  }
}

async function handleAlertsCommand(chatId: string): Promise<string> {
  // Check if user is linked
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .single()

  if (!profile) {
    return formatErrorForTelegram('Please link your account first using /link [TOKEN]. Get a token from the web app settings.')
  }

  try {
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', profile.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching alerts:', error)
      return formatErrorForTelegram('Failed to fetch alerts. Please try again.')
    }

    if (!alerts || alerts.length === 0) {
      return `🚨 *Your Price Alerts*

📭 No active alerts found.

💡 Create alerts with: /alert SYMBOL PRICE [above|below]
Example: /alert AAPL 150 above`
    }

    const alertList = alerts.slice(0, 10).map((alert, i) => {
      const direction = alert.alert_type === 'above' ? '📈' : '📉'
      return `${i + 1}. ${direction} *${alert.symbol}* - $${alert.target_price} ${alert.alert_type}`
    }).join('\n')

    return `🚨 *Your Price Alerts*

${alertList}

💡 Use /alert to create new alerts.`

  } catch (error) {
    console.error('Error handling alerts command:', error)
    return formatErrorForTelegram('An error occurred while fetching your alerts. Please try again.')
  }
}

async function handleWatchlistCommand(chatId: string): Promise<string> {
  // Check if user is linked
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, telegram_chat_id')
    .eq('telegram_chat_id', chatId)
    .single()

  if (!profile) {
    return formatErrorForTelegram('Please link your account first using /link [TOKEN]. Get a token from the web app settings.')
  }

  // For now, return a placeholder since watchlist isn't fully implemented
  return formatWatchlistForTelegram([])
}

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('❌ Telegram bot token not configured')
    return
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('❌ Failed to send Telegram message:', response.status, errorData)
    } else {
      console.log('✅ Telegram message sent successfully')
    }
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error)
  }
} 