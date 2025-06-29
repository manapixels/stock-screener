"use client"

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { createAlert, isAuthError } from '@/lib/api';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';

function AuthPrompt() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-12h0V5z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v11a2 2 0 01-2 2H7a2 2 0 01-2-2V10" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to create price alerts</h3>
      <p className="text-gray-600 mb-4">Get notified when your stocks reach target prices</p>
      <Button 
        onClick={() => window.location.href = '/auth'}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Sign In
      </Button>
    </div>
  );
}

export default function AlertForm() {
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in to create alerts');
      return;
    }

    if (!symbol || !condition || !targetPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const result = await createAlert(symbol.toUpperCase(), condition, parseFloat(targetPrice), message || undefined);
      if (isAuthError(result)) {
        toast.error('Please sign in to create alerts');
        return;
      }
      
      toast.success('Alert created successfully');
      setSymbol('');
      setCondition('');
      setTargetPrice('');
      setMessage('');
    } catch (error) {
      console.error('Error creating alert:', error);
      toast.error('Failed to create alert');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Create Price Alert</h2>
        <AuthPrompt />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Create Price Alert</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
            Stock Symbol *
          </label>
          <Input
            id="symbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., AAPL"
            required
          />
        </div>

        <div>
          <label htmlFor="condition" className="block text-sm font-medium text-gray-700 mb-2">
            Condition *
          </label>
          <Select value={condition} onValueChange={setCondition} required>
            <SelectTrigger>
              <SelectValue placeholder="Select condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="above">Price goes above</SelectItem>
              <SelectItem value="below">Price goes below</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor="targetPrice" className="block text-sm font-medium text-gray-700 mb-2">
            Target Price ($) *
          </label>
          <Input
            id="targetPrice"
            type="number"
            step="0.01"
            min="0"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
            Custom Message (optional)
          </label>
          <Input
            id="message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Custom alert message"
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Creating Alert...' : 'Create Alert'}
        </Button>
      </form>
    </div>
  );
}
