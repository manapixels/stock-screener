import StockDetailClient from '@/components/StockDetailClient';

export default function StockDetailPage({ params }: { params: { symbol: string } }) {
  const { symbol } = params;

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <StockDetailClient symbol={symbol} />
    </main>
  );
}