"use client"

import { useState, useEffect, useRef } from 'react'
import { X, Search, TrendingUp } from 'lucide-react'
import { searchStocks, addWatchlistItem, isAuthError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useAuth } from '@/components/AuthProvider'

interface StockResult {
  symbol: string
  name: string
  type: string
  region: string
  marketOpen: string
  marketClose: string
  timezone: string
  currency: string
  matchScore: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectStock?: (symbol: string, name: string) => void
}

export default function SearchModal({ isOpen, onClose, onSelectStock }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  // Handle search with debouncing
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 300) // Debounce 300ms

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      const data = await searchStocks(query)
      setResults(data.bestMatches || [])
    } catch (error) {
      console.error('Error searching stocks:', error)
      toast.error('Failed to search stocks')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToWatchlist = async (symbol: string, companyName: string) => {
    if (!user) {
      toast.error('Please sign in to add stocks to your watchlist')
      return
    }

    try {
      const result = await addWatchlistItem(symbol, companyName)
      if (isAuthError(result)) {
        toast.error('Please sign in to add stocks to your watchlist')
        return
      }
      toast.success(`${symbol} added to watchlist`)
    } catch (error) {
      console.error('Error adding to watchlist:', error)
      toast.error('Failed to add to watchlist')
    }
  }

  const handleSelectStock = (symbol: string, name: string) => {
    if (onSelectStock) {
      onSelectStock(symbol, name)
    }
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-start justify-center p-4 pt-16 sm:pt-24">
        <div 
          className="relative w-full max-w-2xl rounded-lg bg-white shadow-xl transition-all"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">Search Stocks</h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 sm:p-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for stocks (e.g., AAPL, Microsoft, Tesla)"
                className="pl-10 text-base sm:text-sm"
              />
            </div>

            {/* Loading State */}
            {loading && (
              <div className="mt-4 flex justify-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Results */}
            {!loading && results.length > 0 && (
              <div className="mt-4 max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {results.map((stock) => (
                    <div 
                      key={stock.symbol} 
                      className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-blue-600 text-lg">
                              {stock.symbol}
                            </span>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                              {stock.type}
                            </span>
                          </div>
                          <p className="text-gray-800 font-medium mb-1">{stock.name}</p>
                          <p className="text-sm text-gray-500">
                            {stock.region} • {stock.currency}
                          </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            onClick={() => handleSelectStock(stock.symbol, stock.name)}
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <TrendingUp className="h-4 w-4" />
                            View Analysis
                          </Button>
                          {user && (
                            <Button
                              onClick={() => handleAddToWatchlist(stock.symbol, stock.name)}
                              size="sm"
                            >
                              Add to Watchlist
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {!loading && query && results.length === 0 && (
              <div className="mt-4 text-center py-8">
                <p className="text-gray-600">
                  No results found for &quot;{query}&quot;
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Try a different search term or stock symbol
                </p>
              </div>
            )}

            {/* Empty State */}
            {!query && (
              <div className="mt-4 text-center py-8">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">Search for stocks</p>
                <p className="text-sm text-gray-500 mt-1">
                  Enter a company name or stock symbol to get started
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          {!user && (
            <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Tip:</span> Sign in to add stocks to your watchlist
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}