# Project: "Signal" - Smart Stock Analysis Dashboard

## 1. Vision

A web application for individual investors to quickly analyze stocks. Users type in a ticker symbol and get a clear, visual analysis of whether the stock is worth buying, complete with key metrics, trends, and actionable insights.

## 2. Core Features

### 2.1 Stock Analysis
- **Quick Search**: Type ticker → get instant analysis
- **Key Metrics**: P/E, P/B, EPS, ROE, FCF, institutional ownership
- **Technical Indicators**: RSI, Moving Averages, Bollinger Bands
- **News & Context**: Latest company news and user notes
- **Buy/Sell Signals**: Clear recommendations based on data

### 2.2 Personal Dashboard
- **Watchlist**: Track favorite stocks with real-time updates
- **Price Alerts**: Get notified when stocks hit target prices
- **Telegram Integration**: Receive alerts via Telegram bot

### 2.3 Technology Stack
- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Data Source**: Alpha Vantage API
- **Deployment**: Vercel + Supabase

## 3. Enhanced Stock Analysis (Planned)

### 3.1 Visual Analysis Page
Based on professional equity research format but simplified for individual investors:

**Fundamental Analysis Section:**
- Revenue/earnings trends (quarterly charts)
- Key ratios with sector comparisons
- Financial health indicators

**Investment Thesis Section:**
- **Bull Case**: 3-5 reasons to buy
- **Bear Case**: 3-5 risks to consider
- **Verdict**: Clear Buy/Hold/Sell recommendation

**Quick Comparison:**
- Compare against 2-3 similar companies
- Visual charts showing relative performance

**Price Analysis:**
- Current valuation vs historical ranges
- Technical analysis with clear signals

### 3.2 Implementation Plan
- Enhance current stock detail page layout
- Add comparative analysis charts
- Implement simple buy/sell recommendation logic
- Improve data visualization with better charts

## 4. Current Status

✅ **Core Features Complete:**
- Authentication with seamless UX
- Stock search and watchlist management
- Basic fundamental and technical metrics
- Price alerts with Telegram notifications
- Professional UI with responsive design

🚧 **Next Phase: Enhanced Analysis**
- Visual analysis page redesign
- Peer comparison functionality
- Investment thesis framework
- Improved charting and data presentation

## 5. Technical Architecture

### 5.1 Database Schema
- **profiles**: User settings and Telegram config
- **watchlist_items**: User's tracked stocks
- **alerts**: Price alert configurations
- **stock_notes**: Personal stock research notes

### 5.2 Edge Functions (Supabase)
- **stock-search**: Symbol search via Alpha Vantage
- **stock-details**: Comprehensive stock data aggregation
- **alert-monitor**: Background alert processing
- **send-telegram-message**: Notification delivery

### 5.3 Data Sources (Alpha Vantage)
- Company Overview (fundamentals)
- Time Series Daily (price data)
- Earnings data (quarterly trends)
- Technical indicators (RSI, Bollinger Bands)
- News sentiment

## 6. Development Commands

```bash
npm run dev                    # Start development server
npm run supabase:start        # Start local Supabase
npm run supabase:db-reset     # Reset database
```

---

*Simple, focused, effective: Help individual investors make smarter stock decisions.*