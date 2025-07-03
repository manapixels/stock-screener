import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

// Validate Telegram authentication data
function validateTelegramAuth(telegramUser: TelegramUser, botToken: string): boolean {
  const { hash, ...dataToCheck } = telegramUser
  
  // Create data string for validation
  const dataCheckString = Object.keys(dataToCheck)
    .sort()
    .map(key => `${key}=${dataToCheck[key as keyof typeof dataToCheck]}`)
    .join('\n')
  
  // Create secret key
  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  
  // Create hash
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')
  
  // Check if auth is not too old (24 hours)
  const authDate = new Date(telegramUser.auth_date * 1000)
  const now = new Date()
  const diffHours = (now.getTime() - authDate.getTime()) / (1000 * 60 * 60)
  
  return calculatedHash === hash && diffHours < 24
}

export async function POST(request: NextRequest) {
  try {
    const { telegramUser } = await request.json()
    
    if (!telegramUser) {
      return NextResponse.json({ error: 'Telegram user data required' }, { status: 400 })
    }

    // Get bot token from environment
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      console.error('TELEGRAM_BOT_TOKEN not configured')
      return NextResponse.json({ error: 'Telegram authentication not configured' }, { status: 500 })
    }

    // Validate Telegram authentication
    if (!validateTelegramAuth(telegramUser, botToken)) {
      return NextResponse.json({ error: 'Invalid Telegram authentication' }, { status: 400 })
    }

    // Create Supabase admin client for user management
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const telegramEmail = `telegram_${telegramUser.id}@telegram.local`

    // Check if user already exists by telegram_user_id
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('telegram_user_id', telegramUser.id.toString())
      .single()

    let authUser
    let userId: string

    if (existingProfile) {
      // User exists, get their auth user
      const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id)
      authUser = authUserData.user
      userId = existingProfile.id
      
      // Update their profile
      await supabaseAdmin
        .from('profiles')
        .update({
          telegram_username: telegramUser.username,
          telegram_first_name: telegramUser.first_name,
          telegram_last_name: telegramUser.last_name,
          telegram_linked_at: new Date().toISOString(),
          telegram_active: true,
          avatar_url: telegramUser.photo_url,
          display_name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    } else {
      // Create new user account
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: telegramEmail,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramUser.id,
          telegram_username: telegramUser.username,
          telegram_first_name: telegramUser.first_name,
          telegram_last_name: telegramUser.last_name,
          signup_method: 'telegram'
        }
      })

      if (authError) {
        console.error('Error creating user:', authError)
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }

      authUser = authData.user
      userId = authData.user.id

      // Create profile for the new user
      await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          email: telegramEmail,
          telegram_user_id: telegramUser.id.toString(),
          telegram_username: telegramUser.username,
          telegram_first_name: telegramUser.first_name,
          telegram_last_name: telegramUser.last_name,
          telegram_linked_at: new Date().toISOString(),
          telegram_active: true,
          avatar_url: telegramUser.photo_url,
          display_name: telegramUser.first_name + (telegramUser.last_name ? ` ${telegramUser.last_name}` : ''),
          signup_method: 'telegram',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
    }

    // Generate a session token for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: telegramEmail
    })

    if (sessionError) {
      console.error('Error generating session:', sessionError)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      redirectUrl: sessionData.properties.action_link,
      user: {
        id: userId,
        email: telegramEmail,
        user_metadata: authUser?.user_metadata || {}
      }
    })

  } catch (error) {
    console.error('Telegram signin error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 