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
    const { chat_id, message, bot_token } = await req.json()
    
    if (!chat_id || !message) {
      return new Response(
        JSON.stringify({ error: 'chat_id and message parameters are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use provided bot_token or fallback to environment variable
    const telegramBotToken = bot_token || Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!telegramBotToken) {
      return new Response(
        JSON.stringify({ error: 'Telegram bot token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const telegramUrl = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`
    
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id,
        text: message,
        parse_mode: 'Markdown'
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to send Telegram message', details: data }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ message: 'Message sent successfully!', data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})