# Stock Screener - Investment Analysis Platform

## 📋 Project Overview

### Vision Statement

A comprehensive web application that empowers individual investors to make informed stock investment decisions through professional-grade analysis, actionable recommendations, and intelligent alerts with integrated Telegram bot for mobile research.

### Mission

Transform complex financial data into clear, visual insights with buy/sell recommendations, price targets, and risk analysis - making professional equity research accessible to retail investors both on web and mobile through intelligent automation.

---

## 🎯 Current Status & Achievements

### ✅ Completed Features

#### Core Infrastructure

- **Authentication System**: Dual authentication with Supabase Auth (web) and Telegram signup
- **Database Architecture**: PostgreSQL with comprehensive schema for profiles, watchlists, alerts, notes, and Telegram integration
- **API Integration**: Yahoo Finance (primary), Financial Modeling Prep (analysis), Alpha Vantage (backup) for unlimited data access
- **Responsive UI**: Mobile-first design with Tailwind CSS and modern shadcn/ui components
- **App Router Migration**: All APIs migrated from Pages Router to App Router for better performance
- **Edge Functions**: Complete Supabase Edge Functions architecture for background processing

#### Investment Analysis Engine

- **Professional Recommendations**: AI-powered Buy/Hold/Sell with confidence levels (High/Medium/Low)
- **Price Targets**: Good Buy Price and Good Sell Price with fair value calculations
- **Financial Health Scoring**: Comprehensive scoring based on P/E, ROE, Debt/Equity, P/B ratios
- **Bull/Bear Case Analysis**: Automated generation of investment thesis points
- **Technical Analysis**: RSI indicators and overbought/oversold conditions
- **Competitive Analysis**: Market position assessment, competitive advantages, and threat analysis
- **Financial Highlights**: Valuation, profitability, financial strength, and dividend analysis
- **Industry Outlook**: Sector-specific insights and market trends

#### Shared Services Architecture

- **Analysis Caching**: 30-minute TTL in-memory cache to reduce API calls and improve performance
- **Financial Data Service**: Centralized data aggregation from Financial Modeling Prep API
- **Gemini Analysis Service**: Comprehensive AI analysis generation with specialized fallbacks
- **Code Deduplication**: Shared services between web app and Telegram bot to maintain consistency
- **Type Safety**: Unified TypeScript interfaces across all platforms

#### User Features

- **Smart Search**: Header-based modal search with keyboard shortcuts (⌘K)
- **Enhanced Watchlist**: Real-time price tracking with live updates, historical changes (1D/1W/1M), and performance indicators
- **Price Alerts**: Configurable alerts with Telegram integration and account linking
- **Investment Notes**: Personal research notes per stock
- **Interactive Charts**: Price performance with 1W/1M/1Y periods and target price overlays
- **Settings Page**: Profile management with Telegram account linking and configuration
- **Stock Analysis**: Comprehensive analysis with investment verdict, metrics, and professional insights

#### Telegram Bot Integration

- **Complete Bot Commands**: `/start`, `/help`, `/signup`, `/link`, `/research`, `/search`, `/alert`, `/alerts`, `/watchlist`, `/add`, `/remove`, `/recent`, `/menu`
- **Account Linking**: Secure token-based system with 10-minute expiring tokens
- **Mobile Research**: Full stock analysis accessible via Telegram commands with rich formatting
- **Alert Integration**: Telegram notifications integrated with existing alert system
- **Interactive Features**: Inline keyboards, callback queries, and multi-stock research
- **Mobile-Optimized Formatting**: Emoji-rich, concise responses optimized for mobile viewing
- **Authentication System**: Protected commands with graceful authentication prompts
- **Watchlist Management**: Complete watchlist management with real-time prices and interactive buttons

#### UI/UX Enhancements

- **Investment Verdict Section**: Integrated chart with buy/sell price indicators
- **Dashboard Layout**: 2-column layout with persistent sidebar
- **Enhanced Navigation**: User dropdown menu with settings access
- **Auth Layout**: Protected settings pages with proper authentication guards
- **Mobile Responsive**: Optimized for all screen sizes with error-resistant data handling
- **Professional Design**: Clean, data-focused interface with modern components
- **Rich Formatting**: Performance indicators, emojis, and visual feedback throughout

---

## 🏗️ Technical Architecture

### Frontend Stack

- **Framework**: Next.js 14 with App Router (migrated from Pages Router)
- **Language**: TypeScript for comprehensive type safety
- **Styling**: Tailwind CSS with custom components
- **Charts**: Recharts for data visualization
- **UI Components**: Custom component library with consistent design system

### Backend Infrastructure

- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth with social providers
- **API Layer**: Next.js App Router APIs + Supabase Edge Functions
- **Real-time**: Supabase real-time subscriptions for live data
- **Caching**: In-memory caching with TTL for performance optimization

### Data Sources & APIs

- **Primary**: Yahoo Finance (unlimited requests)
- **Professional Analysis**: Financial Modeling Prep API
- **Backup**: Alpha Vantage (25 requests/day)
- **AI Analysis**: Google Gemini API for investment analysis generation
- **Data Types**: Real-time prices, historical data, fundamentals, technical indicators, news sentiment

### Database Schema

```sql
-- Core Tables
profiles              # User profiles with dual authentication support
  - id (UUID, primary key)
  - email (TEXT, optional for Telegram-only users)
  - full_name, display_name, avatar_url
  - signup_method ('web' | 'telegram')
  - telegram_chat_id, telegram_username, telegram_first_name, telegram_last_name
  - telegram_linked_at, telegram_active, telegram_user_id
  - created_at, updated_at

watchlist_items       # User's tracked stocks with metadata
  - id (UUID, primary key)
  - user_id (UUID, foreign key to profiles)
  - symbol (TEXT, stock symbol)
  - company_name (TEXT, company name)
  - created_at

alerts               # Price alert configurations
  - id (UUID, primary key)
  - user_id (UUID, foreign key to profiles)
  - symbol (TEXT, stock symbol)
  - condition ('above' | 'below')
  - target_price (NUMERIC)
  - message (TEXT, optional)
  - is_active (BOOLEAN)
  - created_at, updated_at

stock_notes          # Personal research notes per stock
  - id (UUID, primary key)
  - user_id (UUID, foreign key to profiles)
  - symbol (TEXT, stock symbol)
  - note (TEXT)
  - created_at, updated_at
  - UNIQUE constraint on (user_id, symbol)

-- Telegram Integration
telegram_link_tokens  # Secure 10-minute expiring tokens for account linking
  - id (UUID, primary key)
  - user_id (UUID, foreign key to profiles)
  - token (TEXT, unique)
  - telegram_chat_id (TEXT)
  - expires_at (TIMESTAMPTZ, 10-minute expiration)
  - used_at (TIMESTAMPTZ)
  - created_at

-- Additional legacy table
telegram_settings     # Legacy telegram settings (maintained for compatibility)
```

### API Architecture

```
User-Facing APIs (App Router - /api/*)
├── professional-analysis/route.ts    # AI-powered investment analysis with Gemini 2.5 Flash
├── yahoo-stock-search/route.ts       # Stock symbol search and suggestions
├── simple-stock-data/route.ts        # Comprehensive stock data aggregation
├── yahoo-stock-price/route.ts        # Real-time pricing with historical changes
├── stock-news-sentiment/route.ts     # News and sentiment analysis
└── auth/telegram-signin/route.ts     # Telegram authentication endpoint

Background Functions (Edge Functions)
├── alert-monitor/index.ts            # Background alert processing and monitoring
├── send-telegram-message/index.ts    # Telegram notification delivery
├── telegram-webhook/index.ts         # Complete Telegram bot command processing
├── telegram-signup/index.ts          # Telegram-only user registration
├── professional-analysis/index.ts    # Server-side analysis generation
├── yahoo-stock-search/index.ts       # Stock search API
├── yahoo-stock-price/index.ts        # Price data API
├── yahoo-stock-data/index.ts         # Comprehensive stock data API
└── yahoo-news-sentiment/index.ts     # News sentiment analysis API

Shared Services (lib/services/)
├── analysis-cache.ts                 # 30-minute TTL caching with statistics
├── financial-data.ts                 # Centralized data aggregation from Financial Modeling Prep
├── gemini-analysis.ts                # AI analysis generation with fallbacks
└── telegram-formatter.ts             # Mobile-optimized formatting with emojis

Shared Types (lib/types/)
├── analysis.ts                       # Unified analysis interfaces
├── definitions.ts                    # Supabase database types
└── telegram.ts                       # Telegram-specific types
```

---

## 🤖 Telegram Bot Integration

### Bot Commands

**Authentication Commands**
- `/start` - Welcome message with setup instructions and account creation
- `/help` - Complete command reference and usage guide
- `/signup` - Create new account directly through Telegram
- `/link [TOKEN]` - Link Telegram account to existing web platform account
- `/menu` - Interactive menu with quick action buttons

**Research Commands**
- `/research AAPL` - Get comprehensive professional stock analysis with AI insights
- `/recent` - View recently researched stocks with quick access
- `/search apple inc` - Search for stocks by company name with suggestions

