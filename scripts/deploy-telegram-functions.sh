#!/bin/bash

# Deploy Telegram webhook function without JWT verification
echo "🚀 Deploying telegram-webhook function..."
supabase functions deploy telegram-webhook --project-ref knbvlpkorstsakqpieiv --no-verify-jwt

# Deploy Telegram signup function without JWT verification  
echo "🚀 Deploying telegram-signup function..."
supabase functions deploy telegram-signup --project-ref knbvlpkorstsakqpieiv --no-verify-jwt

echo "✅ Telegram functions deployed successfully!"
echo "📡 Webhook URL: https://knbvlpkorstsakqpieiv.supabase.co/functions/v1/telegram-webhook"