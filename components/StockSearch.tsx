"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchStocks, addWatchlistItem, isAuthError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";

interface StockResult {
  symbol: string;
  name: string;
  type: string;
  region: string;
  marketOpen: string;
  marketClose: string;
  timezone: string;
  currency: string;
  matchScore: string;
}

function AuthPromptBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div>
          <p className="text-blue-800 font-medium">
            Sign in to save stocks to your watchlist
          </p>
          <p className="text-blue-600 text-sm">
            You can still search for stocks without an account
          </p>
        </div>
        <Button
          onClick={() => (window.location.href = "/auth")}
          variant="outline"
          size="sm"
          className="ml-auto border-blue-300 text-blue-700 hover:bg-blue-100"
        >
          Sign In
        </Button>
      </div>
    </div>
  );
}

export default function StockSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchStocks(query);
      console.log("Search API response:", data); // Debug log
      setResults(data.bestMatches || []);
    } catch (error) {
      console.error("Error searching stocks:", error);
      toast.error("Failed to search stocks");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (symbol: string, companyName: string) => {
    if (!user) {
      toast.error("Please sign in to add stocks to your watchlist");
      return;
    }

    try {
      const result = await addWatchlistItem(symbol, companyName);
      if (isAuthError(result)) {
        toast.error("Please sign in to add stocks to your watchlist");
        return;
      }
      toast.success(`${symbol} added to watchlist`);
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      toast.error("Failed to add to watchlist");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Stock Search</h2>

      {!user && <AuthPromptBanner />}

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for stocks (e.g., AAPL, Microsoft, Tesla)"
            className="flex-1"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : results.length > 0 ? (
        <div className="space-y-3">
          {results.map((stock) => (
            <div
              key={stock.symbol}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-600">
                      {stock.symbol}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {stock.type}
                    </span>
                  </div>
                  <p className="text-gray-800 mt-1">{stock.name}</p>
                  <p className="text-sm text-gray-500">
                    {stock.region} • {stock.currency}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      window.open(`/stock/${stock.symbol}`, "_blank")
                    }
                    variant="outline"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() =>
                      handleAddToWatchlist(stock.symbol, stock.name)
                    }
                    size="sm"
                    disabled={!user}
                    className={!user ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {!user ? "Sign in to Add" : "Add to Watchlist"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : query && !loading ? (
        <p className="text-gray-600 text-center py-8">
          No results found for &quot;{query}&quot;. Try a different search term.
        </p>
      ) : null}
    </div>
  );
}