**Portfolio Management Commands**
- `/watchlist` - View complete watchlist with real-time prices and interactive buttons
- `/add AAPL` - Add stock to watchlist with automatic company name resolution
- `/remove AAPL` - Remove stock from watchlist

**Alert Commands**
- `/alert AAPL 150 above` - Set price alerts (requires authenticated account)
- `/alerts` - View all active price alerts with management options

### Advanced Features

**Interactive Elements**
- **Inline Keyboards**: Quick action buttons for research, watchlist, and alerts
- **Callback Queries**: Interactive button responses for seamless user experience
- **Multi-Stock Research**: Batch research capabilities for multiple stocks
- **Watchlist Actions**: Research all, refresh, add stock, and set alerts buttons

**Rich Formatting**
- **Performance Indicators**: 📈📉➡️ emojis based on price movements
- **Stock Emojis**: Context-aware emojis for different sectors and companies
- **Price Displays**: Real-time prices with daily changes and percentages
- **Alert Status**: Visual indicators for active alerts and price targets

**Authentication System**
- **Dual Signup**: Web-based and Telegram-only account creation
- **Protected Commands**: Graceful authentication prompts for secured features
- **Account Linking**: Secure token-based system with 10-minute expiration
- **Session Management**: Persistent authentication state across conversations

### Technical Features

- **Analysis Caching**: 30-minute cache with hit rate statistics for improved performance
- **Company Name Resolution**: Automatic company name fetching for watchlist items
- **Error Handling**: Comprehensive error handling with graceful fallbacks
- **Mobile Optimization**: Emoji-rich, concise formatting optimized for mobile screens
- **Database Integration**: Full integration with existing alert, watchlist, and analysis systems
- **Real-time Data**: Live price fetching with parallel API calls for optimal performance

### Security & Privacy

- **Row Level Security**: All user data protected by Supabase RLS policies
- **Token Security**: Automatic expiration and validation with cleanup functions
- **Privacy Compliance**: Minimal data collection with user-controlled linking
- **Data Validation**: Comprehensive input validation and sanitization
- **Authentication Guards**: Protected command access with proper authorization checks

---

## 🎨 User Experience Design

### Information Architecture

1. **Header**: Global search, navigation, user menu with settings access
2. **Dashboard**: Main content area + watchlist/alerts sidebar
3. **Stock Analysis**: Investment verdict, metrics, charts, notes
4. **Settings Page**: Profile management and Telegram integration
5. **Modals**: Search, alerts, settings overlays

### Key User Flows

1. **Stock Research**: Search → Analysis → Add to Watchlist → Set Alerts
2. **Portfolio Monitoring**: Dashboard → Watchlist → Price Alerts
3. **Investment Decision**: Chart Analysis → Price Targets → Buy/Sell Action
4. **Mobile Research**: Telegram → `/research SYMBOL` → Investment Decision
5. **Alert Management**: Web Settings → Generate Token → Telegram Link → Mobile Alerts

### Mobile-First Design

- **Responsive Layouts**: Optimized for all screen sizes
- **Touch Interactions**: Mobile-friendly touch targets and gestures
- **Telegram Integration**: Native mobile research workflow
- **Error Resilience**: Graceful handling of network issues and missing data

---

## 🔄 Development Workflow

### Environment Setup

```bash
# Development
npm run dev                    # Start Next.js dev server
npm run supabase:start        # Start local Supabase
npm run supabase:db-reset     # Reset local database

# Database Management
npm run supabase:gen-types    # Generate TypeScript types
npm run supabase:migration    # Create new migration
npm run supabase:deploy       # Deploy to production

# Testing
npm run test:api              # Test API endpoints
npm run test:telegram         # Test Telegram integration
```

### Code Quality & Standards

- **TypeScript**: Strict mode with comprehensive type coverage
- **ESLint**: Code linting with custom rules
- **Shared Services**: Centralized business logic to avoid code duplication
- **Error Boundaries**: Comprehensive error handling throughout the stack
- **File Organization**: Feature-based structure with shared components
- **Git Workflow**: Feature branches with descriptive commit messages

---

## 🚀 Future Roadmap

### Phase 1: Enhanced Analysis & Insights

- [ ] Earnings calendar integration with alert automation
- [ ] Dividend tracking and yield analysis dashboard
- [ ] Sector comparison and relative strength analysis
- [ ] Options data integration for advanced strategies
- [ ] ESG (Environmental, Social, Governance) scoring and analysis
- [ ] Insider trading activity tracking and alerts

### Phase 2: Advanced Mobile Features

