import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getWatchlist, deleteWatchlistItem } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface WatchlistItem {
  id: number;
  symbol: string;
  company_name: string;
}

export default function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleDelete = async (itemId: number, companyName: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove ${companyName} from your watchlist?`);
    if (!confirmDelete) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication token not found.');
        return;
      }
      await deleteWatchlistItem(itemId, token);
      toast({
        title: "Removed from Watchlist",
        description: `${companyName} removed from watchlist.`,
      fetchWatchlist(); // Refresh the watchlist
    } catch (err: any) {
      alert(`Failed to remove from watchlist: ${err.message}`);
    }
  };

  if (loading) {
    return <p>Loading watchlist...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Watchlist</h2>
      {watchlist.length === 0 ? (
        <p>Your watchlist is empty. Search for stocks to add them!</p>
      ) : (
        <ul className="border rounded-md p-4">
          {watchlist.map((item) => (
            <li key={item.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <div className="cursor-pointer" onClick={() => router.push(`/stock/${item.symbol}`)}>
                <p className="font-medium">{item.company_name} ({item.symbol})</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(item.id, item.company_name)}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
