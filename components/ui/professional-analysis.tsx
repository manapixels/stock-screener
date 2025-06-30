import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Target, DollarSign, Building2, AlertTriangle, CheckCircle, Clock, Sparkles } from 'lucide-react'
import { getProfessionalAnalysis } from '@/lib/api'

interface FinancialHighlights {
  valuation: string
  profitability: string
  financialStrength: string
  dividend: string
}

interface Recommendation {
  rating: 'BUY' | 'HOLD' | 'SELL'
  priceTarget: number
  timeHorizon: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

interface ProfessionalAnalysisData {
  investmentThesis: string
  bullishArguments: string[]
  bearishArguments: string[]
  financialHighlights: FinancialHighlights
  recommendation: Recommendation
}

interface ProfessionalAnalysisProps {
  symbol: string
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
    icon: Target,
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

export function ProfessionalAnalysis({ symbol }: ProfessionalAnalysisProps) {
  const [analysis, setAnalysis] = useState<ProfessionalAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (symbol) {
      fetchAnalysis()
    }
  }, [symbol])

  const fetchAnalysis = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await getProfessionalAnalysis(symbol)
      setAnalysis(result.analysis)
    } catch (err) {
      console.error('Error fetching professional analysis:', err)
      setError('Failed to generate professional analysis')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading Investment Thesis */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-blue-600 animate-pulse" />
            <h3 className="text-lg font-semibold text-gray-900">Professional Investment Analysis</h3>
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Powered by Gemini 2.5 Flash</span>
          </div>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>

        {/* Loading Bull/Bear Cases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Analysis Error</h3>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={fetchAnalysis}
          className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    )
  }

  if (!analysis) {
    return null
  }

  const config = recommendationConfig[analysis.recommendation.rating]
  const confConfig = confidenceConfig[analysis.recommendation.confidence]
  const Icon = config.icon

  return (
    <div className="space-y-6">
      {/* Investment Thesis & Recommendation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Professional Investment Analysis</h3>
          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Powered by Gemini 2.5 Flash</span>
        </div>

        {/* Investment Thesis */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Investment Thesis</h4>
          <p className="text-gray-700 leading-relaxed">{analysis.investmentThesis}</p>
        </div>

        {/* Recommendation */}
        <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-6 w-6 ${config.color}`} />
              <span className={`text-xl font-bold ${config.color}`}>{config.label}</span>
              {analysis.recommendation.priceTarget > 0 && (
                <span className="text-lg font-semibold text-gray-700">
                  ${analysis.recommendation.priceTarget.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-right">
              <span className={`text-sm font-medium ${confConfig.color}`}>
                {confConfig.label}
              </span>
              <p className="text-xs text-gray-500">{analysis.recommendation.timeHorizon}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Arguments Supporting & Counter-Arguments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bull Case */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Arguments Supporting Thesis</h3>
            <span className="text-sm text-gray-500">({analysis.bullishArguments.length} factors)</span>
          </div>
          
          <div className="space-y-4">
            {analysis.bullishArguments.map((argument, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-800 leading-relaxed">{argument}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bear Case */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Counter-Arguments & Key Risks</h3>
            <span className="text-sm text-gray-500">({analysis.bearishArguments.length} risks)</span>
          </div>
          
          <div className="space-y-4">
            {analysis.bearishArguments.map((argument, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-800 leading-relaxed">{argument}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financial Highlights */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Financial Highlights</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Valuation</h4>
            <p className="text-sm text-gray-700">{analysis.financialHighlights.valuation}</p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-semibold text-green-800 mb-2">Profitability</h4>
            <p className="text-sm text-gray-700">{analysis.financialHighlights.profitability}</p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="text-sm font-semibold text-purple-800 mb-2">Financial Strength</h4>
            <p className="text-sm text-gray-700">{analysis.financialHighlights.financialStrength}</p>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="text-sm font-semibold text-orange-800 mb-2">Dividend & Yield</h4>
            <p className="text-sm text-gray-700">{analysis.financialHighlights.dividend}</p>
          </div>
        </div>
      </div>

      {/* Analysis Attribution */}
      <div className="bg-gray-50 p-4 rounded-lg border text-center">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Sparkles className="h-4 w-4" />
          <span>Professional analysis generated by</span>
          <span className="font-semibold text-blue-600">Gemini 2.5 Flash</span>
          <span>• Updated</span>
          <Clock className="h-4 w-4" />
          <span>{new Date().toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}