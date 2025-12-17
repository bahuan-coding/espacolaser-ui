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
  default: colors.text.primary,
  success: colors.accent.success,
  info: colors.accent.info,
  warning: colors.accent.warning,
  danger: colors.accent.danger,
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
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <p className={cn("text-2xl font-bold mt-2", variantStyles[variant])}>
        {value}
      </p>
      {(description || trend) && (
        <div className="mt-2 flex items-center gap-2">
          {description && <span className="text-xs text-slate-500">{description}</span>}
          {trend && <span className="text-xs text-emerald-600 font-medium">{trend}</span>}
        </div>
      )}
    </div>
  );
}
