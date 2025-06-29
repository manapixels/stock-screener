import { Target, TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

interface PriceTargets {
  goodBuyPrice: number
  goodSellPrice: number
  currentValue: 'undervalued' | 'fairly_valued' | 'overvalued'
}

interface ChartData {
  date: string
  displayDate: string
  fullDate: Date
  price: number
  volume: number
}

interface InvestmentVerdictProps {
  recommendation: 'BUY' | 'HOLD' | 'SELL'
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
  currentPrice: number
  priceTargets: PriceTargets
  targetPrice?: number
  chartData?: ChartData[]
  chartPeriod?: '1W' | '1M' | '1Y'
  onPeriodChange?: (period: '1W' | '1M' | '1Y') => void
}

const recommendationConfig = {
  BUY: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: TrendingUp,
    label: 'BUY'
  },
  HOLD: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Minus,
    label: 'HOLD'
  },
  SELL: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: TrendingDown,
    label: 'SELL'
  }
}

const confidenceConfig = {
  HIGH: { label: 'High Confidence', color: 'text-green-600' },
  MEDIUM: { label: 'Medium Confidence', color: 'text-yellow-600' },
  LOW: { label: 'Low Confidence', color: 'text-gray-600' }
}

const valuationConfig = {
  undervalued: { label: 'Undervalued', color: 'text-green-600', icon: '📉' },
  fairly_valued: { label: 'Fairly Valued', color: 'text-blue-600', icon: '⚖️' },
  overvalued: { label: 'Overvalued', color: 'text-red-600', icon: '📈' }
}

