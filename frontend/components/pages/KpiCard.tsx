import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: string;
  color?: "accent" | "blue" | "green" | "orange" | "pink";
}

const colorMap = {
  accent: "bg-accent/10 text-accent",
  blue: "bg-blue/10 text-blue",
  green: "bg-green/10 text-green",
  orange: "bg-orange/10 text-orange",
  pink: "bg-pink/10 text-pink",
};

export default function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  color = "accent",
}: KpiCardProps) {
  return (
    <div className="bg-card-bg border border-border-color rounded-xl p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}
      >
        <Icon size={22} strokeWidth={2} />
      </div>
      <div>
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {trend && (
          <div className="text-xs text-green flex items-center gap-1 mt-0.5">
            ↗ {trend}
          </div>
        )}
      </div>
    </div>
  );
}