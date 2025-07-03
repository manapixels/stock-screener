"use client";

import { useState, useCallback } from "react";
import { Bell, Plus, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import AlertList from "@/components/AlertList";
import AlertModal from "@/components/AlertModal";
import TelegramSettings from "@/components/TelegramSettings";
import { useAuth } from "@/components/AuthProvider";

interface AlertsSidebarProps {
  selectedSymbol?: string;
  currentPrice?: number;
  className?: string;
}

export default function AlertsSidebar({
  selectedSymbol,
  currentPrice,
  className = "",
}: AlertsSidebarProps) {
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  const handleAlertCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleOpenAlertModal = () => {
    if (!user) {
      return; // AlertModal will handle the auth check
    }
    setIsAlertModalOpen(true);
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-600" />
            <h2 className="font-semibold text-gray-900">Price Alerts</h2>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="text-gray-500 hover:text-gray-700"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAlertModal}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Alert</span>
            </Button>
          </div>
        </div>

        {/* Quick Alert for Selected Stock */}
        {selectedSymbol && currentPrice && user && (
          <div className="p-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Quick Alert for {selectedSymbol}
                </p>
                <p className="text-xs text-blue-700">
                  Current: ${currentPrice.toFixed(2)}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenAlertModal}
                className="text-blue-700 border-blue-300 hover:bg-blue-100"
              >
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Telegram Settings (Collapsible) */}
        {isSettingsOpen && (
          <div className="border-b border-gray-200">
            <TelegramSettings />
          </div>
        )}

        {/* Alert List */}
        <div className="max-h-96 overflow-y-auto">
          <AlertList key={refreshKey} />
        </div>

        {/* Empty State for Non-Users */}
        {!user && (
          <div className="p-6 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">
              Sign in for Price Alerts
            </p>
            <p className="text-sm text-gray-500">
              Get notified when your stocks hit target prices
            </p>
            <Button
              onClick={() => (window.location.href = "/auth")}
              className="mt-3"
              size="sm"
            >
              Sign In
            </Button>
          </div>
        )}
      </div>

      {/* Alert Creation Modal */}
      <AlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        symbol={selectedSymbol}
        currentPrice={currentPrice}
        onAlertCreated={handleAlertCreated}
      />
    </>
  );
}
