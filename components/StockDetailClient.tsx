"use client"

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStockDetails, getStockNote, saveStockNote } from '@/lib/api';
import { toast } from 'sonner';

// Note: Using any for external API data with complex/unknown structure
/* eslint-disable @typescript-eslint/no-explicit-any */
interface StockDetails {
  overview: any;
  earnings: any;
  daily_data: any;
  rsi: any;
  bbands: any;
  news_sentiment: any;
}

interface StockDetailClientProps {
  symbol: string;
}

export default function StockDetailClient({ symbol }: StockDetailClientProps) {
  const [stockDetails, setStockDetails] = useState<StockDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');


  useEffect(() => {
    if (!symbol) return;

    const fetchDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getStockDetails(symbol);
        setStockDetails(data);

        const note = await getStockNote(symbol);
        if (note && note.note) {
          setNoteContent(note.note);
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stock details.';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [symbol]);

  const handleSaveNote = async () => {
    try {
      await saveStockNote(symbol, noteContent);
      toast.success("Note saved successfully!");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      toast.error(errorMessage);
    }
  };

  if (loading) {
    return <p>Loading stock details...</p>;
  }

  if (error) {
    return <p className="text-red-500">Error: {error}</p>;
  }

  if (!stockDetails) {
    return <p>No stock details found.</p>;
  }

  return (
    <>
      <h1 className="text-4xl font-bold">{stockDetails.overview?.Name} ({symbol})</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 w-full">
        {/* Overview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Company Overview</h2>
          <p><strong>Sector:</strong> {stockDetails.overview?.Sector || 'N/A'}</p>
          <p><strong>Industry:</strong> {stockDetails.overview?.Industry || 'N/A'}</p>
          <p><strong>Description:</strong> {stockDetails.overview?.Description || 'N/A'}</p>
          <p><strong>P/E Ratio:</strong> {stockDetails.overview?.PERatio || 'N/A'}</p>
          <p><strong>P/B Ratio:</strong> {stockDetails.overview?.PriceToBookRatio || 'N/A'}</p>
          <p><strong>ROE:</strong> {stockDetails.overview?.ReturnOnEquityTTM || 'N/A'}</p>
          <p><strong>Debt to Equity:</strong> {stockDetails.overview?.DebtToEquityRatio || 'N/A'}</p>
          <p><strong>Free Cash Flow:</strong> {stockDetails.overview?.FreeCashFlow || 'N/A'}</p>
          <p><strong>PEG Ratio:</strong> {stockDetails.overview?.PEGRatio || 'N/A'}</p>
        </div>

        {/* Earnings */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Earnings</h2>
          {stockDetails.earnings?.annualReports?.map((report: any) => (
            <div key={report.fiscalDateEnding} className="mb-2">
              <p><strong>Fiscal Date:</strong> {report.fiscalDateEnding}</p>
              <p><strong>Reported EPS:</strong> {report.reportedEPS}</p>
            </div>
          ))}
        </div>

        {/* Technical Indicators */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Technical Indicators</h2>
          <p><strong>RSI (14 day):</strong> {stockDetails.rsi?.['Technical Analysis: RSI']?.[Object.keys(stockDetails.rsi?.['Technical Analysis: RSI'] || {})[0]]?.RSI}</p>
          <p><strong>Bollinger Bands:</strong></p>
          <ul>
            <li>Upper: {stockDetails.bbands?.['Technical Analysis: BBANDS']?.[Object.keys(stockDetails.bbands?.['Technical Analysis: BBANDS'] || {})[0]]?.['Real Upper Band']}</li>
            <li>Middle: {stockDetails.bbands?.['Technical Analysis: BBANDS']?.[Object.keys(stockDetails.bbands?.['Technical Analysis: BBANDS'] || {})[0]]?.['Real Middle Band']}</li>
            <li>Lower: {stockDetails.bbands?.['Technical Analysis: BBANDS']?.[Object.keys(stockDetails.bbands?.['Technical Analysis: BBANDS'] || {})[0]]?.['Real Lower Band']}</li>
          </ul>
        </div>

        {/* Daily Data (simplified) */}
        <div className="bg-white p-6 rounded-lg shadow-md col-span-full">
          <h2 className="text-2xl font-semibold mb-4">Daily Price Data</h2>
          {stockDetails.daily_data?.['Time Series (Daily)'] && (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={Object.entries(stockDetails.daily_data['Time Series (Daily)'])
                  .map(([date, data]: [string, any]) => ({
                    date,
                    price: parseFloat(data['4. close']),
                  }))
                  .reverse()}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="price" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* News Headlines */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Latest News</h2>
          {stockDetails.news_sentiment?.feed && stockDetails.news_sentiment.feed.length > 0 ? (
            <ul>
              {stockDetails.news_sentiment.feed.slice(0, 5).map((news: any) => (
                <li key={news.url} className="mb-2">
                  <a href={news.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {news.title}
                  </a>
                  <p className="text-sm text-gray-500">{new Date(news.time_published).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No recent news found.</p>
          )}
        </div>

        {/* User Notes */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">My Notes</h2>
          <textarea
            className="w-full h-32 p-2 border rounded-md"
            placeholder="Jot down your personal research and qualitative assessments here..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            onBlur={handleSaveNote}
          ></textarea>
        </div>
      </div>
    </>
  );
} 