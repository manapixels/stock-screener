import { AnalysisResult } from '../types/analysis'

// Simple in-memory cache for analysis results
// In production, consider Redis or database caching
class AnalysisCache {
  private cache = new Map<string, { data: AnalysisResult; timestamp: number }>()
  private readonly TTL = 30 * 60 * 1000 // 30 minutes in milliseconds

  set(symbol: string, analysis: AnalysisResult): void {
    const cacheKey = symbol.toUpperCase()
    this.cache.set(cacheKey, {
      data: { ...analysis, cached: true },
      timestamp: Date.now()
    })
    
    console.log(`📦 Cached analysis for ${symbol}`)
  }

  get(symbol: string): AnalysisResult | null {
    const cacheKey = symbol.toUpperCase()
    const cached = this.cache.get(cacheKey)
    
    if (!cached) {
      return null
    }
    
    // Check if cache has expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(cacheKey)
      console.log(`🗑️ Expired cache for ${symbol}`)
      return null
    }
    
    console.log(`📦 Retrieved cached analysis for ${symbol}`)
    return cached.data
  }

  clear(symbol?: string): void {
    if (symbol) {
      const cacheKey = symbol.toUpperCase()
      this.cache.delete(cacheKey)
      console.log(`🗑️ Cleared cache for ${symbol}`)
    } else {
      this.cache.clear()
      console.log(`🗑️ Cleared all cache`)
    }
  }

  // Clean up expired entries periodically
  cleanupExpired(): void {
    const now = Date.now()
    let cleanedCount = 0
    
    this.cache.forEach((value, key) => {
      if (now - value.timestamp > this.TTL) {
        this.cache.delete(key)
        cleanedCount++
      }
    })
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`)
    }
  }

  getStats(): { size: number; maxAge: string } {
    let oldestTimestamp = Date.now()
    
    this.cache.forEach((value) => {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp
      }
    })
    
    const maxAge = this.cache.size > 0 
      ? `${Math.round((Date.now() - oldestTimestamp) / 1000 / 60)}m` 
      : '0m'
    
    return {
      size: this.cache.size,
      maxAge
    }
  }
}

// Export singleton instance
export const analysisCache = new AnalysisCache()

// Set up periodic cleanup every 10 minutes
if (typeof global !== 'undefined') {
  setInterval(() => {
    analysisCache.cleanupExpired()
  }, 10 * 60 * 1000)
} 