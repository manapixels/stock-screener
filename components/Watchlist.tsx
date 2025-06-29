"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthProvider'
import { getWatchlist, removeWatchlistItem, getStockPrice, isAuthError } from '@/lib/api'
import { Button } from './ui/button'
import { toast } from 'sonner'

interface WatchlistItem {
  id: string
  symbol: string
  company_name: string
  created_at: string
}

interface PriceData {
  currentPrice: number
  changes: {
    oneDay: { change: number; changePercent: number }
    oneWeek: { change: number; changePercent: number }
    oneMonth: { change: number; changePercent: number }
  }
}

interface WatchlistItemWithPrice extends WatchlistItem {
  priceData?: PriceData
  priceLoading?: boolean
}

function AuthPrompt() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to view your watchlist</h3>
      <p className="text-gray-600 mb-4">Keep track of your favorite stocks by creating an account</p>
      <Button 
        onClick={() => window.location.href = '/auth'}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Sign In
      </Button>
    </div>
  )
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItemWithPrice[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const fetchWatchlist = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const result = await getWatchlist()
      if (isAuthError(result)) {
        // Auth error handled by AuthGuard, just return
        return
      }
      
      // Initialize watchlist with loading states
      const watchlistWithPrice: WatchlistItemWithPrice[] = result.map((item: WatchlistItem) => ({
        ...item,
        priceLoading: true
      }))
      setWatchlist(watchlistWithPrice)
      
      // Fetch prices for each stock
      fetchPricesForWatchlist(result)
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      toast.error('Failed to load watchlist')
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchPricesForWatchlist = async (watchlistItems: WatchlistItem[]) => {
    // Fetch prices for all stocks concurrently
    const pricePromises = watchlistItems.map(async (item) => {
      try {
        const priceData = await getStockPrice(item.symbol)
        return { symbol: item.symbol, priceData }
      } catch (error) {
        console.error(`Error fetching price for ${item.symbol}:`, error)
        return { symbol: item.symbol, priceData: null }
      }
    })

    const priceResults = await Promise.all(pricePromises)
    
    // Update watchlist with price data
    setWatchlist(prev => prev.map(item => {
      const priceResult = priceResults.find(p => p.symbol === item.symbol)
      return {
        ...item,
        priceData: priceResult?.priceData || undefined,
        priceLoading: false
      }
    }))
  }

  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  const handleRemove = async (id: string) => {
    try {
      const result = await removeWatchlistItem(id)
      if (isAuthError(result)) {
        return
      }
      toast.success('Removed from watchlist')
      fetchWatchlist()
    } catch (error) {
      console.error('Error removing from watchlist:', error)
      toast.error('Failed to remove from watchlist')
    }
  }

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Watchlist</h2>
        <AuthPrompt />
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Watchlist</h2>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : watchlist.length === 0 ? (
        <p className="text-gray-600 text-center py-8">
          No stocks in your watchlist yet. Add some stocks to get started!
        </p>
      ) : (
        <div className="space-y-2">
          {watchlist.map((item) => (
            <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-blue-600">{item.symbol}</span>
                  <span className="text-sm text-gray-600">{item.company_name}</span>
                </div>
                
                {item.priceLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-500">Loading price...</span>
                  </div>
                ) : item.priceData ? (
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block">Price</span>
                      <span className="font-medium">${item.priceData.currentPrice}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">1D</span>
                      <span className={`font-medium ${item.priceData.changes.oneDay.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.priceData.changes.oneDay.changePercent >= 0 ? '+' : ''}{item.priceData.changes.oneDay.changePercent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">1W</span>
                      <span className={`font-medium ${item.priceData.changes.oneWeek.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.priceData.changes.oneWeek.changePercent >= 0 ? '+' : ''}{item.priceData.changes.oneWeek.changePercent}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">1M</span>
                      <span className={`font-medium ${item.priceData.changes.oneMonth.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.priceData.changes.oneMonth.changePercent >= 0 ? '+' : ''}{item.priceData.changes.oneMonth.changePercent}%
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Price data unavailable</span>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button
                  onClick={() => window.open(`/stock/${item.symbol}`, '_blank')}
                  variant="outline"
                  size="sm"
                >
                  View
                </Button>
                <Button
                  onClick={() => handleRemove(item.id)}
                  variant="destructive"
                  size="sm"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
