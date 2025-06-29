// Stock Analysis Utility Functions

// Note: Using any for external API data with complex/unknown structure
/* eslint-disable @typescript-eslint/no-explicit-any */
interface StockData {
  overview: any;
  earnings: any;
  daily_data: any;
  rsi: any;
  bbands: any;
  news_sentiment: any;
}

interface AnalysisResult {
  recommendation: 'BUY' | 'HOLD' | 'SELL';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
  financialHealthScore: number;
  bullCase: Array<{ text: string; strength: 'strong' | 'moderate' | 'weak' }>;
  bearCase: Array<{ text: string; strength: 'strong' | 'moderate' | 'weak' }>;
  targetPrice?: number;
  priceTargets: {
    goodBuyPrice: number;
    goodSellPrice: number;
    currentValue: 'undervalued' | 'fairly_valued' | 'overvalued';
  };
}

export function analyzeStock(data: StockData, currentPrice: number): AnalysisResult {
  const overview = data.overview;
  const rsiData = data.rsi?.['Technical Analysis: RSI'];
  const latestRSI = rsiData ? parseFloat((Object.values(rsiData)[0] as any)?.RSI || '0') : null;
  
  // Calculate financial health score
  const healthScore = calculateFinancialHealthScore(overview);
  
  // Generate bull/bear cases
  const bullCase = generateBullCase(overview, latestRSI, data.earnings);
  const bearCase = generateBearCase(overview, latestRSI, data.news_sentiment);
  
  // Generate recommendation and price targets
  const { recommendation, confidence, reason, targetPrice } = generateRecommendation(
    overview, 
    latestRSI, 
    healthScore, 
    currentPrice,
    bullCase.length,
    bearCase.length
  );

  // Calculate price targets
  const priceTargets = calculatePriceTargets(overview, currentPrice, recommendation, confidence);

  return {
    recommendation,
    confidence,
    reason,
    financialHealthScore: healthScore,
    bullCase,
    bearCase,
    targetPrice,
    priceTargets
  };
}

function calculateFinancialHealthScore(overview: any): number {
  let score = 50; // Base score
  
  // P/E Ratio (lower is better for value)
  const pe = parseFloat(overview?.PERatio);
  if (!isNaN(pe)) {
    if (pe < 15) score += 15;
    else if (pe < 25) score += 10;
    else if (pe > 30) score -= 10;
  }
  
  // ROE (higher is better)
  const roe = parseFloat(overview?.ReturnOnEquityTTM);
  if (!isNaN(roe)) {
    if (roe > 0.15) score += 15;
    else if (roe > 0.10) score += 10;
    else if (roe < 0.05) score -= 10;
  }
  
  // Debt to Equity (lower is better)
  const de = parseFloat(overview?.DebtToEquityRatio);
  if (!isNaN(de)) {
    if (de < 0.3) score += 10;
    else if (de < 0.5) score += 5;
    else if (de > 1.0) score -= 10;
  }
  
  // P/B Ratio (lower is better for value)
  const pb = parseFloat(overview?.PriceToBookRatio);
  if (!isNaN(pb)) {
    if (pb < 1.5) score += 10;
    else if (pb < 3.0) score += 5;
    else if (pb > 5.0) score -= 10;
  }
  
  return Math.max(0, Math.min(100, score));
}

function generateBullCase(overview: any, rsi: number | null, earnings: any): Array<{ text: string; strength: 'strong' | 'moderate' | 'weak' }> {
  const bullPoints = [];
  
  // P/E Analysis
  const pe = parseFloat(overview?.PERatio);
  if (!isNaN(pe) && pe < 15) {
    bullPoints.push({
      text: `Attractive valuation with P/E ratio of ${pe.toFixed(1)}x below market average`,
      strength: 'strong' as const
    });
  } else if (!isNaN(pe) && pe < 20) {
    bullPoints.push({
      text: `Reasonable valuation with P/E ratio of ${pe.toFixed(1)}x`,
      strength: 'moderate' as const
    });
  }
  
  // ROE Analysis
  const roe = parseFloat(overview?.ReturnOnEquityTTM);
  if (!isNaN(roe) && roe > 0.15) {
    bullPoints.push({
      text: `Strong profitability with ROE of ${(roe * 100).toFixed(1)}% indicating efficient management`,
      strength: 'strong' as const
    });
  } else if (!isNaN(roe) && roe > 0.10) {
    bullPoints.push({
      text: `Solid profitability with ROE of ${(roe * 100).toFixed(1)}%`,
      strength: 'moderate' as const
    });
  }
  
  // Technical Analysis
  if (rsi && rsi < 30) {
    bullPoints.push({
      text: `Oversold condition with RSI at ${rsi.toFixed(1)} suggests potential rebound`,
      strength: 'moderate' as const
    });
  }
  
  // Low Debt
  const de = parseFloat(overview?.DebtToEquityRatio);
  if (!isNaN(de) && de < 0.3) {
    bullPoints.push({
      text: `Conservative balance sheet with low debt-to-equity ratio of ${de.toFixed(2)}`,
      strength: 'strong' as const
    });
  }
  
  // Earnings Growth
  if (earnings?.quarterlyReports?.length >= 2) {
    const recent = earnings.quarterlyReports[0];
    const previous = earnings.quarterlyReports[1];
    if (recent && previous) {
      const recentEPS = parseFloat(recent.reportedEPS);
      const previousEPS = parseFloat(previous.reportedEPS);
      if (!isNaN(recentEPS) && !isNaN(previousEPS) && recentEPS > previousEPS) {
        bullPoints.push({
          text: `Growing earnings with latest EPS of $${recentEPS.toFixed(2)} vs $${previousEPS.toFixed(2)} previous quarter`,
          strength: 'strong' as const
        });
      }
    }
  }
  
  return bullPoints;
}

