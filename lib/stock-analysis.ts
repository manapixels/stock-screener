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

  // Calculate price targets with enhanced analysis
  const priceTargets = calculatePriceTargets(
    overview, 
    currentPrice, 
    recommendation, 
    confidence,
    data.daily_data?.['Time Series (Daily)'],
    latestRSI
  );

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

// Sector-specific P/E ratios based on industry averages
const SECTOR_PE_RATIOS: Record<string, number> = {
  'Technology': 28,
  'Software': 32,
  'Healthcare': 22,
  'Biotechnology': 25,
  'Finance': 12,
  'Banking': 11,
  'Insurance': 13,
  'Utilities': 16,
  'Energy': 14,
  'Consumer Discretionary': 20,
  'Consumer Staples': 18,
  'Industrial': 16,
  'Materials': 15,
  'Real Estate': 19,
  'Telecommunications': 14,
  'Default': 18
};

// Calculate volatility from price data
function calculateVolatility(dailyData: any): number {
  if (!dailyData || Object.keys(dailyData).length < 20) return 0.15; // Default 15%
  
  const prices = Object.values(dailyData)
    .slice(0, 30) // Last 30 days
    .map((data: any) => parseFloat(data['4. close']))
    .filter(price => !isNaN(price));
  
  if (prices.length < 10) return 0.15;
  
  // Calculate daily returns
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const dailyReturn = (prices[i] - prices[i-1]) / prices[i-1];
    returns.push(dailyReturn);
  }
  
  // Calculate standard deviation (volatility)
  const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized
  
  return Math.min(Math.max(volatility, 0.08), 0.50); // Cap between 8% and 50%
}

// Find support and resistance levels from recent price data
function findSupportResistance(dailyData: any, currentPrice: number): { support: number; resistance: number } {
  if (!dailyData) return { support: currentPrice * 0.90, resistance: currentPrice * 1.10 };
  
  const prices = Object.values(dailyData)
    .slice(0, 60) // Last 60 days
    .map((data: any) => parseFloat(data['4. close']))
    .filter(price => !isNaN(price));
  
  if (prices.length < 20) return { support: currentPrice * 0.90, resistance: currentPrice * 1.10 };
  
  // Sort prices to find levels
  const sortedPrices = [...prices].sort((a, b) => a - b);
  
  // Support: Recent low but not the absolute minimum
  const support = sortedPrices[Math.floor(sortedPrices.length * 0.15)]; // 15th percentile
  
  // Resistance: Recent high but not the absolute maximum  
  const resistance = sortedPrices[Math.floor(sortedPrices.length * 0.85)]; // 85th percentile
  
  return { 
    support: Math.max(support, currentPrice * 0.75), // Don't go below 25% of current
    resistance: Math.min(resistance, currentPrice * 1.35) // Don't go above 35% of current
  };
}

// Get sector-specific P/E ratio
function getSectorPE(overview: any): number {
  const sector = overview?.Sector || '';
  const industry = overview?.Industry || '';
  
  // Try industry first, then sector, then default
  return SECTOR_PE_RATIOS[industry] || SECTOR_PE_RATIOS[sector] || SECTOR_PE_RATIOS['Default'];
}

