# Professional Investment Analysis Setup Guide

This guide will help you set up the professional investment analysis feature powered by Gemini 2.5 Flash and Financial Modeling Prep API.

## Required API Keys

### 1. Gemini API Key (FREE)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

**Free Tier Limits:**
- 15 requests per minute
- 1,500 requests per day
- 1 million tokens per month (input + output)

### 2. Financial Modeling Prep API Key (FREE TIER AVAILABLE)

1. Go to [Financial Modeling Prep](https://financialmodelingprep.com/developer/docs)
2. Sign up for a free account
3. Go to your dashboard to get your API key

**Free Tier Limits:**
- 250 requests per day
- Real-time stock prices
- Financial statements
- Market data
- Company profiles

## Environment Variables Setup

1. Copy your API keys to `.env.local`:

```bash
# Professional Analysis APIs
GEMINI_API_KEY=your_actual_gemini_api_key_here
FINANCIAL_MODELING_PREP_API_KEY=your_actual_fmp_api_key_here
```

2. Restart your development server:

```bash
npm run dev
```

## Deploy Supabase Function

Deploy the professional analysis function to your Supabase project:

```bash
# Login to Supabase
npx supabase login

# Deploy the function
npx supabase functions deploy professional-analysis

# Set environment variables in Supabase
npx supabase secrets set GEMINI_API_KEY=your_actual_gemini_api_key_here
npx supabase secrets set FINANCIAL_MODELING_PREP_API_KEY=your_actual_fmp_api_key_here
```

## Features You'll Get

### Professional-Quality Analysis
- **Investment Thesis**: Clear, concise investment opportunity summary
- **Arguments Supporting Thesis**: Specific bullish factors with metrics
- **Counter-Arguments & Risks**: Key risk factors and vulnerabilities
- **Financial Highlights**: Valuation, profitability, strength, and dividend metrics
- **Buy/Hold/Sell Recommendation**: With price targets and confidence levels

### Example Output
Instead of generic bull/bear points, you'll get analysis like:

**Investment Thesis:**
"AAPL presents a compelling value proposition with strong brand loyalty, expanding services revenue, and attractive capital return program, though faces growth deceleration and regulatory headwinds."

**Supporting Arguments:**
- "Services segment revenue grew 16.3% YoY to $22.3B, demonstrating recurring revenue strength with 85%+ gross margins significantly above hardware"
- "Trading at 24.5x P/E vs sector average of 27.2x, representing 10% valuation discount despite superior ROE of 147% vs sector average of 12%"
- "$90B annual buyback program reducing share count 3.5% annually while maintaining 0.5% dividend yield"

### Data Sources
- **Financial Modeling Prep**: Real-time market data, financial statements, ratios, peer comparisons
- **Gemini 2.5 Flash**: AI-powered analysis with thinking capabilities
- **Yahoo Finance**: Supplementary market data and news

## Usage

Once set up, the professional analysis will automatically replace the basic bull/bear case sections. The analysis is generated on-demand when you view a stock detail page.

## Cost Optimization

Both APIs offer generous free tiers:
- **Gemini 2.5 Flash**: Completely free with high limits
- **Financial Modeling Prep**: 250 requests/day free (sufficient for most usage)

## Troubleshooting

1. **"API key not configured" error**: Check your `.env.local` file and restart the dev server
2. **"Rate limit exceeded"**: Wait a few minutes before trying again
3. **"No analysis generated"**: Check your Supabase function logs for detailed error messages

## Upgrading to Paid Plans

If you need higher limits:
- **Financial Modeling Prep Pro**: $14/month for 1,000 requests/day
- **Google Cloud AI**: Pay-per-use pricing (very affordable)

The free tiers should handle most personal and small business usage patterns comfortably.