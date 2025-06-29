"use client"

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, TrendingUp, DollarSign, BarChart3, MessageSquare, PenTool } from 'lucide-react';
import { getStockDetails, getStockNote, saveStockNote } from '@/lib/api';
import { analyzeStock, formatNumber } from '@/lib/stock-analysis';
import { MetricCard } from '@/components/ui/metric-card';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { RecommendationBadge } from '@/components/ui/recommendation-badge';
import { BullCase } from '@/components/ui/bull-case';
import { BearCase } from '@/components/ui/bear-case';
import { InvestmentVerdict } from '@/components/ui/investment-verdict';
import { toast } from 'sonner';

// Note: Using any for external API data with complex/unknown structure
/* eslint-disable @typescript-eslint/no-explicit-any */
interface StockDetails {
  overview: any;
  earnings: any;
  daily_data: any;
  rsi: any;
  bbands: any;
  news_sentiment: any;
}

interface StockDetailClientProps {
  symbol: string;
  onPriceUpdate?: (price: number) => void;
}

export default function StockDetailClient({ symbol, onPriceUpdate }: StockDetailClientProps) {
  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [chartPeriod, setChartPeriod] = useState<'1W' | '1M' | '1Y'>('1M');

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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
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
            ${formatNumber(currentPrice, 'number')}
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
      <div>
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-5 w-5 text-gray-700" />
          <h2 className="text-2xl font-semibold text-gray-900">Key Financial Metrics</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Investment Analysis - Bull & Bear Cases */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-gray-700" />
          <h2 className="text-2xl font-semibold text-gray-900">Investment Analysis</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BullCase bullPoints={analysis.bullCase} />
          <BearCase bearPoints={analysis.bearCase} />
        </div>
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

        {/* Recent News */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Latest News</h3>
          </div>
          
          {stockDetails.news_sentiment?.feed && stockDetails.news_sentiment.feed.length > 0 ? (
            <div className="space-y-3">
              {stockDetails.news_sentiment.feed.slice(0, 3).map((news: any, index: number) => (
                <div key={index} className="border-l-4 border-blue-200 pl-3">
                  <a 
                    href={news.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 line-clamp-2"
                  >
                    {news.title}
                  </a>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(news.time_published).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recent news available</p>
          )}
        </div>
      </div>

      {/* Personal Notes */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <PenTool className="h-5 w-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">My Investment Notes</h3>
        </div>
        
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