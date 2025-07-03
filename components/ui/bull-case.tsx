import { TrendingUp, Star, Zap } from "lucide-react";

interface BullPoint {
  text: string;
  strength: "strong" | "moderate" | "weak";
}

interface BullCaseProps {
  bullPoints: BullPoint[];
}

const strengthConfig = {
  strong: {
    icon: Star,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    label: "Strong",
  },
  moderate: {
    icon: TrendingUp,
    color: "text-green-500",
    bgColor: "bg-green-25",
    borderColor: "border-green-100",
    label: "Moderate",
  },
  weak: {
    icon: Zap,
    color: "text-green-400",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    label: "Weak",
  },
};

export function BullCase({ bullPoints }: BullCaseProps) {
  if (bullPoints.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">Bull Case</h3>
        </div>
        <p className="text-gray-500 text-center py-4">
          No strong bullish factors identified
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Bull Case</h3>
        <span className="text-sm text-gray-500">
          ({bullPoints.length} factors)
        </span>
      </div>

      <div className="space-y-3">
        {bullPoints.map((point, index) => {
          const config = strengthConfig[point.strength];
          const Icon = config.icon;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 mt-0.5 ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {point.text}
                  </p>
                  <span
                    className={`inline-block mt-2 text-xs font-medium px-2 py-1 rounded-full ${config.color} ${config.bgColor}`}
                  >
                    {config.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
        <p className="text-sm text-green-700 font-medium">
          💡 These factors support the potential for positive stock performance
        </p>
      </div>
    </div>
  );
}
