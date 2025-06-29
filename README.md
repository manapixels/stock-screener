# Signal - Intelligent Stock Monitoring & Alerting Dashboard

A Next.js application with Supabase backend for monitoring stocks and receiving alerts via Telegram.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **External APIs**: Alpha Vantage (stock data), Telegram Bot API
- **Deployment**: Vercel (frontend), Supabase (backend)

## Project Structure

```
├── app/                    # Next.js App Router pages
├── components/             # React components
├── lib/                   # Utilities and API clients
├── supabase/              # Supabase configuration
│   ├── migrations/        # Database migrations
│   └── functions/         # Edge Functions
├── .env.local.example     # Environment variables template
└── README.md
```

## Getting Started

### 1. Clone and Install

```bash
git clone <repository>
cd signal-stock-screener
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Install Supabase CLI: `npm install -g supabase`
3. Initialize Supabase: `supabase init`
4. Link to your project: `supabase link --project-ref your-project-ref`
5. Run migrations: `supabase db push`

### 3. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Alpha Vantage API
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

### 4. Deploy Edge Functions

```bash
supabase functions deploy stock-search --project-ref your-project-ref
supabase functions deploy stock-details --project-ref your-project-ref  
supabase functions deploy send-telegram-message --project-ref your-project-ref
supabase functions deploy alert-monitor --project-ref your-project-ref
```

### 5. Set Edge Function Secrets

```bash
supabase secrets set ALPHA_VANTAGE_API_KEY=your_key --project-ref your-project-ref
supabase secrets set TELEGRAM_BOT_TOKEN=your_token --project-ref your-project-ref
```

### 6. Run Locally

```bash
# Start Supabase locally (optional)
supabase start

# Start Next.js
npm run dev
```

## Features

### ✅ Implemented
- User authentication (Supabase Auth)
- Stock search and watchlist management
- Stock details with technical indicators
- Custom alerts with multiple trigger conditions
- Telegram notifications
- Real-time updates

### 🔄 Edge Functions
- **stock-search**: Search stocks via Alpha Vantage API
- **stock-details**: Get comprehensive stock data
- **send-telegram-message**: Send notifications via Telegram
- **alert-monitor**: Background service to check alerts (run via cron)

### 📊 Alert Types
- P/E Ratio below threshold
- RSI below threshold  
- Price above 50-day/200-day MA
- Golden Cross detection
- Bollinger Bands breach
- Institutional buy alerts (planned)

## Database Schema

### Tables
- `profiles` - User metadata and Telegram settings
- `watchlist_items` - User's tracked stocks
- `stock_notes` - User notes on stocks
- `alerts` - Custom alert configurations

### Row Level Security
All tables have RLS policies ensuring users can only access their own data.

## Deployment

### Frontend (Vercel)
1. Connect repository to Vercel
2. Set environment variables
3. Deploy

### Backend (Supabase)
1. Deploy Edge Functions
2. Set up cron jobs for alert monitoring
3. Configure secrets

## API Endpoints

All API calls go through Supabase Edge Functions:
- `/functions/v1/stock-search` - Search stocks
- `/functions/v1/stock-details` - Get stock data
- `/functions/v1/send-telegram-message` - Send notifications
- `/functions/v1/alert-monitor` - Check alerts (cron)

## Development

### Database Changes
```bash
# Create migration
supabase migration new your_migration_name

# Apply migrations
supabase db push
```

### Edge Functions
```bash
# Create new function
supabase functions new function-name

# Deploy function
supabase functions deploy function-name --project-ref your-ref
```

### Local Development
```bash
# Start Supabase locally
supabase start

# Serve functions locally
supabase functions serve

# Start frontend
npm run dev
```

## Environment Setup

Required services:
1. **Supabase Project** - Database, Auth, Edge Functions
2. **Alpha Vantage API Key** - Stock data (free tier available)  
3. **Telegram Bot Token** - Notifications (optional)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Test locally with Supabase
5. Submit a pull request

## License

MIT License