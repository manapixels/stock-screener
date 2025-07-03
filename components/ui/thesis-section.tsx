import React from "react";
import { TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

interface ThesisPoint {
  text: string;
  strength?: "strong" | "moderate" | "weak";
}

interface ThesisSectionProps {
  bullCase: ThesisPoint[];
  bearCase: ThesisPoint[];
  className?: string;
}

export function ThesisSection({
  bullCase,
  bearCase,
  className = "",
}: ThesisSectionProps) {
  const getStrengthIcon = (
    strength?: string,
    type: "bull" | "bear" = "bull",
  ) => {
    const baseClass = "h-4 w-4";

    if (type === "bull") {
      switch (strength) {
        case "strong":
          return <CheckCircle className={`${baseClass} text-green-600`} />;
        case "moderate":
          return <TrendingUp className={`${baseClass} text-green-500`} />;
        default:
          return <CheckCircle className={`${baseClass} text-green-400`} />;
      }
    } else {
      switch (strength) {
        case "strong":
          return <XCircle className={`${baseClass} text-red-600`} />;
        case "moderate":
          return <AlertTriangle className={`${baseClass} text-red-500`} />;
        default:
          return <AlertTriangle className={`${baseClass} text-red-400`} />;
      }
    }
  };

  const getStrengthColor = (
    strength?: string,
    type: "bull" | "bear" = "bull",
  ) => {
    if (type === "bull") {
      switch (strength) {
        case "strong":
          return "text-green-700";
        case "moderate":
          return "text-green-600";
        default:
          return "text-green-500";
      }
    } else {
      switch (strength) {
        case "strong":
          return "text-red-700";
        case "moderate":
          return "text-red-600";
        default:
          return "text-red-500";
      }
    }
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
      {/* Bull Case */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-green-800">Bull Case</h3>
        </div>

        <div className="space-y-3">
          {bullCase.map((point, index) => (
            <div key={index} className="flex items-start gap-3">
              {getStrengthIcon(point.strength, "bull")}
              <p
                className={`text-sm ${getStrengthColor(point.strength, "bull")}`}
              >
                {point.text}
              </p>
            </div>
          ))}
        </div>

        {bullCase.length === 0 && (
          <p className="text-green-600 text-sm italic">
            No bullish factors identified
          </p>
        )}
      </div>

      {/* Bear Case */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Bear Case</h3>
        </div>

        <div className="space-y-3">
          {bearCase.map((point, index) => (
            <div key={index} className="flex items-start gap-3">
              {getStrengthIcon(point.strength, "bear")}
              <p
                className={`text-sm ${getStrengthColor(point.strength, "bear")}`}
              >
                {point.text}
              </p>
            </div>
          ))}
        </div>

        {bearCase.length === 0 && (
          <p className="text-red-600 text-sm italic">
            No bearish factors identified
          </p>
        )}
      </div>
    </div>
  );
}
