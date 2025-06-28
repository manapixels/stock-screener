import { useEffect, useState } from 'react';
import { getAlerts, deleteAlert } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface AlertItem {
  id: number;
  symbol: string;
  alert_type: string;
  threshold: number;
  is_active: boolean;
}

export default function AlertList() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication token not found.');
        setLoading(false);
        return;
      }
      const data = await getAlerts(token);
      setAlerts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch alerts.');
      toast({
        title: "Error Fetching Alerts",
        description: err.message || 'Failed to fetch alerts.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDelete = async (alertId: number) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this alert?');
    if (!confirmDelete) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication token not found.');
        return;
      }
      await deleteAlert(alertId, token);
      toast({
        title: "Alert Deleted",
        description: "The alert has been successfully deleted.",
      });
      fetchAlerts(); // Refresh the alerts list
    } catch (err: any) {
      toast({
        title: "Failed to Delete Alert",
        description: err.message || 'An unexpected error occurred.',
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <p>Loading alerts...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">My Active Alerts</h2>
      {alerts.length === 0 ? (
        <p>You have no active alerts. Create one using the form above!</p>
      ) : (
        <ul className="border rounded-md p-4">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
              <div>
                <p className="font-medium">{alert.symbol} - {alert.alert_type} {alert.threshold}</p>
                <p className="text-sm text-gray-500">Status: {alert.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => handleDelete(alert.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
