"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import Watchlist from "@/components/Watchlist";
import AlertsSidebar from "@/components/AlertsSidebar";
import StockDetailClient from "@/components/StockDetailClient";
import { TrendingUp, BarChart3 } from "lucide-react";

export default function DashboardPage() {
  const [selectedStock, setSelectedStock] = useState<{
    symbol: string;
    name: string;
  } | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const searchParams = useSearchParams();

  // Check for stock symbol in URL params
  useEffect(() => {
    const symbol = searchParams.get("symbol");
    const name = searchParams.get("name");
    if (symbol) {
      setSelectedStock({ symbol, name: name || symbol });
    }
  }, [searchParams]);

  const handleSelectStock = (symbol: string, name: string) => {
    setSelectedStock({ symbol, name });
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("name", name);
    window.history.replaceState({}, "", url.toString());
  };

  const handlePriceUpdate = (price: number) => {
    setCurrentPrice(price);
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Header onSelectStock={handleSelectStock} />

        <main className="w-full px-4 sm:px-6 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-none">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {selectedStock ? (
                /* Selected Stock Analysis */
                <div className="bg-white rounded-lg shadow-sm">
                  <StockDetailClient
                    symbol={selectedStock.symbol}
                    onPriceUpdate={handlePriceUpdate}
                  />
                </div>
              ) : (
                /* Default Dashboard View */
                <div className="space-y-6">
                  {/* Welcome Section */}
                  <div className="bg-white rounded-lg shadow-sm border p-6 text-center">
                    <div className="flex items-center justify-center mb-4">
                      <div className="p-3 bg-blue-100 rounded-full">
                        <TrendingUp className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      Welcome to Signal
                    </h2>
                    <p className="text-gray-600 mb-4">
                      Your intelligent stock analysis dashboard. Search for a
                      stock above to get started with detailed investment
                      analysis.
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <BarChart3 className="h-4 w-4" />
                        <span>Investment Analysis</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>Price Targets</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Watchlist - Always visible in sidebar */}
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">
                      Your Watchlist
                    </h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <Watchlist compact />
                  </div>
                </div>

                {/* Price Alerts */}
                <AlertsSidebar
                  selectedSymbol={selectedStock?.symbol}
                  currentPrice={currentPrice}
                  className="min-h-[400px]"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
