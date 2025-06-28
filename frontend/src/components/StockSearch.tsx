import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { searchStock, addWatchlistItem } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface StockSearchResult {
  "1. symbol": string;
  "2. name": string;
  "3. type": string;
  "4. region": string;
  "5. marketOpen": string;
  "6. marketClose": string;
  "7. timezone": string;
  "8. currency": string;
  "9. matchScore": string;
}

export default function StockSearch() {
  const [keywords, setKeywords] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await searchStock(keywords);
      if (data && data.bestMatches) {
        setResults(data.bestMatches);
        if (data.bestMatches.length === 0) {
          toast({
            title: "No Results",
            description: "No stocks found matching your search criteria.",
          });
        }
      } else {
        setResults([]);
        toast({
          title: "No Results",
          description: "No stocks found matching your search criteria.",
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stock data.');
      toast({
        title: "Search Failed",
        description: err.message || 'Failed to fetch stock data.',
        variant: "destructive",
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async (symbol: string, companyName: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to add items to your watchlist.",
        variant: "destructive",
      });
      return;
    }
    try {
      await addWatchlistItem(symbol, companyName, token);
      toast({
        title: "Added to Watchlist",
        description: `${companyName} (${symbol}) has been added to your watchlist.`,
    } catch (err: any) {
      alert(`Failed to add to watchlist: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Search by ticker or company name..."
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleSearch();
            }
          }}
        />
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </div>

      {error && <p className="text-red-500">{error}</p>}

      {results.length > 0 && (
        <div className="border rounded-md p-4">
          <h3 className="text-lg font-semibold mb-2">Search Results:</h3>
          <ul>
            {results.map((stock) => (
              <li key={stock["1. symbol"]} className="flex justify-between items-center py-2 border-b last:border-b-0">
                <div>
                  <p className="font-medium">{stock["2. name"]} ({stock["1. symbol"]})</p>
                  <p className="text-sm text-gray-500">{stock["4. region"]} - {stock["8. currency"]}</p>
                </div>
                <Button size="sm" onClick={() => handleAddToWatchlist(stock["1. symbol"], stock["2. name"])}>Add to Watchlist</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