function generateBearCase(overview: any, rsi: number | null, newsSentiment: any): Array<{ text: string; strength: 'strong' | 'moderate' | 'weak' }> {
  const bearPoints = [];
  
  // High P/E
  const pe = parseFloat(overview?.PERatio);
  if (!isNaN(pe) && pe > 30) {
    bearPoints.push({
      text: `High valuation with P/E ratio of ${pe.toFixed(1)}x may limit upside potential`,
      strength: 'moderate' as const
    });
  } else if (!isNaN(pe) && pe > 25) {
    bearPoints.push({
      text: `Elevated P/E ratio of ${pe.toFixed(1)}x suggests premium pricing`,
      strength: 'weak' as const
    });
  }
  
  // High Debt
  const de = parseFloat(overview?.DebtToEquityRatio);
  if (!isNaN(de) && de > 1.0) {
    bearPoints.push({
      text: `High debt burden with debt-to-equity ratio of ${de.toFixed(2)} may constrain financial flexibility`,
      strength: 'strong' as const
    });
  } else if (!isNaN(de) && de > 0.6) {
    bearPoints.push({
      text: `Elevated debt levels with D/E ratio of ${de.toFixed(2)}`,
      strength: 'moderate' as const
    });
  }
  
  // Technical Overbought
  if (rsi && rsi > 70) {
    bearPoints.push({
      text: `Overbought condition with RSI at ${rsi.toFixed(1)} suggests potential pullback`,
      strength: 'moderate' as const
    });
  }
  
  // Low ROE
  const roe = parseFloat(overview?.ReturnOnEquityTTM);
  if (!isNaN(roe) && roe < 0.05) {
    bearPoints.push({
      text: `Weak profitability with ROE of only ${(roe * 100).toFixed(1)}%`,
      strength: 'strong' as const
    });
  }
  
  // Negative news sentiment
  if (newsSentiment?.overall_sentiment_score && parseFloat(newsSentiment.overall_sentiment_score) < -0.2) {
    bearPoints.push({
      text: `Recent negative news sentiment may pressure stock performance`,
      strength: 'moderate' as const
    });
  }
  
  return bearPoints;
}

function generateRecommendation(
  overview: any, 
  rsi: number | null, 
  healthScore: number, 
  currentPrice: number,
  bullPointsCount: number,
  bearPointsCount: number
): { recommendation: 'BUY' | 'HOLD' | 'SELL'; confidence: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string; targetPrice?: number } {
  
  let score = 0;
  const reasons = [];
  
  // Health score influence
  if (healthScore >= 80) {
    score += 2;
    reasons.push('strong fundamentals');
  } else if (healthScore >= 60) {
    score += 1;
    reasons.push('solid fundamentals');
  } else if (healthScore < 40) {
    score -= 1;
    reasons.push('weak fundamentals');
  }
  
  // Technical analysis
  if (rsi && rsi < 30) {
    score += 1;
    reasons.push('oversold technicals');
  } else if (rsi && rsi > 70) {
    score -= 1;
    reasons.push('overbought technicals');
  }
  
  // Bull vs Bear case strength
  if (bullPointsCount > bearPointsCount + 1) {
    score += 1;
    reasons.push('multiple bullish factors');
  } else if (bearPointsCount > bullPointsCount + 1) {
    score -= 1;
    reasons.push('multiple risk factors');
  }
  
  // P/E specific
  const pe = parseFloat(overview?.PERatio);
  if (!isNaN(pe) && pe < 15) {
    score += 1;
    reasons.push('attractive valuation');
  } else if (!isNaN(pe) && pe > 30) {
    score -= 1;
    reasons.push('high valuation');
  }
  
  // Generate recommendation
  let recommendation: 'BUY' | 'HOLD' | 'SELL';
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  
  if (score >= 3) {
    recommendation = 'BUY';
    confidence = 'HIGH';
  } else if (score >= 2) {
    recommendation = 'BUY';
    confidence = 'MEDIUM';
  } else if (score >= 1) {
    recommendation = 'BUY';
    confidence = 'LOW';
  } else if (score >= -1) {
    recommendation = 'HOLD';
    confidence = score === 0 ? 'MEDIUM' : 'LOW';
  } else if (score >= -2) {
    recommendation = 'SELL';
    confidence = 'LOW';
  } else {
    recommendation = 'SELL';
    confidence = 'MEDIUM';
  }
  
  const reason = reasons.length > 0 ? `Based on ${reasons.join(', ')}` : 'Mixed signals in analysis';
  
  // Simple target price calculation (15% upside for BUY, 5% downside for SELL)
  let targetPrice: number | undefined;
  if (recommendation === 'BUY') {
    targetPrice = currentPrice * 1.15;
  } else if (recommendation === 'SELL') {
    targetPrice = currentPrice * 0.95;
  }
  
  return { recommendation, confidence, reason, targetPrice };
}

