import AuthGuard from '@/components/AuthGuard';
import UserInfo from '@/components/UserInfo';
import StockSearch from '@/components/StockSearch';
import Watchlist from '@/components/Watchlist';
import AlertForm from '@/components/AlertForm';
import AlertList from '@/components/AlertList';
import TelegramSettings from '@/components/TelegramSettings';

export default function DashboardPage() {
  return (
    <AuthGuard>
      <main className="flex min-h-screen flex-col p-8">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/>
              <path d="m19 9-5 5-4-4-3 3"/>
            </svg>
            Signal Dashboard
          </h1>
          <UserInfo />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <StockSearch />
            <Watchlist />
          </div>
          <div className="space-y-6">
            <AlertForm />
            <AlertList />
            <TelegramSettings />
          </div>
        </div>
      </main>
    </AuthGuard>
  );
}