"use client";

import { useState, useEffect } from "react";
import { X, Bell, TrendingUp, TrendingDown } from "lucide-react";
import { createAlert } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol?: string;
  currentPrice?: number;
  onAlertCreated?: () => void;
}

export default function AlertModal({
  isOpen,
  onClose,
  symbol = "",
  currentPrice = 0,
  onAlertCreated,
}: AlertModalProps) {
  const [alertSymbol, setAlertSymbol] = useState("");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [targetPrice, setTargetPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Initialize form with props
  useEffect(() => {
    if (isOpen) {
      setAlertSymbol(symbol);
      setTargetPrice(currentPrice > 0 ? currentPrice.toString() : "");
      setMessage("");
    }
  }, [isOpen, symbol, currentPrice]);

  // Clear form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAlertSymbol("");
      setCondition("above");
      setTargetPrice("");
      setMessage("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!alertSymbol.trim()) {
      toast.error("Please enter a stock symbol");
      return;
    }

    const price = parseFloat(targetPrice);
    if (!price || price <= 0) {
      toast.error("Please enter a valid target price");
      return;
    }

    setLoading(true);
    try {
      await createAlert(
        alertSymbol.toUpperCase(),
        condition,
        price,
        message || undefined,
      );
      toast.success(`Alert created for ${alertSymbol.toUpperCase()}`);
      onAlertCreated?.();
      onClose();
    } catch (error) {
      console.error("Error creating alert:", error);
      toast.error("Failed to create alert");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  const getSuggestedPrices = () => {
    if (!currentPrice || currentPrice <= 0) return [];

    return [
      { label: "-5%", value: (currentPrice * 0.95).toFixed(2) },
      { label: "-10%", value: (currentPrice * 0.9).toFixed(2) },
      { label: "+5%", value: (currentPrice * 1.05).toFixed(2) },
      { label: "+10%", value: (currentPrice * 1.1).toFixed(2) },
    ];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-lg bg-white shadow-xl transition-all"
          onKeyDown={handleKeyDown}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Create Price Alert
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
            {/* Stock Symbol */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stock Symbol
              </label>
              <Input
                type="text"
                value={alertSymbol}
                onChange={(e) => setAlertSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., AAPL"
                className="uppercase"
                required
              />
            </div>

            {/* Current Price Display */}
            {currentPrice > 0 && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  Current Price:{" "}
                  <span className="font-semibold">${currentPrice}</span>
                </p>
              </div>
            )}

            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Alert Condition
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition("above")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                    condition === "above"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-medium">Above</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCondition("below")}
                  className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                    condition === "below"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <TrendingDown className="h-4 w-4" />
                  <span className="font-medium">Below</span>
                </button>
              </div>
            </div>

            {/* Target Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Price ($)
              </label>
              <Input
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                required
              />

              {/* Quick Price Suggestions */}
              {currentPrice > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Quick select:</p>
                  <div className="flex gap-1 flex-wrap">
                    {getSuggestedPrices().map((price) => (
                      <button
                        key={price.label}
                        type="button"
                        onClick={() => setTargetPrice(price.value)}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                      >
                        {price.label} (${price.value})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Message (Optional)
              </label>
              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g., Time to buy more shares!"
                maxLength={100}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Creating..." : "Create Alert"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
