import { cn } from "@/lib/utils";
import { cardStyles, colors } from "@/lib/design-system/tokens";

type MetricVariant = "default" | "success" | "info";

interface MetricCardProps {
  label: string;
  value: string | React.ReactNode;
  description?: string;
  trend?: string;
  variant?: MetricVariant;
  icon?: React.ReactNode;
}

const variantStyles: Record<MetricVariant, string> = {
  default: colors.text.primary,
  success: colors.accent.success,
  info: colors.accent.info,
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
    <div className={cardStyles.base}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        {icon && <div className="text-slate-500">{icon}</div>}
      </div>
      <p className={cn("text-2xl font-bold mt-1", variantStyles[variant])}>
        {value}
      </p>
      {(description || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {description && <span className="text-xs text-slate-500">{description}</span>}
          {trend && <span className="text-xs text-emerald-400">{trend}</span>}
        </div>
      )}
    </div>
  );
}
