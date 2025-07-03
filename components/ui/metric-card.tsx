import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  comparison?: string;
  comparisonValue?: string | number;
  isGood?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  comparison,
  comparisonValue,
  isGood,
  className = "",
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (trend === "up")
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === "down")
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === "up" && isGood) return "text-green-600";
    if (trend === "down" && !isGood) return "text-green-600";
    if (trend === "up" && !isGood) return "text-red-600";
    if (trend === "down" && isGood) return "text-red-600";
    return "text-gray-600";
  };

  const getComparisonColor = () => {
    if (!comparisonValue || !value) return "text-gray-500";
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    const numComparison =
      typeof comparisonValue === "string"
        ? parseFloat(comparisonValue)
        : comparisonValue;

    if (isNaN(numValue) || isNaN(numComparison)) return "text-gray-500";

    if (isGood) {
      return numValue > numComparison ? "text-green-600" : "text-red-600";
    } else {
      return numValue < numComparison ? "text-green-600" : "text-red-600";
    }
  };

  return (
    <div
      className={`bg-white rounded-lg p-4 shadow-sm border border-gray-200 ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {trend && getTrendIcon()}
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${getTrendColor()}`}>
          {value === "N/A" || value === null || value === undefined
            ? "—"
            : value}
        </span>
        {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
      </div>

      {comparison && comparisonValue && (
        <div className="mt-2 text-sm">
          <span className="text-gray-500">{comparison}: </span>
          <span className={`font-medium ${getComparisonColor()}`}>
            {comparisonValue === "N/A" ||
            comparisonValue === null ||
            comparisonValue === undefined
              ? "—"
              : comparisonValue}
          </span>
        </div>
      )}
    </div>
  );
}