function calculatePriceTargets(
  overview: any, 
  currentPrice: number, 
  recommendation: 'BUY' | 'HOLD' | 'SELL',
  confidence: 'HIGH' | 'MEDIUM' | 'LOW',
  dailyData: any = null,
  rsi: number | null = null
): { goodBuyPrice: number; goodSellPrice: number; currentValue: 'undervalued' | 'fairly_valued' | 'overvalued' } {
  
  // Check if we have valid data
  const hasValidData = overview && Object.keys(overview).length > 0;
  
  // Calculate volatility and technical levels
  const volatility = calculateVolatility(dailyData);
  const { support, resistance } = findSupportResistance(dailyData, currentPrice);
  
  let fairValue: number;
  
  if (!hasValidData) {
    // When no fundamental data available, use current price as fair value
    fairValue = currentPrice;
    console.log('Using current price as fair value due to missing fundamental data');
  } else {
    // Try to get fundamental data
    const pe = parseFloat(overview?.PERatio);
    const eps = parseFloat(overview?.EPS);
    const bookValue = parseFloat(overview?.BookValue);
    const pegRatio = parseFloat(overview?.PEGRatio);
    
    // Only use fundamental analysis if we have valid data
    if (pe && eps && pe > 0 && eps > 0) {
      // Use sector-specific P/E instead of fixed 18
      const sectorPE = getSectorPE(overview);
      
      // Adjust sector P/E based on company's current P/E relative to sector
      const peDiscount = pe > sectorPE ? 0.9 : 1.0; // 10% discount if overvalued vs sector
      const targetPE = Math.min(pe * peDiscount, sectorPE);
      
      // Fair value from earnings with growth consideration
      let fairValueFromEarnings = eps * targetPE;
      
      // Adjust for growth if PEG ratio is available
      if (pegRatio && pegRatio > 0 && pegRatio < 3) {
        const growthAdjustment = pegRatio < 1 ? 1.1 : pegRatio > 2 ? 0.9 : 1.0;
        fairValueFromEarnings *= growthAdjustment;
      }
      
      // Book value approach (more conservative for financial vs growth companies)
      const isFinancial = overview?.Sector?.toLowerCase().includes('financial') || 
                         overview?.Industry?.toLowerCase().includes('bank');
      const bookMultiplier = isFinancial ? 1.2 : 1.8; // Lower multiple for banks
      const fairValueFromBook = bookValue && bookValue > 0 ? bookValue * bookMultiplier : currentPrice;
      
      // Weight based on sector (growth vs value)
      const isGrowthSector = ['Technology', 'Software', 'Biotechnology'].includes(overview?.Industry || overview?.Sector);
      const earningsWeight = isGrowthSector ? 0.8 : 0.6;
      const bookWeight = 1 - earningsWeight;
      
      // Average the approaches
      fairValue = (fairValueFromEarnings * earningsWeight + fairValueFromBook * bookWeight);
      
      // Sanity check - if calculated fair value is too far from current price, use current price as base
      if (fairValue < currentPrice * 0.4 || fairValue > currentPrice * 2.5) {
        fairValue = currentPrice;
        console.log('Fair value calculation outside reasonable range, using current price');
      }
    } else {
      // Use current price as fair value when fundamental data is unavailable
      fairValue = currentPrice;
    }
  }
  
  // Calculate volatility-adjusted margins
  const baseDiscountRate = Math.max(0.10, Math.min(volatility * 0.6, 0.30)); // 10-30% range
  const basePremiumRate = Math.max(0.15, Math.min(volatility * 0.8, 0.40)); // 15-40% range
  
  // RSI adjustments - avoid buying overbought, selling oversold
  let rsiAdjustment = 1.0;
  if (rsi) {
    if (rsi > 70) {
      // Overbought - increase buy discount, decrease sell premium
      rsiAdjustment = 1.15;
    } else if (rsi < 30) {
      // Oversold - decrease buy discount, increase sell premium  
      rsiAdjustment = 0.85;
    }
  }
  
  // Calculate initial targets based on fair value
  const fundamentalBuyPrice = fairValue * (1 - baseDiscountRate * rsiAdjustment);
  const fundamentalSellPrice = fairValue * (1 + basePremiumRate / rsiAdjustment);
  
  // Integrate with technical levels
  const goodBuyPrice = Math.max(fundamentalBuyPrice, support * 1.02); // Stay slightly above support
  const goodSellPrice = Math.min(fundamentalSellPrice, resistance * 0.98); // Stay slightly below resistance
  
  // Market condition adjustments (simplified VIX proxy using volatility)
  const isHighVolatility = volatility > 0.25;
  const marketMultiplier = isHighVolatility ? 
    { buy: 0.95, sell: 1.05 } : // More aggressive in volatile markets
    { buy: 1.0, sell: 1.0 };
  
  // Confidence adjustments
  const confidenceMultiplier = {
    'HIGH': { buy: 0.98, sell: 1.02 }, // More aggressive when confident
    'MEDIUM': { buy: 1.0, sell: 1.0 },
    'LOW': { buy: 1.02, sell: 0.98 }   // More conservative when uncertain
  }[confidence];
  
  // Final price calculations
  const finalBuyPrice = goodBuyPrice * marketMultiplier.buy * confidenceMultiplier.buy;
  const finalSellPrice = goodSellPrice * marketMultiplier.sell * confidenceMultiplier.sell;
  
  // Ensure buy price is below current and sell price is above current
  const adjustedBuyPrice = Math.min(finalBuyPrice, currentPrice * 0.95);
  const adjustedSellPrice = Math.max(finalSellPrice, currentPrice * 1.05);
  
  // Determine current valuation
  let currentValue: 'undervalued' | 'fairly_valued' | 'overvalued';
  if (currentPrice <= adjustedBuyPrice * 1.03) { // 3% buffer
    currentValue = 'undervalued';
  } else if (currentPrice >= adjustedSellPrice * 0.97) { // 3% buffer
    currentValue = 'overvalued';
  } else {
    currentValue = 'fairly_valued';
  }
  
  console.log('Enhanced price targets:', {
    fairValue: fairValue.toFixed(2),
    volatility: (volatility * 100).toFixed(1) + '%',
    support: support.toFixed(2),
    resistance: resistance.toFixed(2),
    rsi,
    buyDiscount: (baseDiscountRate * 100).toFixed(1) + '%',
    sellPremium: (basePremiumRate * 100).toFixed(1) + '%'
  });
  
  return {
    goodBuyPrice: Math.round(adjustedBuyPrice * 100) / 100,
    goodSellPrice: Math.round(adjustedSellPrice * 100) / 100,
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