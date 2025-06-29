"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthProvider'
import { getWatchlist, removeWatchlistItem, isAuthError } from '@/lib/api'
import { Button } from './ui/button'
import { toast } from 'sonner'

interface WatchlistItem {
  id: string
  symbol: string
  company_name: string
  created_at: string
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
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
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
      setWatchlist(result)
    } catch (error) {
      console.error('Error fetching watchlist:', error)
      toast.error('Failed to load watchlist')
    } finally {
      setLoading(false)
    }
  }, [user])

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
            <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="font-medium text-blue-600">{item.symbol}</span>
                <p className="text-sm text-gray-600">{item.company_name}</p>
              </div>
              <Button
                onClick={() => handleRemove(item.id)}
                variant="destructive"
                size="sm"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
