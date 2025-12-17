import { cn } from "@/lib/utils";
import { cardStyles, colors } from "@/lib/design-system/tokens";

type MetricVariant = "default" | "success" | "info" | "warning" | "danger";

interface MetricCardProps {
  label: string;
  value: string | React.ReactNode;
  description?: string;
  trend?: string;
  variant?: MetricVariant;
  icon?: React.ReactNode;
}

const variantStyles: Record<MetricVariant, string> = {
  default: "text-slate-900 dark:text-slate-100",
  success: "text-emerald-600 dark:text-emerald-400",
  info: "text-cyan-600 dark:text-cyan-400",
  warning: "text-amber-600 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
};

export function MetricCard({
  label,
  value,
  description,
  trend,
  variant = "default",
  icon,
}: MetricCardProps) {
  return (
    <div className={cn(cardStyles.base, "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800")}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
      </div>
      <p className={cn("text-2xl font-bold mt-2", variantStyles[variant])}>
        {value}
      </p>
      {(description || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {description && <span className="text-xs text-slate-500 dark:text-slate-400">{description}</span>}
          {trend && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{trend}</span>}
        </div>
      )}
    </div>
  );
}
