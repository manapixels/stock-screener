Of course. Here is a comprehensive `requirements.md` file that you can provide to a development team. It's structured to be clear, actionable, and covers all the amazing features you've envisioned.

---

# Project: "Signal" - Intelligent Stock Monitoring & Alerting Dashboard

## 1. Introduction & Vision

**Project "Signal"** is a web-based application designed for retail investors who want to make data-driven decisions on which stocks to buy. The application will provide a personal, customizable dashboard to monitor a wide range of financial metrics and qualitative indicators. Its key feature is a proactive notification system that sends real-time alerts to a user's Telegram bot when specific, user-defined "buy" signals are triggered.

The vision is to create a powerful, intuitive, and automated tool that filters market noise and delivers actionable intelligence directly to the user.

## 2. User Roles & Personas

### 2.1. The User
The primary user is an active retail investor who is comfortable with financial terminology but needs an efficient way to track multiple stocks and metrics simultaneously. They are tech-savvy and appreciate automated, real-time alerts.

## 3. Functional Requirements

### 3.1. User Account & Authentication
* **FR-1.1:** Users must be able to sign up and log in using an email and password.
* **FR-1.2:** Secure password storage (hashing and salting) is required.
* **FR-1.3:** The system must allow users to reset their forgotten passwords.
* **FR-1.4:** Users must be able to securely connect their Telegram account to receive notifications. This will involve providing a Bot Token and Chat ID within the app's settings.

### 3.2. Stock Search & Watchlist
* **FR-2.1:** The application must provide a search functionality to find stocks by ticker symbol (e.g., AAPL) or company name (e.g., Apple Inc.).
* **FR-2.2:** Users must be able to add and remove stocks from a personal "Watchlist".
* **FR-2.3:** The Watchlist should be the primary view, displaying a high-level summary of all monitored stocks.

### 3.3. The Dashboard
* **FR-3.1: Main Dashboard View:** This will be a customizable grid or list view of the user's Watchlist. For each stock, the user can select which key metrics to display.
* **FR-3.2: Detailed Stock View:** Clicking on a stock from the Watchlist will open a detailed page with comprehensive information, including all metrics listed below.

### 3.4. Monitored Metrics
The application must fetch and display the following metrics for each stock.

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
* A section in the detailed view to display latest company news headlines (fetched via API).
* A user-editable "Notes" field for each stock to jot down personal research and qualitative assessments (e.g., "Strong management," "Wide economic moat").

### 3.5. Alerting & Notification System
This is a core feature of the application.

* **FR-4.1: Configurable Alerts:** For any stock in their Watchlist, a user must be able to create custom alerts.
* **FR-4.2: Trigger Conditions:** Users should be able to set alerts based on the following conditions:
    * **P/E Ratio** crosses *below* a specified value.
    * **RSI** drops *below* a specified value (e.g., 30).
    * **Price** crosses *above* the 50-day or 200-day Moving Average.
    * A "Golden Cross" event occurs (50-day MA crosses above the 200-day MA).
    * A significant **new institutional buy** is reported (e.g., a top-tier fund takes a new position, defined by a configurable threshold).
    * **Price** touches or crosses *below* the lower Bollinger Band.
* **FR-4.3: Notification Delivery:** When a trigger condition is met, the system must immediately send a notification to the user's connected Telegram bot.

### 3.6. Telegram Bot Integration
* **FR-5.1: Alert Message Format:** The Telegram message must be clear and concise.
    * **Example:** "📈 **SIGNAL on AAPL** 📉\n**Trigger:** RSI below 30\n**Current RSI:** 28.5\n**Price:** $175.20"
* **FR-5.2: Bot Commands:** The bot should respond to simple commands.
    * `/watchlist`: Returns a quick summary of stocks on the user's watchlist with current price.
    * `/help`: Lists available commands.

## 4. Non-Functional Requirements

### 4.1. Data
* **NFR-1.1: Data Source:** The application must integrate with a reliable third-party financial data API (e.g., Polygon.io, Alpha Vantage, IEX Cloud) to source all market data. The API must provide both real-time and historical data.
* **NFR-1.2: Data Accuracy:** The data displayed must be accurate and timely. For pricing, real-time or near-real-time (e.g., < 1-minute delay) is required. Fundamental data can be updated daily. 13F data is updated quarterly.

### 4.2. Performance
* **NFR-2.1: Latency:** Dashboard and page load times must be under 3 seconds.
* **NFR-2.2: Real-time Alerts:** Notifications should be sent within 1 minute of the trigger event occurring.

### 4.3. Usability & Design (UI/UX)
* **NFR-3.1: Responsive Design:** The application must be fully usable on desktop, tablet, and mobile browsers.
* **NFR-3.2: Intuitiveness:** The interface should be clean, modern, and easy to navigate. Data visualization is key. Use charts (e.g., line charts for price history, bar charts for fundamentals) to make complex data easily digestible.
* **NFR-3.3: Clarity:** Use tooltips to explain what each metric means on hover.

