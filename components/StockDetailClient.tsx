"use client"

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, TrendingUp, DollarSign, BarChart3, MessageSquare, PenTool, ExternalLink, Clock } from 'lucide-react';
import { getStockDetails, getStockNote, saveStockNote, getStockNewsAndSentiment } from '@/lib/api';
import { analyzeStock, formatNumber } from '@/lib/stock-analysis';
import { getCurrencyFromSymbol, formatCurrencyByContext, formatPriceChange } from '@/lib/currency-utils';
import { MetricCard } from '@/components/ui/metric-card';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { RecommendationBadge } from '@/components/ui/recommendation-badge';
import { BullCase } from '@/components/ui/bull-case';
import { BearCase } from '@/components/ui/bear-case';
import { InvestmentVerdict } from '@/components/ui/investment-verdict';
import { ProfessionalAnalysis } from '@/components/ui/professional-analysis';
import { toast } from 'sonner';

// Note: Using any for external API data with complex/unknown structure
/* eslint-disable @typescript-eslint/no-explicit-any */
interface NewsItem {
  title: string
  link: string
  providerPublishTime: number
  type: string
  uuid: string
}

interface SentimentAnalysis {
  overall: 'bullish' | 'bearish' | 'neutral'
  score: number
  confidence: number
  reasoning: string
}

interface StockDetails {
  overview: any;
  earnings: any;
  daily_data: any;
  rsi: any;
  bbands: any;
  news_sentiment: any;
  currentPrice?: number;
}

interface StockDetailClientProps {
  symbol: string;
  onPriceUpdate?: (price: number) => void;
}

const sentimentConfig = {
  bullish: { 
    label: 'Bullish', 
    color: 'text-green-600', 
    bgColor: 'bg-green-50', 
    borderColor: 'border-green-200',
    icon: '🐂'
  },
  bearish: { 
    label: 'Bearish', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50', 
    borderColor: 'border-red-200',
    icon: '🐻'
  },
  neutral: { 
    label: 'Neutral', 
    color: 'text-gray-600', 
    bgColor: 'bg-gray-50', 
    borderColor: 'border-gray-200',
    icon: '⚪'
  }
}

