"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
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

// Function to determine correct market info from symbol
function getMarketInfoFromSymbol(symbol: string): { region: string; currency: string } {
  // Map suffixes to correct market info
  const marketMap: Record<string, { region: string; currency: string }> = {
    '.SI': { region: 'Singapore', currency: 'SGD' },
    '.L': { region: 'United Kingdom', currency: 'GBP' },
    '.T': { region: 'Japan', currency: 'JPY' },
    '.HK': { region: 'Hong Kong', currency: 'HKD' },
    '.TO': { region: 'Canada', currency: 'CAD' },
    '.AX': { region: 'Australia', currency: 'AUD' },
    '.F': { region: 'Germany', currency: 'EUR' },
    '.PA': { region: 'France', currency: 'EUR' },
    '.BO': { region: 'India', currency: 'INR' },
    '.SZ': { region: 'China', currency: 'CNY' },
    '.KS': { region: 'South Korea', currency: 'KRW' }
  }
  
  // Check for suffix in symbol
  for (const [suffix, info] of Object.entries(marketMap)) {
    if (symbol.includes(suffix)) {
      return info
    }
  }
  
  // Default to US if no suffix found
  return { region: 'United States', currency: 'USD' }
}

interface Market {
  code: string
  name: string
  country: string
  flag: string
  suffix: string
  timezone: string
  currency: string
}

const MARKETS: Market[] = [
  { code: 'ALL', name: 'All Markets', country: 'Global', flag: '🌍', suffix: '', timezone: 'Global', currency: 'Various' },
  { code: 'US', name: 'US Exchanges', country: 'United States', flag: '🇺🇸', suffix: '', timezone: 'EST', currency: 'USD' },
  { code: 'SGX', name: 'Singapore', country: 'Singapore', flag: '🇸🇬', suffix: '.SI', timezone: 'SGT', currency: 'SGD' },
  { code: 'LSE', name: 'London', country: 'United Kingdom', flag: '🇬🇧', suffix: '.L', timezone: 'GMT', currency: 'GBP' },
  { code: 'TSE', name: 'Tokyo', country: 'Japan', flag: '🇯🇵', suffix: '.T', timezone: 'JST', currency: 'JPY' },
  { code: 'HKG', name: 'Hong Kong', country: 'Hong Kong', flag: '🇭🇰', suffix: '.HK', timezone: 'HKT', currency: 'HKD' },
  { code: 'TSX', name: 'Toronto', country: 'Canada', flag: '🇨🇦', suffix: '.TO', timezone: 'EST', currency: 'CAD' },
  { code: 'ASX', name: 'Australia', country: 'Australia', flag: '🇦🇺', suffix: '.AX', timezone: 'AEST', currency: 'AUD' }
]

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectStock?: (symbol: string, name: string) => void
}

export default function SearchModal({ isOpen, onClose, onSelectStock }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<StockResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMarket, setSelectedMarket] = useState<Market>(MARKETS[0]) // Default to All Markets
  const [showMarketDropdown, setShowMarketDropdown] = useState(false)
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const marketRef = useRef<HTMLDivElement>(null)

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
      setShowMarketDropdown(false)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (marketRef.current && !marketRef.current.contains(event.target as Node)) {
        setShowMarketDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Define handleSearch function first
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setLoading(true)
    try {
      // Search by name/symbol without adding suffixes - let the API handle it
      const data = await searchStocks(query)
      let filteredResults = data.bestMatches || []
      
      // Filter results by selected market if not "All Markets"
      if (selectedMarket.code !== 'ALL') {
        if (selectedMarket.code === 'US') {
          // For US, show stocks without suffixes or with US-specific patterns
          filteredResults = filteredResults.filter((stock: StockResult) => 
            !stock.symbol.includes('.') || 
            stock.region.toLowerCase().includes('united states') ||
            stock.region.toLowerCase().includes('nasdaq') ||
            stock.region.toLowerCase().includes('nyse')
          )
        } else {
          // For other markets, filter by suffix or region
          filteredResults = filteredResults.filter((stock: StockResult) => 
            stock.symbol.includes(selectedMarket.suffix) || 
            stock.region.toLowerCase().includes(selectedMarket.country.toLowerCase())
          )
        }
      }
      
      setResults(filteredResults)
    } catch (error) {
      console.error('Error searching stocks:', error)
      toast.error('Failed to search stocks')
    } finally {
      setLoading(false)
    }
  }, [query, selectedMarket])

  // Handle search with debouncing (re-search when market changes)
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      handleSearch()
    }, 300) // Debounce 300ms

    return () => clearTimeout(timeoutId)
  }, [query, selectedMarket, handleSearch])

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
            {/* Search Input with Market Filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stocks by name or symbol (e.g., Apple, AAPL, Microsoft)"
                  className="pl-10 pr-4 text-base sm:text-sm"
                />
              </div>

              {/* Compact Market Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 font-medium">Market:</span>
                <div className="relative" ref={marketRef}>
                  <button
                    onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    <span className="text-sm">{selectedMarket.flag}</span>
                    <span>{selectedMarket.name}</span>
                    <svg className={`h-3 w-3 text-gray-500 transition-transform ${showMarketDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showMarketDropdown && (
                    <div className="absolute z-10 left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-48">
                      {MARKETS.map((market) => (
                        <button
                          key={market.code}
                          onClick={() => {
                            setSelectedMarket(market)
                            setShowMarketDropdown(false)
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                            selectedMarket.code === market.code ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          <span className="text-sm">{market.flag}</span>
                          <span className="font-medium">{market.name}</span>
                          {selectedMarket.code === market.code && (
                            <div className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                  {results.map((stock) => {
                    // Get corrected market info based on symbol
                    const correctedMarketInfo = getMarketInfoFromSymbol(stock.symbol)
                    const displayRegion = correctedMarketInfo.region
                    const displayCurrency = correctedMarketInfo.currency
                    
                    return (
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
                              {displayRegion} • {displayCurrency}
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
                            Open
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
                    )
                  })}
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