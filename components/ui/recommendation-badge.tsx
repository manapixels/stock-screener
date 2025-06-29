import React from 'react'
import { TrendingUp, Minus, TrendingDown, Star } from 'lucide-react'

type RecommendationType = 'BUY' | 'HOLD' | 'SELL'
type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW'

interface RecommendationBadgeProps {
  recommendation: RecommendationType
  confidence: ConfidenceLevel
  reason?: string
  price?: number
  targetPrice?: number
  className?: string
}

export function RecommendationBadge({ 
  recommendation, 
  confidence, 
  reason, 
  price, 
  targetPrice,
  className = "" 
}: RecommendationBadgeProps) {
  const getRecommendationConfig = () => {
    switch (recommendation) {
      case 'BUY':
        return {
          color: 'bg-green-500',
          textColor: 'text-white',
          borderColor: 'border-green-500',
          icon: <TrendingUp className="h-5 w-5" />,
          bgLight: 'bg-green-50',
          textLight: 'text-green-700'
        }
      case 'HOLD':
        return {
          color: 'bg-amber-500',
          textColor: 'text-white', 
          borderColor: 'border-amber-500',
          icon: <Minus className="h-5 w-5" />,
          bgLight: 'bg-amber-50',
          textLight: 'text-amber-700'
        }
      case 'SELL':
        return {
          color: 'bg-red-500',
          textColor: 'text-white',
          borderColor: 'border-red-500', 
          icon: <TrendingDown className="h-5 w-5" />,
          bgLight: 'bg-red-50',
          textLight: 'text-red-700'
        }
    }
  }

  const getConfidenceStars = () => {
    const starCount = confidence === 'HIGH' ? 3 : confidence === 'MEDIUM' ? 2 : 1
    return Array.from({ length: 3 }, (_, i) => (
      <Star 
        key={i} 
        className={`h-3 w-3 ${i < starCount ? 'fill-current' : 'stroke-current fill-none'}`} 
      />
    ))
  }

  const config = getRecommendationConfig()
  const upside = targetPrice && price ? ((targetPrice - price) / price * 100).toFixed(1) : null

  return (
    <div className={`rounded-lg border-2 ${config.borderColor} ${config.bgLight} p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${config.color} ${config.textColor}`}>
          {config.icon}
          <span className="font-bold text-lg">{recommendation}</span>
        </div>
        
        <div className="flex items-center gap-1">
          <span className={`text-xs font-medium ${config.textLight}`}>
            {confidence} CONFIDENCE
          </span>
          <div className={`flex gap-0.5 ${config.textLight}`}>
            {getConfidenceStars()}
          </div>
        </div>
      </div>

      {reason && (
        <p className={`text-sm ${config.textLight} mb-2`}>{reason}</p>
      )}

      {upside && (
        <div className={`text-sm ${config.textLight}`}>
          <span className="font-medium">
            {upside.startsWith('-') ? 'Downside' : 'Upside'}: {Math.abs(parseFloat(upside))}%
          </span>
          {targetPrice && (
            <span className="ml-2 text-xs opacity-75">
              (Target: ${targetPrice.toFixed(2)})
            </span>
          )}
        </div>
      )}
    </div>
  )
} 