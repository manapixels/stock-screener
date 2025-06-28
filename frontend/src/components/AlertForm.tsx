import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createAlert, getWatchlist } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: number;
  symbol: string;
  company_name: string;
}

export default function AlertForm() {
  const [symbol, setSymbol] = useState('');
  const [alertType, setAlertType] = useState('');
  const [threshold, setThreshold] = useState<number | string>('');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchWatchlist = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Authentication token not found.');
          setLoading(false);
          return;
        }
        const data = await getWatchlist(token);
        setWatchlist(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch watchlist.');
        toast({
          title: "Error Fetching Watchlist",
          description: err.message || 'Failed to fetch watchlist.',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchWatchlist();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create alerts.",
        variant: "destructive",
      });
      return;
    }
    if (!symbol || !alertType || threshold === '') {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createAlert(symbol, alertType, Number(threshold), token);
      toast({
        title: "Alert Created",
        description: "Your alert has been successfully created.",
      });
      setSymbol('');
      setAlertType('');
      setThreshold('');
    } catch (err: any) {
      toast({
        title: "Failed to Create Alert",
        description: err.message || 'An unexpected error occurred.',
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <p>Loading watchlist for alerts...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-md">
      <h2 className="text-2xl font-bold mb-4">Create New Alert</h2>
      <div>
        <label htmlFor="stock-symbol" className="block text-sm font-medium text-gray-700">Stock Symbol</label>
        <Select onValueChange={setSymbol} value={symbol}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a stock" />
          </SelectTrigger>
          <SelectContent>
            {watchlist.map((item) => (
              <SelectItem key={item.symbol} value={item.symbol}>
                {item.company_name} ({item.symbol})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="alert-type" className="block text-sm font-medium text-gray-700">Alert Type</label>
        <Select onValueChange={setAlertType} value={alertType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select alert type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PE_RATIO_BELOW">P/E Ratio Below</SelectItem>
            <SelectItem value="RSI_BELOW">RSI Below</SelectItem>
            <SelectItem value="PRICE_ABOVE_MA50">Price Above 50-day MA</SelectItem>
            <SelectItem value="PRICE_ABOVE_MA200">Price Above 200-day MA</SelectItem>
            <SelectItem value="GOLDEN_CROSS">Golden Cross</SelectItem>
            <SelectItem value="NEW_INSTITUTIONAL_BUY">New Institutional Buy</SelectItem>
            <SelectItem value="PRICE_BELOW_LOWER_BB">Price Below Lower Bollinger Band</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label htmlFor="threshold" className="block text-sm font-medium text-gray-700">Threshold</label>
        <Input
          type="number"
          id="threshold"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
          placeholder="Enter threshold value"
          className="mt-1 block w-full"
        />
      </div>
      <Button type="submit" className="w-full">Create Alert</Button>
    </form>
  );
}
