"use client"

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Building2, TrendingUp, DollarSign, BarChart3, MessageSquare, PenTool } from 'lucide-react';
import { getStockDetails, getStockNote, saveStockNote } from '@/lib/api';
import { analyzeStock, formatNumber } from '@/lib/stock-analysis';
import { MetricCard } from '@/components/ui/metric-card';
import { ScoreGauge } from '@/components/ui/score-gauge';
import { RecommendationBadge } from '@/components/ui/recommendation-badge';
import { ThesisSection } from '@/components/ui/thesis-section';
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
}

export default function StockDetailClient({ symbol }: StockDetailClientProps) {
  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');

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

  // Get current price from daily data
  const dailyData = stockDetails.daily_data?.['Time Series (Daily)'];
  const currentPrice = dailyData ? parseFloat((Object.values(dailyData)[0] as any)?.['4. close'] || '0') : 0;

  // Generate analysis
  const analysis = analyzeStock(stockDetails, currentPrice);

  // Format chart data
  const chartData = dailyData ? Object.entries(dailyData)
    .map(([date, data]: [string, any]) => ({
      date: new Date(date).toLocaleDateString(),
      price: parseFloat(data['4. close']),
      volume: parseInt(data['5. volume'])
    }))
    .reverse()
    .slice(-30) // Last 30 days
    : [];

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

      {/* Recommendation & Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecommendationBadge
            recommendation={analysis.recommendation}
            confidence={analysis.confidence}
            reason={analysis.reason}
            price={currentPrice}
            targetPrice={analysis.targetPrice}
          />
        </div>
        <div className="flex justify-center">
          <ScoreGauge
            score={analysis.financialHealthScore}
            title="Financial Health"
            subtitle="Overall Score"
            size="lg"
          />
        </div>
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

      {/* Investment Thesis */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="h-5 w-5 text-gray-700" />
          <h2 className="text-2xl font-semibold text-gray-900">Investment Thesis</h2>
        </div>
        
        <ThesisSection 
          bullCase={analysis.bullCase}
          bearCase={analysis.bearCase}
        />
      </div>

      {/* Price Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="h-5 w-5 text-gray-700" />
          <h2 className="text-2xl font-semibold text-gray-900">Price Performance (30 Days)</h2>
        </div>
        
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                stroke="#666"
              />
              <YAxis 
                fontSize={12}
                stroke="#666"
                domain={['dataMin - 5', 'dataMax + 5']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
                name="Stock Price ($)"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <p>Price chart data not available</p>
          </div>
        )}
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