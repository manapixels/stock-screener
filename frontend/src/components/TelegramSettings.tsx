import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getUserProfile, updateUserSettings } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export default function TelegramSettings() {
  const [chatId, setChatId] = useState('');
  const [botToken, setBotToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Authentication token not found.');
          setLoading(false);
          return;
        }
        const user = await getUserProfile(token);
        setChatId(user.telegram_chat_id || '');
        setBotToken(user.telegram_bot_token || '');
      } catch (err: any) {
        setError(err.message || 'Failed to fetch settings.');
        toast({
          title: "Error Fetching Telegram Settings",
          description: err.message || 'Failed to fetch settings.',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('access_token');
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save settings.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUserSettings(chatId, botToken, token);
      toast({
        title: "Settings Saved",
        description: "Telegram settings saved successfully!",
      });
    } catch (err: any) {
      toast({
        title: "Failed to Save Settings",
        description: err.message || 'An unexpected error occurred.',
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <p>Loading Telegram settings...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-md">
      <h2 className="text-2xl font-bold mb-4">Telegram Notification Settings</h2>
      <div>
        <label htmlFor="chat-id" className="block text-sm font-medium text-gray-700">Telegram Chat ID</label>
        <Input
          type="text"
          id="chat-id"
          value={chatId}
          onChange={(e) => setChatId(e.target.value)}
          placeholder="Enter your Telegram Chat ID"
          className="mt-1 block w-full"
        />
      </div>
      <div>
        <label htmlFor="bot-token" className="block text-sm font-medium text-gray-700">Telegram Bot Token</label>
        <Input
          type="text"
          id="bot-token"
          value={botToken}
          onChange={(e) => setBotToken(e.target.value)}
          placeholder="Enter your Telegram Bot Token"
          className="mt-1 block w-full"
        />
      </div>
      <Button type="submit" className="w-full">Save Settings</Button>
    </form>
  );
}
