import { ReactNode } from "react";
import { AlertTriangle, CheckCircle, Info, XCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type AlertVariant = "warning" | "danger" | "success" | "info";

interface AlertCardProps {
  title: string;
  description?: string;
  variant?: AlertVariant;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: ReactNode }> = {
  warning: {
    bg: "bg-amber-50 dark:bg-amber-900/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-800 dark:text-amber-400",
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
  },
  danger: {
    bg: "bg-red-50 dark:bg-red-900/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-800 dark:text-red-400",
    icon: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-900/30",
    border: "border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-800 dark:text-emerald-400",
    icon: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  info: {
    bg: "bg-cyan-50 dark:bg-cyan-900/30",
    border: "border-cyan-200 dark:border-cyan-800",
    text: "text-cyan-800 dark:text-cyan-400",
    icon: <Info className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />,
  },
};

export function AlertCard({
  title,
  description,
  variant = "info",
  action,
  icon,
  className,
}: AlertCardProps) {
  const styles = variantStyles[variant];

  const ActionWrapper = action?.href ? Link : "button";

  return (
    <div
      className={cn(
        "p-4 rounded-xl border",
        styles.bg,
        styles.border,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5" aria-hidden="true">
          {icon || styles.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("text-sm font-medium", styles.text)}>
            {title}
          </h4>
          {description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
          {action && (
            <ActionWrapper
              href={action.href || "#"}
              onClick={action.onClick}
              className={cn(
                "inline-flex items-center gap-1 mt-2 text-sm font-medium transition-colors",
                variant === "warning" && "text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300",
                variant === "danger" && "text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300",
                variant === "success" && "text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300",
                variant === "info" && "text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300"
              )}
            >
              {action.label}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </ActionWrapper>
          )}
        </div>
      </div>
    </div>
  );
}

