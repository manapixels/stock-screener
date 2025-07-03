import { TrendingDown, AlertTriangle, AlertCircle } from "lucide-react";

interface BearPoint {
  text: string;
  strength: "strong" | "moderate" | "weak";
}

interface BearCaseProps {
  bearPoints: BearPoint[];
}

const strengthConfig = {
  strong: {
    icon: AlertTriangle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    label: "High Risk",
  },
  moderate: {
    icon: TrendingDown,
    color: "text-red-500",
    bgColor: "bg-red-25",
    borderColor: "border-red-100",
    label: "Moderate Risk",
  },
  weak: {
    icon: AlertCircle,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    label: "Low Risk",
  },
};

export function BearCase({ bearPoints }: BearCaseProps) {
  if (bearPoints.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Bear Case</h3>
        </div>
        <p className="text-gray-500 text-center py-4">
          No major risk factors identified
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown className="h-5 w-5 text-red-600" />
        <h3 className="text-lg font-semibold text-gray-900">Bear Case</h3>
        <span className="text-sm text-gray-500">
          ({bearPoints.length} risks)
        </span>
      </div>

      <div className="space-y-3">
        {bearPoints.map((point, index) => {
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

      <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-700 font-medium">
          ⚠️ Consider these risks before making investment decisions
        </p>
      </div>
    </div>
  );
}