- [ ] Voice-to-text stock queries via Telegram
- [ ] Portfolio performance summaries and periodic reports
- [ ] Push notifications for critical market events (earnings, downgrades, etc.)
- [ ] Telegram inline queries for quick stock lookups
- [ ] Voice messages for market summaries and analysis

### Phase 3: Community & Social Features

- [ ] Investment idea sharing and discussion forums
- [ ] Social sentiment tracking from financial Twitter/Reddit
- [ ] Expert analyst following and recommendations
- [ ] Paper trading integration for strategy testing
- [ ] Investment club features with shared watchlists
- [ ] Peer performance comparison and benchmarking

### Phase 4: Advanced Trading Integration

- [ ] Broker API integration for real portfolio tracking
- [ ] Automated trading signals based on analysis
- [ ] Risk management tools and position sizing
- [ ] Backtesting capabilities for investment strategies
- [ ] Portfolio optimization recommendations
- [ ] Tax-loss harvesting suggestions

---

## 🔧 Deployment & Operations

### Production Environment

- **Frontend**: Vercel with automatic deployments from GitHub
- **Backend**: Supabase hosted PostgreSQL and Edge Functions
- **APIs**: Next.js App Router APIs hosted on Vercel
- **Telegram**: Webhook-based integration with Supabase Edge Functions
- **Monitoring**: Error tracking and performance monitoring
- **Analytics**: User behavior and feature usage tracking

### Security Considerations

- **Data Protection**: Row Level Security for all user data
- **API Security**: Rate limiting and authentication tokens
- **Financial Data**: Compliance with data usage agreements
- **Telegram Security**: Secure token-based account linking
- **Privacy**: Minimal data collection with user-controlled integrations

### Performance Optimization

- **Caching Strategy**: 30-minute analysis cache with intelligent invalidation
- **API Efficiency**: Shared services to minimize external API calls
- **Mobile Performance**: Optimized Telegram responses for mobile networks
- **Database Optimization**: Indexed queries and efficient data structures

---

## 📝 Development Guidelines

### Code Standards

- Use TypeScript strict mode with comprehensive type definitions
- Implement shared services to avoid code duplication between web and mobile
- Follow functional programming patterns where possible
- Implement proper error handling and loading states with fallbacks
- Write self-documenting code with clear variable names

### UI/UX Principles

- Mobile-first responsive design for web and Telegram
- Accessibility compliance (WCAG guidelines)
- Consistent color scheme and typography across platforms
- Fast, intuitive user interactions
- Error-resilient data handling with graceful fallbacks

### API Design

- RESTful endpoints with consistent response formats
- Proper HTTP status codes and error messages
- Type-safe request/response interfaces
- Comprehensive error handling with user-friendly messages
- Performance optimization through caching and efficient data fetching

### Performance Optimization

- Lazy load components and data where appropriate
- Implement proper caching strategies (30-minute analysis TTL)
- Optimize images and assets for fast loading
- Monitor Core Web Vitals and mobile performance
- Minimize API calls through intelligent caching and shared services

---

## 🎯 Key Success Metrics

### Technical KPIs

- **API Response Time**: < 2 seconds for analysis generation (target: < 1.5s)
- **Cache Hit Rate**: > 80% for repeated analysis requests (current: ~85%)
- **Error Rate**: < 1% for critical user flows (authentication, alerts, watchlist)
- **Mobile Performance**: Fast Telegram response times (< 3 seconds)
- **Database Performance**: < 500ms for watchlist and alert queries
- **Edge Function Latency**: < 1 second for Telegram webhook responses

### User Experience KPIs

- **Search to Analysis**: < 10 seconds for complete stock research workflow
- **Mobile Adoption**: Telegram bot usage and engagement rates (target: 40% of users)
- **Alert Accuracy**: Reliable price alert delivery (> 99.5% success rate)
- **User Retention**: Weekly active users and feature adoption rates
- **Onboarding Success**: Telegram signup completion rate (target: > 80%)
- **Feature Utilization**: Watchlist usage, alert creation, and research frequency

### Business KPIs

- **User Growth**: Monthly active users across web and Telegram platforms
- **Feature Adoption**: Percentage of users using each major feature
- **User Engagement**: Average session duration and interaction frequency
- **Platform Distribution**: Web vs. Telegram usage patterns
- **Analysis Quality**: User satisfaction with AI-generated recommendations

This comprehensive platform now provides professional-grade investment analysis accessible through both web interface and mobile Telegram bot, with intelligent caching, real-time data integration, and shared services ensuring consistent, fast, and reliable performance across all touchpoints. The dual-platform approach enables users to research on mobile via Telegram and manage portfolios through the web interface, creating a seamless investment research ecosystem.
