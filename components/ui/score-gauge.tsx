import React from 'react'

interface ScoreGaugeProps {
  score: number // 0-100
  title: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function ScoreGauge({ 
  score, 
  title, 
  subtitle, 
  size = 'md', 
  className = "" 
}: ScoreGaugeProps) {
  const normalizedScore = Math.max(0, Math.min(100, score))
  const circumference = 2 * Math.PI * 45
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference

  const getScoreColor = () => {
    if (normalizedScore >= 80) return '#10B981' // green-500
    if (normalizedScore >= 60) return '#F59E0B' // amber-500
    if (normalizedScore >= 40) return '#EF4444' // red-500
    return '#6B7280' // gray-500
  }

  const getScoreText = () => {
    if (normalizedScore >= 80) return 'Excellent'
    if (normalizedScore >= 60) return 'Good'
    if (normalizedScore >= 40) return 'Fair'
    return 'Poor'
  }

  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-24 h-24', 
    lg: 'w-32 h-32'
  }

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const scoreSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <svg 
          className={`${sizeClasses[size]} transform -rotate-90`}
          viewBox="0 0 100 100"
        >
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={getScoreColor()}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300 ease-out"
          />
        </svg>
        
        {/* Score text in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${scoreSizes[size]} text-gray-900`}>
            {Math.round(normalizedScore)}
          </span>
          <span className={`${textSizes[size]} text-gray-500 font-medium`}>
            {getScoreText()}
          </span>
        </div>
      </div>
      
      <div className="mt-3 text-center">
        <h3 className={`font-semibold text-gray-900 ${textSizes[size]}`}>{title}</h3>
        {subtitle && (
          <p className={`text-gray-500 ${textSizes[size]} mt-1`}>{subtitle}</p>
        )}
      </div>
    </div>
  )
} 