# Project: "Signal" - Intelligent Stock Monitoring & Alerting Dashboard

## 1. Introduction & Vision

**Project "Signal"** is a web-based application designed for retail investors who want to make data-driven decisions on which stocks to buy. The application provides a personal, customizable dashboard to monitor a wide range of financial metrics and qualitative indicators. Its key feature is a proactive notification system that sends real-time alerts to a user's Telegram bot when specific, user-defined "buy" signals are triggered.

The vision is to create a powerful, intuitive, and automated tool that filters market noise and delivers actionable intelligence directly to the user.

## 2. Architecture

### 2.1 Backend Structure
The application uses **Supabase** as the backend-as-a-service (BaaS) solution, providing:
- **Authentication**: Supabase Auth with email/password
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Edge Functions**: Deno/TypeScript serverless functions for API endpoints
- **Real-time capabilities**: Built-in subscriptions and real-time updates

### 2.2 Edge Functions Structure
Located in `supabase/functions/`, each function is a Deno TypeScript module:
- **stock-search/**: Alpha Vantage API integration for stock symbol search
- **stock-details/**: Comprehensive stock data fetching (fundamentals, technicals, news)
- **alert-monitor/**: Background monitoring and alert triggering system
- **send-telegram-message/**: Telegram Bot API integration for notifications

### 2.3 Frontend Structure
- **app/**: Next.js App Router pages (auth, dashboard, stock detail)
- **components/**: React components organized by feature
  - **auth/**: Login and registration forms
  - **ui/**: Reusable UI components (shadcn/ui)
  - Core features: StockSearch, Watchlist, AlertForm, AlertList, TelegramSettings
- **lib/supabase.ts**: Supabase client configuration
- **lib/api.ts**: API client functions for Supabase communication
- **lib/types/definitions.ts**: Auto-generated TypeScript types from database schema
- **lib/utils.ts**: Utility functions (tailwind-merge, clsx)

### 2.4 Key Integrations
- **Authentication**: Supabase Auth with automatic JWT token management
- **Database**: PostgreSQL with Row Level Security policies
- **Stock Data**: Alpha Vantage API for real-time and historical data
- **Notifications**: Telegram Bot API for alert delivery
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **Icons**: Lucide React for consistent iconography

### 2.5 Database Models
All tables use UUID primary keys and include Row Level Security policies:

- **profiles**: User metadata and Telegram settings
  - Links to Supabase Auth users
  - Stores telegram_chat_id and telegram_bot_token
  
- **watchlist_items**: User's tracked stocks
  - symbol, company_name, user_id
  
- **stock_notes**: User's personal notes per stock
  - symbol, note, user_id
  
- **alerts**: Custom user-defined alert conditions
  - symbol, alert_type, threshold, is_active, user_id

### 2.6 API Patterns
- **Edge Functions**: Serverless Deno functions with CORS support
- **Database Operations**: Direct Supabase client calls with RLS enforcement
- **Real-time Updates**: Supabase subscriptions for live data
- **Error Handling**: Consistent error responses across all functions
- **Authentication**: Automatic user context via Supabase Auth

## 2.7 Environment Variables
Required for Edge Functions:
- `ALPHA_VANTAGE_API_KEY`: For stock data API access
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: For server-side operations
- `TELEGRAM_BOT_TOKEN`: Optional fallback for Telegram notifications

Required for Frontend:
- `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase anon key

## 2.8 Development Setup
- **Local Development**: Supabase CLI for local development stack
- **Database**: PostgreSQL (local: port 54322, Supabase Studio: port 54323)
- **Edge Functions**: Deno runtime with local testing capabilities
- **Frontend**: Next.js development server on port 3000
- **Type Generation**: Automatic TypeScript type generation from database schema
- **Migrations**: SQL migration files in `supabase/migrations/`

## 2.9 Development Commands
- `npm run supabase:start`: Start local Supabase stack
- `npm run supabase:stop`: Stop local Supabase stack
- `npm run supabase:generate-types`: Generate TypeScript types from database
- `npm run supabase:db-reset`: Reset local database with migrations
- `npm run dev`: Start Next.js development server

## 3. Functional Requirements

### 3.1. User Account & Authentication
* **FR-1.1:** Users must be able to sign up and log in using email and password via Supabase Auth.
* **FR-1.2:** Secure password storage is handled automatically by Supabase Auth.
* **FR-1.3:** The system must allow users to reset their forgotten passwords via Supabase Auth.
* **FR-1.4:** Users must be able to securely connect their Telegram account to receive notifications by providing a Bot Token and Chat ID within the app's settings.

### 3.2. Stock Search & Watchlist
* **FR-2.1:** The application must provide a search functionality to find stocks by ticker symbol (e.g., AAPL) or company name (e.g., Apple Inc.) via the stock-search Edge Function.
* **FR-2.2:** Users must be able to add and remove stocks from a personal "Watchlist" stored in the watchlist_items table.
* **FR-2.3:** The Watchlist should be the primary view, displaying a high-level summary of all monitored stocks with real-time updates.

### 3.3. The Dashboard
* **FR-3.1: Main Dashboard View:** This will be a customizable grid or list view of the user's Watchlist. For each stock, the user can select which key metrics to display.
* **FR-3.2: Detailed Stock View:** Clicking on a stock from the Watchlist will open a detailed page with comprehensive information, including all metrics listed below.

### 3.4. Monitored Metrics
The application must fetch and display the following metrics for each stock via the stock-details Edge Function.

#### 3.4.1. Fundamental Analysis Metrics
* Price-to-Earnings (P/E) Ratio
* Price-to-Book (P/B) Ratio
* Earnings Per Share (EPS) (Quarterly and Trailing Twelve Months - TTM)
* Return on Equity (ROE)
* Debt-to-Equity (D/E) Ratio
* Free Cash Flow (FCF)
* Price/Earnings-to-Growth (PEG) Ratio

#### 3.4.2. "Smart Money" Indicators
* Percentage of Institutional Ownership
* Top 5 Institutional Holders (Name, % holding)
* Summary of recent (last quarter) 13F filing activity (net increase/decrease in shares held by institutions).

#### 3.4.3. Technical Analysis Indicators
* 50-day Moving Average (MA)
* 200-day Moving Average (MA)
* Relative Strength Index (RSI - 14 day)
* Bollinger Bands (20-day)

#### 3.4.4. Qualitative Data
* A section in the detailed view to display latest company news headlines (fetched via Alpha Vantage News API).
* A user-editable "Notes" field for each stock stored in the stock_notes table to jot down personal research and qualitative assessments (e.g., "Strong management," "Wide economic moat").

### 3.5. Alerting & Notification System
This is a core feature of the application managed by the alert-monitor Edge Function.

* **FR-4.1: Configurable Alerts:** For any stock in their Watchlist, a user must be able to create custom alerts stored in the alerts table.
* **FR-4.2: Trigger Conditions:** Users should be able to set alerts based on the following conditions:
    * **P/E Ratio** crosses *below* a specified value.
    * **RSI** drops *below* a specified value (e.g., 30).
    * **Price** crosses *above* the 50-day or 200-day Moving Average.
    * A "Golden Cross" event occurs (50-day MA crosses above the 200-day MA).
    * A significant **new institutional buy** is reported (e.g., a top-tier fund takes a new position, defined by a configurable threshold).
    * **Price** touches or crosses *below* the lower Bollinger Band.
* **FR-4.3: Notification Delivery:** When a trigger condition is met, the alert-monitor function must immediately send a notification to the user's connected Telegram bot via the send-telegram-message function.

### 3.6. Telegram Bot Integration
* **FR-5.1: Alert Message Format:** The Telegram message must be clear and concise.
    * **Example:** "📈 **SIGNAL on AAPL** 📉\n**Trigger:** RSI below 30\n**Current RSI:** 28.5\n**Price:** $175.20"
* **FR-5.2: Bot Commands:** The bot should respond to simple commands.
    * `/watchlist`: Returns a quick summary of stocks on the user's watchlist with current price.
    * `/help`: Lists available commands.

## 4. Non-Functional Requirements

### 4.1. Data
* **NFR-1.1: Data Source:** The application must integrate with Alpha Vantage API via Edge Functions to source all market data. The API must provide both real-time and historical data.
* **NFR-1.2: Data Accuracy:** The data displayed must be accurate and timely. For pricing, real-time or near-real-time (e.g., < 1-minute delay) is required. Fundamental data can be updated daily. 13F data is updated quarterly.

### 4.2. Performance
* **NFR-2.1: Latency:** Dashboard and page load times must be under 3 seconds.
* **NFR-2.2: Real-time Alerts:** Notifications should be sent within 1 minute of the trigger event occurring via the alert-monitor function.

### 4.3. Usability & Design (UI/UX)
* **NFR-3.1: Responsive Design:** The application must be fully usable on desktop, tablet, and mobile browsers.
* **NFR-3.2: Intuitiveness:** The interface should be clean, modern, and easy to navigate. Data visualization is key. Use charts (e.g., line charts for price history, bar charts for fundamentals) to make complex data easily digestible.
* **NFR-3.3: Clarity:** Use tooltips to explain what each metric means on hover.

### 4.4. Reliability & Availability
* **NFR-4.1: Uptime:** The application should have an uptime of 99.8% leveraging Supabase's infrastructure.
* **NFR-4.2: Data Redundancy:** The system should handle API connection failures gracefully, showing cached data or a clear error message.

### 4.5. Security
* **NFR-5.1: Data Encryption:** All user data is encrypted in transit (SSL/TLS) and at rest via Supabase's security features.
* **NFR-5.2: Authentication Security:** Supabase Auth provides secure authentication with JWT tokens and Row Level Security.
* **NFR-5.3: API Security:** All calls to third-party data providers are secured via API keys stored as environment variables, never exposed client-side.

### 4.6. Scalability
* **NFR-6.1:** The application architecture leverages Supabase's auto-scaling infrastructure to handle a growing number of users and alerts without performance degradation.

## 5. Technology Stack

*   **Frontend:** Next.js 14 with TypeScript, Tailwind CSS, Shadcn UI, and Lucide-React
*   **Backend:** Supabase (PostgreSQL database, Auth, Edge Functions)
*   **Edge Functions:** Deno with TypeScript
*   **Database:** PostgreSQL with Row Level Security
*   **Data Source:** Alpha Vantage API
*   **Notifications:** Telegram Bot API
*   **Deployment:** Vercel (frontend), Supabase (backend)

## 6. Authentication UX Enhancements

### 6.1 Overview
The application implements a sophisticated authentication user experience that eliminates jarring error messages and provides seamless access to functionality based on authentication state.

### 6.2 Smart Authentication Flow
- **Destination Memory**: AuthGuard stores the intended destination before redirecting to authentication
- **Automatic Redirect**: After successful login/registration, users return to their original intended page
- **Graceful Loading**: Enhanced loading states with proper animations and messaging
- **Session Persistence**: Uses sessionStorage to maintain redirect context across navigation

### 6.3 Component-Level Authentication Patterns
Each component handles unauthenticated users with contextual prompts instead of error messages:

#### 6.3.1 Watchlist Component
- **Auth Prompt**: Lock icon with "Sign in to view your watchlist" message
- **Value Proposition**: "Keep track of your favorite stocks by creating an account"
- **Action**: Direct sign-in button with blue styling

#### 6.3.2 AlertList Component
- **Auth Prompt**: Bell icon with "Sign in to view your alerts" message
- **Value Proposition**: "Get notified when your stocks hit target prices"
- **Action**: Contextual sign-in button

#### 6.3.3 AlertForm Component
- **Auth Prompt**: Alert icon with "Sign in to create price alerts" message
- **Value Proposition**: "Get notified when your stocks reach target prices"
- **Action**: Direct sign-in button

#### 6.3.4 TelegramSettings Component
- **Auth Prompt**: Chat icon with "Sign in to configure Telegram" message
- **Value Proposition**: "Connect your Telegram account to receive alert notifications"
- **Action**: Sign-in button with explanation

#### 6.3.5 StockSearch Component
- **Progressive Functionality**: Search works without authentication
- **Info Banner**: Blue informational banner explaining sign-in benefits
- **Disabled States**: Buttons show "Sign in to Add" instead of being broken
- **Contextual Messaging**: Toast messages guide users to sign in when needed

### 6.4 API Error Handling Architecture
- **AuthError Interface**: Structured error objects with `isAuthError` flag
- **Type Guards**: `isAuthError()` function for safe error checking
- **Graceful Returns**: API functions return auth errors instead of throwing exceptions
- **Component Handling**: Components check for auth errors and handle gracefully

### 6.5 Technical Implementation
```typescript
// AuthError pattern
export interface AuthError {
  isAuthError: true
  message: string
}

// Usage in API functions
async function getAuthenticatedUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: { isAuthError: true, message: 'Please sign in to continue' } }
  }
  return { user }
}

// Component usage
const result = await getWatchlist()
if (isAuthError(result)) {
  // Handle gracefully without throwing
  return
}
```

### 6.6 User Experience Benefits
- **No Error Messages**: Eliminated all "Error: Not authenticated" messages
- **Progressive Enhancement**: Core functionality (stock search) works without authentication
- **Clear Value Proposition**: Each component explains why signing in is beneficial
- **Consistent Design**: All auth prompts follow the same design pattern
- **Professional Feel**: Smooth, enterprise-grade authentication experience
- **Contextual Guidance**: Users understand exactly what they'll get by signing in

### 6.7 Design System
- **Icons**: Contextual icons (lock, bell, chat, alert) for each auth prompt
- **Colors**: Blue color scheme for auth prompts and actions
- **Typography**: Clear hierarchy with bold headings and descriptive text
- **Spacing**: Consistent padding and margins across all auth prompts
- **Responsive**: All auth prompts work seamlessly on mobile and desktop

---

# Development Plan & Task List

This project will be developed in phases, focusing on delivering core functionality first and then expanding.

## Phase 1: Core Application Setup & User Authentication ✅

**Goal:** A working application where users can sign up, log in, and manage their watchlist.

**Tasks:**

### Frontend Setup & Authentication: ✅
*   Initialize Next.js project with TypeScript, Tailwind CSS ✅
*   Integrate Shadcn UI (manual setup) ✅
*   Integrate Lucide-React for icons ✅
*   Create basic layout and home page ✅
*   Implement user registration form with Supabase Auth ✅
*   Implement user login form with Supabase Auth ✅
*   Implement client-side authentication logic (Supabase Auth context) ✅
*   Create a protected dashboard route ✅

### Backend Setup & Authentication: ✅
*   Set up Supabase project ✅
*   Configure PostgreSQL database with migrations ✅
*   Define database schema (profiles, watchlist_items, stock_notes, alerts) ✅
*   Implement Row Level Security policies ✅
*   Set up automatic profile creation trigger ✅
*   Configure Supabase Auth ✅

## Phase 2: Stock Search & Watchlist Management ✅

**Goal:** Users can search for stocks and add/remove them from their watchlist.

**Tasks:**

### Backend: ✅
*   Create stock-search Edge Function with Alpha Vantage integration ✅
*   Implement watchlist CRUD operations via Supabase client ✅
*   Set up database policies for watchlist_items table ✅

### Frontend: ✅
*   Create stock search component ✅
*   Display search results ✅
*   Implement "Add to Watchlist" functionality ✅
*   Display user's watchlist on the dashboard ✅
*   Implement "Remove from Watchlist" functionality ✅

## Phase 3: Detailed Stock View & Metric Display ✅

**Goal:** Display comprehensive stock information and metrics.

**Tasks:**

### Backend: ✅
*   Create stock-details Edge Function for comprehensive stock data ✅
*   Integrate multiple Alpha Vantage API endpoints (overview, earnings, daily, RSI, Bollinger Bands, news) ✅
*   Implement stock notes CRUD operations ✅

### Frontend: ✅
*   Create a detailed stock view page ✅
*   Display all fundamental, smart money, and technical analysis metrics ✅
*   Implement news headlines display ✅
*   Implement user-editable "Notes" field ✅
*   Integrate charting library (Recharts) for data visualization ✅

## Phase 4: Alerting & Notification System (Telegram Integration) ✅

**Goal:** Users can set custom alerts and receive notifications via Telegram.

**Tasks:**

### Backend: ✅
*   Create send-telegram-message Edge Function ✅
*   Create alert-monitor Edge Function for background monitoring ✅
*   Implement alert CRUD operations via Supabase client ✅
*   Develop logic for all specified trigger conditions (P/E, RSI, MA crosses, Golden Cross, Bollinger Bands) ✅
*   Set up alert evaluation and notification system ✅

### Frontend: ✅
*   Create UI for configuring custom alerts ✅
*   Display active alerts for each stock ✅
*   Implement Telegram connection settings in user profile ✅

## Phase 5: Refinement & Deployment ✅

**Goal:** Polish the application, ensure responsiveness, and prepare for deployment.

**Tasks:**

*   Implement responsive design across all pages ✅
*   Optimize performance (frontend and backend) ✅
*   Add error handling and user feedback mechanisms ✅
*   Set up proper environment variable management ✅
*   Configure Supabase production environment ✅
*   Set up deployment pipeline ✅

## Phase 6: Authentication UX Enhancement ✅

**Goal:** Eliminate authentication error messages and create seamless user experience.

**Tasks:**

*   Implement smart authentication flow with destination memory ✅
*   Create component-level authentication prompts ✅
*   Design consistent auth prompt system with contextual icons ✅
*   Implement graceful API error handling with AuthError interface ✅
*   Add progressive functionality (search without auth) ✅
*   Enhance loading states and user feedback ✅
*   Implement automatic redirect after authentication ✅

## Current Status

✅ **All phases completed** - The application has been successfully developed with comprehensive functionality and enterprise-grade user experience:

- **Authentication**: Supabase Auth with seamless UX and smart redirect flow
- **Database**: PostgreSQL with Row Level Security and optimized performance
- **Stock Data**: Alpha Vantage integration via Edge Functions with comprehensive metrics
- **Watchlist Management**: Full CRUD operations with real-time updates
- **Stock Details**: Comprehensive metric display with interactive charting
- **Alert System**: Background monitoring with Telegram notifications
- **UI/UX**: Responsive design with modern component library and contextual auth prompts
- **Error Handling**: Graceful error management with no jarring authentication errors
- **Progressive Enhancement**: Core functionality works without authentication

The application now features a **professional, enterprise-grade authentication experience** that guides users naturally through sign-up while maintaining full functionality for unauthenticated users where appropriate. All components handle authentication state gracefully with contextual prompts and clear value propositions.