### 4.4. Reliability & Availability
* **NFR-4.1: Uptime:** The application should have an uptime of 99.8%.
* **NFR-4.2: Data Redundancy:** The system should handle API connection failures gracefully, showing cached data or a clear error message.

### 4.5. Security
* **NFR-5.1: Data Encryption:** All user data, especially passwords and API keys (for Telegram), must be encrypted in transit (SSL/TLS) and at rest.
* **NFR-5.2: Secure API Integration:** All calls to third-party data providers must be secured via API keys, which are not exposed on the client-side.

### 4.6. Scalability
* **NFR-6.1:** The application architecture should be able to handle a growing number of users and alerts without a degradation in performance.

## 5. Technology Stack (Recommendation)

*   **Frontend:** React (Next.js) with TypeScript, Tailwind CSS, Shadcn UI, and Lucide-React.
*   **Backend:** Python with FastAPI.
*   **Database:** SQLite (initially).
*   **Data Source:** Alpha Vantage API (initially).

---

# Development Plan & Task List

This project will be developed in phases, focusing on delivering core functionality first and then expanding.

## Phase 1: Core Application Setup & User Authentication

**Goal:** A working application where users can sign up, log in, and manage their watchlist.

**Tasks:**

### Frontend Setup & Authentication:
*   Initialize Next.js project with TypeScript, Tailwind CSS (Completed).
*   Integrate Shadcn UI (manual setup) (Completed).
*   Integrate Lucide-React for icons (Completed).
*   Create basic layout and home page (Completed).
*   Implement user registration form (Completed).
*   Implement user login form (Completed).
*   Implement client-side authentication logic (handling tokens, session management) (Completed).
*   Create a protected dashboard route (Completed).

### Backend Setup & Authentication:
*   Set up FastAPI project (Completed).
*   Configure SQLite database with SQLAlchemy (Completed).
*   Define User model (Completed).
*   Implement user registration API endpoint (hashing passwords) (Completed).
*   Implement user login API endpoint (JWT token generation) (Completed).
*   Implement user retrieval API endpoints (Completed).
*   Implement secure password storage and verification (Completed).

## Phase 2: Stock Search & Watchlist Management

**Goal:** Users can search for stocks and add/remove them from their watchlist.

**Tasks:**

### Backend:
*   Integrate with Alpha Vantage API for stock search (Completed).
*   Implement API endpoint for stock search (Completed).
*   Define Watchlist model in the database (Completed).
*   Implement API endpoints for adding/removing stocks from watchlist (Completed).
*   Implement API endpoint to retrieve user's watchlist (Completed).

### Frontend:
*   Create stock search component (Completed).
*   Display search results (Completed).
*   Implement "Add to Watchlist" functionality (Completed).
*   Display user's watchlist on the dashboard (Completed).
*   Implement "Remove from Watchlist" functionality (Completed).

## Phase 3: Detailed Stock View & Metric Display

**Goal:** Display comprehensive stock information and metrics.

**Tasks:**

### Backend:
*   Extend Alpha Vantage integration to fetch all required fundamental, smart money, and technical analysis metrics (Completed).
*   Implement API endpoints to retrieve detailed stock data for a given ticker (Completed).

### Frontend:
*   Create a detailed stock view page (Completed).
*   Display all fundamental, smart money, and technical analysis metrics (Completed).
*   Implement news headlines display (Completed).
*   Implement user-editable "Notes" field (Completed).
*   Integrate charting library (e.g., Recharts, Chart.js) for data visualization (Completed).

## Phase 4: Alerting & Notification System (Telegram Integration)

**Goal:** Users can set custom alerts and receive notifications via Telegram.

**Tasks:**

### Backend:
*   Implement Telegram bot integration (sending messages) (Completed).
*   Define Alert model in the database (Completed).
*   Implement API endpoints for creating, updating, and deleting alerts (Completed).
*   Develop a background task/worker to monitor stock conditions and trigger alerts (Pending).
*   Implement logic for all specified trigger conditions (P/E, RSI, MA crosses, Golden Cross, Institutional Buy, Bollinger Bands) (Pending).

### Frontend:
*   Create UI for configuring custom alerts (Completed).
*   Display active alerts for each stock (Completed).
*   Implement Telegram connection settings in user profile (Completed).

## Phase 5: Refinement & Deployment

**Goal:** Polish the application, ensure responsiveness, and prepare for deployment.

**Tasks:**

*   Implement responsive design across all pages (Completed).
*   Optimize performance (frontend and backend) (Completed).
*   Add error handling and user feedback mechanisms (Completed).
*   Write unit and integration tests (Completed).
*   Prepare deployment scripts/configurations (Completed).
