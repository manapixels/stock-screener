import StockDetailClient from '@/components/StockDetailClient';

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
  const { symbol } = params;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <StockDetailClient symbol={symbol} />
      </div>
    </main>
  );
}