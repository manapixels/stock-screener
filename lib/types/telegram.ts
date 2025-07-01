// Telegram-specific types

export interface TelegramUser {
  chatId: string
  userId?: string // Linked to Supabase user
  username?: string
  firstName?: string
  lastName?: string
}

export interface TelegramWebhookPayload {
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

export interface TelegramBotCommand {
  command: string
  symbol?: string
  value?: number
  userId?: string
}

export interface TelegramResponse {
  success: boolean
  message?: string
  error?: string
} 