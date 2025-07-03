"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthProvider";
import { getAlerts, deleteAlert, isAuthError } from "@/lib/api";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface Alert {
  id: string;
  symbol: string;
  condition: string;
  target_price: number;
  message?: string;
  is_active: boolean;
  created_at: string;
}

function AuthPrompt() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-gray-400 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5-5-5h5v-12h0V5z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 10v11a2 2 0 01-2 2H7a2 2 0 01-2-2V10"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Sign in to view your alerts
      </h3>
      <p className="text-gray-600 mb-4">
        Get notified when your stocks hit target prices
      </p>
      <Button
        onClick={() => (window.location.href = "/auth")}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        Sign In
      </Button>
    </div>
  );
}

export default function AlertList() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const result = await getAlerts();
      if (isAuthError(result)) {
        // Auth error handled by AuthGuard, just return
        return;
      }
      setAlerts(result);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteAlert(id);
      if (isAuthError(result)) {
        return;
      }
      toast.success("Alert deleted");
      fetchAlerts();
    } catch (error) {
      console.error("Error deleting alert:", error);
      toast.error("Failed to delete alert");
    }
  };

  if (!user) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4">Price Alerts</h2>
        <AuthPrompt />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Price Alerts</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : alerts.length === 0 ? (
        <p className="text-gray-600 text-center py-8">
          No alerts set yet. Create an alert to get notified about price
          changes!
        </p>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-600">
                      {alert.symbol}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        alert.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {alert.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {alert.condition} ${alert.target_price}
                  </p>
                  {alert.message && (
                    <p className="text-sm text-gray-500 mt-1">
                      {alert.message}
                    </p>
                  )}
                </div>
                <Button
                  onClick={() => handleDelete(alert.id)}
                  variant="destructive"
                  size="sm"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