function calculatePriceTargets(
  overview: any, 
  currentPrice: number, 
  recommendation: 'BUY' | 'HOLD' | 'SELL',
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
): { goodBuyPrice: number; goodSellPrice: number; currentValue: 'undervalued' | 'fairly_valued' | 'overvalued' } {
  
  // Check if we have rate limit or no data (Alpha Vantage returns Information message when rate limited)
  const hasRateLimit = overview?.Information && overview.Information.includes('rate limit');
  
  let fairValue: number;
  
  if (hasRateLimit || !overview || Object.keys(overview).length === 0) {
    // When rate limited or no data, use current price with reasonable assumptions
    fairValue = currentPrice;
    console.log('Using current price as fair value due to rate limit or missing data');
  } else {
    // Try to get fundamental data
    const pe = parseFloat(overview?.PERatio);
    const eps = parseFloat(overview?.EPS);
    const bookValue = parseFloat(overview?.BookValue);
    
    // Only use fundamental analysis if we have valid data
    if (pe && eps && pe > 0 && eps > 0) {
      // DCF-inspired fair value (simplified using P/E and growth assumptions)
      const industryAvgPE = 18; // Conservative industry average
      const conservativePE = Math.min(pe * 0.9, industryAvgPE); // 10% discount or industry avg
      const fairValueFromEarnings = eps * conservativePE;
      
      // Book value approach
      const fairValueFromBook = bookValue && bookValue > 0 ? bookValue * 1.5 : currentPrice;
      
      // Average the approaches, weight earnings method more heavily
      fairValue = (fairValueFromEarnings * 0.7 + fairValueFromBook * 0.3);
      
      // Sanity check - if calculated fair value is too far from current price, use current price as base
      if (fairValue < currentPrice * 0.3 || fairValue > currentPrice * 3) {
        fairValue = currentPrice;
      }
    } else {
      // Use current price as fair value when fundamental data is unavailable
      fairValue = currentPrice;
    }
  }
  
  // Calculate good buy price (15% below fair value)
  const goodBuyPrice = fairValue * 0.85;
  
  // Calculate good sell price (20% above fair value)
  const goodSellPrice = fairValue * 1.20;
  
  // Adjust prices based on confidence
  const confidenceMultiplier = confidence === 'HIGH' ? 1.05 : confidence === 'LOW' ? 0.95 : 1.0;
  
  // Determine current valuation
  let currentValue: 'undervalued' | 'fairly_valued' | 'overvalued';
  if (currentPrice < goodBuyPrice * 1.05) { // 5% buffer around good buy price
    currentValue = 'undervalued';
  } else if (currentPrice > goodSellPrice * 0.95) { // 5% buffer around good sell price
    currentValue = 'overvalued';
  } else {
    currentValue = 'fairly_valued';
  }
  
  return {
    goodBuyPrice: Math.round(goodBuyPrice * confidenceMultiplier * 100) / 100,
    goodSellPrice: Math.round(goodSellPrice * confidenceMultiplier * 100) / 100,
    currentValue
  };
}

export function formatNumber(value: any, type: 'currency' | 'percentage' | 'ratio' | 'number' = 'number'): string {
  if (value === null || value === undefined || value === 'None' || value === '') return 'N/A';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'N/A';
  
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(num);
    case 'percentage':
      return `${(num * 100).toFixed(1)}%`;
    case 'ratio':
      return num.toFixed(2);
    default:
      return num.toLocaleString();
  }
} 