export function InvestmentVerdict({ 
  recommendation, 
  confidence, 
  reason, 
  currentPrice, 
  priceTargets, 
  targetPrice,
  chartData = [],
  chartPeriod = '1M',
  onPeriodChange
}: InvestmentVerdictProps) {
  const config = recommendationConfig[recommendation]
  const confConfig = confidenceConfig[confidence]
  const valConfig = valuationConfig[priceTargets.currentValue]
  const Icon = config.icon

  // Calculate Y-axis domain for better vertical space usage
  const getYAxisDomain = () => {
    if (chartData.length === 0) return [0, 100];
    
    const prices = chartData.map(d => d.price);
    
    // Include good buy/sell prices in the range calculation
    const allPrices = [...prices, priceTargets.goodBuyPrice, priceTargets.goodSellPrice, currentPrice];
    const rangeMin = Math.min(...allPrices);
    const rangeMax = Math.max(...allPrices);
    
    const padding = (rangeMax - rangeMin) * 0.2; // 20% padding to ensure targets are visible
    
    const finalMin = Math.max(0, rangeMin - padding);
    const finalMax = rangeMax + padding;
    
    console.log('Y-axis calculation:', {
      prices: prices.slice(0, 3),
      goodBuyPrice: priceTargets.goodBuyPrice,
      goodSellPrice: priceTargets.goodSellPrice,
      currentPrice,
      rangeMin,
      rangeMax,
      finalMin,
      finalMax,
      domain: [finalMin, finalMax]
    });
    
    return [finalMin, finalMax]; // Return as numbers, not strings
  };

  // Get appropriate tick count for X-axis based on period
  const getTickCount = () => {
    switch (chartPeriod) {
      case '1W':
        return 7;
      case '1M':
        return 6;
      case '1Y':
        return 12;
      default:
        return 6;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center gap-2 mb-6">
        <Target className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Investment Verdict</h3>
      </div>
      
      {/* Main Recommendation */}
      <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} mb-6`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <span className={`text-xl font-bold ${config.color}`}>{config.label}</span>
          </div>
          <span className={`text-sm font-medium ${confConfig.color}`}>
            {confConfig.label}
          </span>
        </div>
        <p className="text-gray-700 text-sm">{reason}</p>
      </div>

      {/* Current Valuation */}
      <div className="mb-6">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <span className="text-sm text-gray-500">Current Price</span>
            <p className="text-lg font-semibold text-gray-900">${currentPrice.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <span className="text-sm text-gray-500">Valuation</span>
            <div className="flex items-center gap-1">
              <span className="text-lg">{valConfig.icon}</span>
              <p className={`text-sm font-medium ${valConfig.color}`}>{valConfig.label}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Chart with Target Ranges */}
      {chartData.length > 0 && (
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-gray-700" />
              <h4 className="text-lg font-semibold text-gray-900">Price Performance & Targets</h4>
            </div>
            
            {/* Period Selection */}
            {onPeriodChange && (
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {(['1W', '1M', '1Y'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => onPeriodChange(period)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      chartPeriod === period
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey={chartPeriod !== '1Y' ? 'displayDate' : 'date'}
                fontSize={12}
                stroke="#666"
                tick={{ fontSize: 11 }}
                tickCount={getTickCount()}
                interval={chartPeriod === '1Y' ? Math.floor(chartData.length / 12) : 'preserveStartEnd'}
                angle={chartPeriod === '1W' ? -45 : 0}
                textAnchor={chartPeriod === '1W' ? 'end' : 'middle'}
                height={chartPeriod === '1W' ? 60 : 30}
                tickFormatter={chartPeriod === '1Y' ? (value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                } : undefined}
              />
              <YAxis 
                fontSize={12}
                stroke="#666"
                domain={getYAxisDomain()}
                type="number"
                tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
              />
              
              {/* Good Buy Price */}
              <ReferenceLine 
                y={Number(priceTargets.goodBuyPrice)} 
                stroke="#10b981" 
                strokeDasharray="6 6"
                strokeWidth={3}
                label={{ 
                  value: `Good Buy: $${priceTargets.goodBuyPrice}`, 
                  position: 'insideTopLeft', 
                  fill: '#10b981', 
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
              
              {/* Good Sell Price */}
              <ReferenceLine 
                y={Number(priceTargets.goodSellPrice)} 
                stroke="#ef4444" 
                strokeDasharray="6 6"
                strokeWidth={3}
                label={{ 
                  value: `Good Sell: $${priceTargets.goodSellPrice}`, 
                  position: 'insideTopRight', 
                  fill: '#ef4444', 
                  fontSize: 12,
                  fontWeight: 'bold'
                }}
              />
              
              {/* Current Price Line */}
              <ReferenceLine 
                y={currentPrice} 
                stroke="#3b82f6" 
                strokeDasharray="4 4"
                strokeWidth={3}
                label={{ value: `Current: $${currentPrice.toFixed(2)}`, position: 'insideBottomLeft', fill: '#3b82f6', fontSize: 12, fontWeight: 'bold' }}
              />
              
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: any, name: string) => [
                  `$${Number(value).toFixed(2)}`,
                  'Price'
                ]}
                labelFormatter={(label) => `Date: ${label}`}
              />
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
        </div>
      )}

      {/* Price Targets */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">📊 Actionable Price Targets</h4>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Good Buy Price */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="text-center">
                <p className="text-xs text-green-600 font-medium mb-1">GOOD BUY PRICE</p>
                <p className="text-xl font-bold text-green-700">
                  ${priceTargets.goodBuyPrice}
                </p>
                <p className="text-xs text-green-600 mt-1">Target Entry Point</p>
              </div>
            </div>

            {/* Good Sell Price */}
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-center">
                <p className="text-xs text-red-600 font-medium mb-1">GOOD SELL PRICE</p>
                <p className="text-xl font-bold text-red-700">
                  ${priceTargets.goodSellPrice}
                </p>
                <p className="text-xs text-red-600 mt-1">Target Exit Point</p>
              </div>
            </div>
          </div>
        </div>

        {/* Target Price */}
        {targetPrice && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">12-MONTH TARGET</p>
              <p className="text-xl font-bold text-blue-700">${targetPrice.toFixed(2)}</p>
              <p className="text-xs text-blue-600 mt-1">
                {((targetPrice - currentPrice) / currentPrice * 100).toFixed(1)}% potential return
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Summary */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <span className="font-medium">💡 Summary:</span> 
          {recommendation === 'BUY' && ` Consider buying if price reaches $${priceTargets.goodBuyPrice} or below.`}
          {recommendation === 'HOLD' && ` Current price is fairly valued. Monitor for entry/exit opportunities.`}
          {recommendation === 'SELL' && ` Consider taking profits if price reaches $${priceTargets.goodSellPrice} or above.`}
        </p>
      </div>
    </div>
  )
}