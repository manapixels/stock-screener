"use client"

import { useState } from 'react'
import AuthGuard from '@/components/AuthGuard'
import Header from '@/components/Header'
import Watchlist from '@/components/Watchlist'
import AlertsSidebar from '@/components/AlertsSidebar'
import StockDetailClient from '@/components/StockDetailClient'

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
  const { symbol } = params
  const [currentPrice, setCurrentPrice] = useState<number>(0)

  const handlePriceUpdate = (price: number) => {
    setCurrentPrice(price)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header />

        <main className="w-full px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-none">
            {/* Main Content Area - Stock Analysis */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm">
                <StockDetailClient
                  symbol={symbol.toUpperCase()}
                  onPriceUpdate={handlePriceUpdate}
                />
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Watchlist - Always visible in sidebar */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Your Watchlist</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <Watchlist compact />
                  </div>
                </div>

                {/* Price Alerts */}
                <AlertsSidebar
                  selectedSymbol={symbol.toUpperCase()}
                  currentPrice={currentPrice}
                  className="min-h-[400px]"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}