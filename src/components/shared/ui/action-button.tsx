"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonStyles } from "@/lib/design-system/tokens";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  loadingText?: string;
  disabledReason?: string;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

export function ActionButton({
  children,
  variant = "primary",
  loading = false,
  loadingText,
  disabledReason,
  icon,
  iconPosition = "left",
  disabled,
  className,
  ...props
}: ActionButtonProps) {
  const isDisabled = disabled || loading;
  const showTooltip = isDisabled && disabledReason;

  return (
    <div className="relative group inline-block">
      <button
        disabled={isDisabled}
        className={cn(
          buttonStyles[variant],
          "inline-flex items-center justify-center gap-2",
          className
        )}
        aria-busy={loading}
        aria-disabled={isDisabled}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <span className="shrink-0" aria-hidden="true">{icon}</span>
            )}
            <span>{children}</span>
            {icon && iconPosition === "right" && (
              <span className="shrink-0" aria-hidden="true">{icon}</span>
            )}
          </>
        )}
      </button>
      
      {showTooltip && (
        <div 
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
        >
          {disabledReason}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  );
}