export default function StockDetailClient({ symbol, onPriceUpdate }: StockDetailClientProps) {
  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [chartPeriod, setChartPeriod] = useState<'1W' | '1M' | '1Y'>('1M');
  const [newsData, setNewsData] = useState<{ news: NewsItem[], sentiment: SentimentAnalysis } | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStockDetails(symbol);
        setStockDetails(data);

        const note = await getStockNote(symbol);
        if (note && note.note) {
          setNoteContent(note.note);
        }

        // Fetch news and sentiment in parallel
        setNewsLoading(true);
        try {
          const newsAndSentiment = await getStockNewsAndSentiment(symbol);
          setNewsData(newsAndSentiment);
        } catch (newsError) {
          console.error('Error fetching news and sentiment:', newsError);
        } finally {
          setNewsLoading(false);
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stock details.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [symbol]);

  // Calculate current price when stockDetails changes
  const currentPrice = stockDetails?.currentPrice || 
    (stockDetails?.daily_data?.['Time Series (Daily)'] ? 
      parseFloat((Object.values(stockDetails.daily_data['Time Series (Daily)'])[0] as any)?.['4. close'] || '0') : 0);

  // Update parent component with current price
  useEffect(() => {
    if (currentPrice > 0 && onPriceUpdate) {
      onPriceUpdate(currentPrice);
    }
  }, [currentPrice, onPriceUpdate]);

  const handleSaveNote = async () => {
    try {
      await saveStockNote(symbol, noteContent);
      toast.success("Note saved successfully!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stock analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-600 text-lg font-medium">Error loading stock data</p>
        <p className="text-red-500 text-sm mt-2">{error}</p>
      </div>
    );
  }

  if (!stockDetails) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No stock details found for {symbol.toUpperCase()}</p>
      </div>
    );
  }

  // Get currency for this stock
  const currencyCode = getCurrencyFromSymbol(symbol);
  
  // Generate analysis
  const analysis = analyzeStock(stockDetails, currentPrice);

  // Format chart data based on selected period
  const dailyData = stockDetails.daily_data?.['Time Series (Daily)'];
  
  const getChartData = () => {
    if (!dailyData) return [];
    
    const allData = Object.entries(dailyData)
      .map(([date, data]: [string, any]) => ({
        date: date, // Keep original date for 1Y, format others
        displayDate: formatDateForChart(new Date(date), chartPeriod),
        fullDate: new Date(date),
        price: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume'])
      }))
      .sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
    
    // Get data based on selected period
    const now = new Date();
    let daysBack: number;
    
    switch (chartPeriod) {
      case '1W':
        daysBack = 7;
        break;
      case '1M':
        daysBack = 30;
        break;
      case '1Y':
        daysBack = 365;
        break;
      default:
        daysBack = 30;
    }
    
    return allData.slice(-daysBack);
  };

  // Format dates appropriately for each chart period
  const formatDateForChart = (date: Date, period: '1W' | '1M' | '1Y') => {
    switch (period) {
      case '1W':
        // Show day names for 1 week view
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      case '1M':
        // Show month/day for 1 month view
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '1Y':
        // Show month/year for 1 year view
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString();
    }
  };

  // Get appropriate tick count for X-axis based on period
  const getTickCount = () => {
    switch (chartPeriod) {
      case '1W':
        return 7; // Show all days for 1 week
      case '1M':
        return 6; // Show ~5-6 ticks for 1 month
      case '1Y':
        return 12; // Show ~12 months for 1 year
      default:
        return 6;
    }
  };

  // Custom tick formatter for 1Y that prevents duplicates
  const formatYearTick = (value: string, index: number, ticks: any[]) => {
    if (chartPeriod !== '1Y') return value;
    
    const date = new Date(value);
    const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    
    // Check if this month-year combo has already been shown in previous ticks
    const prevTicks = ticks.slice(0, index);
    const alreadyShown = prevTicks.some(tick => {
      const prevDate = new Date(tick.value);
      const prevMonthYear = prevDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return prevMonthYear === monthYear;
    });
    
    return alreadyShown ? '' : monthYear;
  };
  
  const chartData = getChartData();
  
  // Calculate Y-axis domain for better vertical space usage
  const getYAxisDomain = () => {
    if (chartData.length === 0) return ['auto', 'auto'];
    
    const prices = chartData.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const padding = (maxPrice - minPrice) * 0.05; // 5% padding
    
    return [
      Math.max(0, minPrice - padding).toFixed(2),
      (maxPrice + padding).toFixed(2)
    ];
  };

  const { overview } = stockDetails;

  return (
    <div className="space-y-8 bg-white rounded-lg p-12 shadow-sm border border-gray-200 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <h1 className="text-4xl font-bold text-gray-900">
            {overview?.Name || symbol.toUpperCase()}
          </h1>
          <span className="text-2xl font-semibold text-gray-600">({symbol.toUpperCase()})</span>
        </div>
        
        <div className="flex items-center justify-center gap-6 text-sm text-gray-600">
          <span>{overview?.Sector || 'N/A'}</span>
          <span>•</span>
          <span>{overview?.Industry || 'N/A'}</span>
          <span>•</span>
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrencyByContext(currentPrice, currencyCode, 'price')}
          </span>
        </div>
      </div>

      {/* Investment Verdict - Actionable Recommendations */}
      <InvestmentVerdict
        recommendation={analysis.recommendation}
        confidence={analysis.confidence}
        reason={analysis.reason}
        currentPrice={currentPrice}
        priceTargets={analysis.priceTargets}
        targetPrice={analysis.targetPrice}
        chartData={chartData}
        chartPeriod={chartPeriod}
        onPeriodChange={setChartPeriod}
        symbol={symbol}
      />

      {/* Financial Health Score */}
      <div className="flex justify-center">
        <ScoreGauge
          score={analysis.financialHealthScore}
          title="Financial Health"
          subtitle="Overall Score"
          size="lg"
        />
      </div>

      {/* Key Metrics Grid */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Key Financial Metrics</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="P/E Ratio"
            value={formatNumber(overview?.PERatio, 'ratio')}
            trend={parseFloat(overview?.PERatio) < 20 ? 'up' : 'down'}
            isGood={false}
            comparison="S&P 500 Avg"
            comparisonValue="21.5"
          />
          
          <MetricCard
            title="Return on Equity"
            value={formatNumber(overview?.ReturnOnEquityTTM, 'percentage')}
            trend={parseFloat(overview?.ReturnOnEquityTTM) > 0.10 ? 'up' : 'down'}
            isGood={true}
            comparison="Industry Avg"
            comparisonValue="12%"
          />
          
          <MetricCard
            title="Debt-to-Equity"
            value={formatNumber(overview?.DebtToEquityRatio, 'ratio')}
            trend={parseFloat(overview?.DebtToEquityRatio) < 0.5 ? 'up' : 'down'}
            isGood={false}
            comparison="Industry Avg"
            comparisonValue="0.45"
          />
          
          <MetricCard
            title="Price-to-Book"
            value={formatNumber(overview?.PriceToBookRatio, 'ratio')}
            trend={parseFloat(overview?.PriceToBookRatio) < 2 ? 'up' : 'down'}
            isGood={false}
            comparison="Market Avg"
            comparisonValue="2.8"
          />
        </div>
      </div>

      {/* Professional Investment Analysis */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Investment Analysis</h2>
        
        <ProfessionalAnalysis symbol={symbol} />
      </div>


      {/* Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Overview */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Company Overview</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Market Cap:</span>
              <span className="font-medium">{formatNumber(overview?.MarketCapitalization, 'currency')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Revenue (TTM):</span>
              <span className="font-medium">{formatNumber(overview?.RevenueTTM, 'currency')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Profit (TTM):</span>
              <span className="font-medium">{formatNumber(overview?.GrossProfitTTM, 'currency')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">EPS (TTM):</span>
              <span className="font-medium">${formatNumber(overview?.EPS, 'number')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Dividend Yield:</span>
              <span className="font-medium">{formatNumber(overview?.DividendYield, 'percentage')}</span>
            </div>
          </div>
        </div>

        {/* Latest News & Sentiment */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest News & Market Sentiment</h3>
          
          {/* Market Sentiment Analysis */}
          {newsData?.sentiment && (
            <div className="mb-6">
              {(() => {
                const sentConfig = sentimentConfig[newsData.sentiment.overall]
                return (
                  <div className={`p-4 rounded-lg border ${sentConfig.bgColor} ${sentConfig.borderColor} mb-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{sentConfig.icon}</span>
                        <span className={`text-lg font-bold ${sentConfig.color}`}>
                          {sentConfig.label} Sentiment
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">Score</span>
                        <p className={`text-lg font-bold ${sentConfig.color}`}>
                          {(newsData.sentiment.score * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{newsData.sentiment.reasoning}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Confidence</span>
                        <span>{(newsData.sentiment.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${newsData.sentiment.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Latest News */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">
              Recent Headlines
            </h4>
            
            {newsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border animate-pulse">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : newsData?.news?.length ? (
              <div className="space-y-3">
                {newsData.news.map((article, index) => (
                  <div key={article.uuid || index} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900 leading-tight mb-2">
                          {article.title}
                        </h5>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(article.providerPublishTime * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Read full article"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-lg border text-center">
                <p className="text-sm text-gray-500">No recent news available for this stock.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal Notes */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">My Investment Notes</h3>
        
        <textarea
          className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Record your research, thoughts, and investment rationale here..."
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          onBlur={handleSaveNote}
        />
        <p className="text-xs text-gray-500 mt-2">
          Notes are automatically saved when you click away from the text area
        </p>
      </div>
    </div>
  );
} 