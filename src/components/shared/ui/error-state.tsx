import { AlertTriangle, RefreshCw } from "lucide-react";
import { buttonStyles } from "@/lib/design-system/tokens";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Algo deu errado",
  message = "Não foi possível carregar os dados. Tente novamente.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 text-center">{title}</h3>
      <p className="text-sm text-slate-500 mt-2 text-center max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={`${buttonStyles.secondary} mt-4 flex items-center gap-2`}
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {icon && (
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 text-center">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 mt-2 text-center max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

