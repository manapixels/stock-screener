// Shared analysis types used across webapp and Telegram bot

export interface FinancialHighlights {
  valuation: string;
  profitability: string;
  financialStrength: string;
  dividend: string;
}

export interface Recommendation {
  rating: "BUY" | "HOLD" | "SELL";
  priceTarget: number;
  timeHorizon: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface ProfessionalAnalysis {
  investmentThesis: string;
  bullishArguments: string[];
  bearishArguments: string[];
  financialHighlights: FinancialHighlights;
  recommendation: Recommendation;
}

export interface AnalysisResult {
  symbol: string;
  analysis: ProfessionalAnalysis;
  lastUpdated: string;
  dataSource: string;
  cached?: boolean;
}

// Financial data types from Financial Modeling Prep API
export interface FinancialModelingPrepProfile {
  companyName?: string;
  sector?: string;
  industry?: string;
  description?: string;
  mktCap?: number;
}

export interface FinancialModelingPrepRatios {
  priceEarningsRatio?: number;
  priceToBookRatio?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  debtEquityRatio?: number;
  currentRatio?: number;
  operatingProfitMargin?: number;
  priceToSalesRatio?: number;
}

export interface FinancialModelingPrepMetrics {
  peRatio?: number;
  pbRatio?: number;
  enterpriseValueOverEBITDA?: number;
  revenueGrowth?: number;
  netIncomeGrowth?: number;
}

export interface FinancialModelingPrepQuote {
  price?: number;
  dividendYield?: number;
}

export interface NewsItem {
  title?: string;
}

export interface PeerData {
  symbol?: string;
}

export interface FinancialData {
  profile: FinancialModelingPrepProfile | null;
  ratios: FinancialModelingPrepRatios | null;
  metrics: FinancialModelingPrepMetrics | null;
  peers: PeerData[] | null;
  news: NewsItem[] | null;
  quote: FinancialModelingPrepQuote | null;
}

export interface AnalysisError {
  error: string;
  details?: string;
  fallback?: boolean;
}
