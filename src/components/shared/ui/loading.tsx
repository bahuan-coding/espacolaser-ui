import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <svg
      className={cn("animate-spin text-emerald-500", sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface PageLoadingProps {
  message?: string;
}

export function PageLoading({ message = "Carregando..." }: PageLoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-slate-500">{message}</p>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/3 mb-4" />
      <div className="space-y-3">
        <div className="h-8 bg-slate-100 rounded w-1/2" />
        <div className="h-4 bg-slate-50 rounded w-2/3" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50">
        <div className="h-4 bg-slate-200 rounded w-full" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4">
            <div className="h-10 bg-slate-100 rounded flex-1" />
            <div className="h-10 bg-slate-50 rounded w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

