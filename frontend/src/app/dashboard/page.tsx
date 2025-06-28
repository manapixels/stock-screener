import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StockSearch from '@/components/StockSearch';
import Watchlist from '@/components/Watchlist';
import AlertForm from '@/components/AlertForm';
import AlertList from '@/components/AlertList';
import TelegramSettings from '@/components/TelegramSettings';

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/auth'); // Redirect to login if no token
    } else {
      // In a real app, you would validate the token with the backend
      // For now, we'll just assume it's valid and decode the email (if possible)
      // This is a simplified example and not secure for production
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUserEmail(payload.sub);
      } catch (error) {
        console.error("Error decoding token:", error);
        router.push('/auth');
      }
    }
  }, [router]);

  if (!userEmail) {
    return <p>Loading...</p>; // Or a loading spinner
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-bold text-center mb-8">Welcome to your Dashboard, {userEmail}!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="md:col-span-2 lg:col-span-1">
          <StockSearch />
        </div>
        <div className="md:col-span-2 lg:col-span-2">
          <Watchlist />
        </div>
        <div className="md:col-span-1">
          <AlertForm />
        </div>
        <div className="md:col-span-2">
          <AlertList />
        </div>
        <div className="md:col-span-3">
          <TelegramSettings />
        </div>
      </div>
      <button
        onClick={() => {
          localStorage.removeItem('access_token');
          router.push('/auth');
        }}
        className="mt-8 px-4 py-2 bg-red-500 text-white rounded-md w-full"
      >
        Logout
      </button>
    </div>
  );
}
