"use client";

import { cn } from "@/lib/utils";
import { cardStyles } from "@/lib/design-system/tokens";
import { FileX } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyDescription?: string;
  isLoading?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "Nenhum registro encontrado",
  emptyDescription,
  isLoading = false,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className={cardStyles.base}>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-slate-100 rounded-lg" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-50 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cardStyles.base}>
        <div className="text-center py-12">
          <FileX className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">{emptyMessage}</p>
          {emptyDescription && (
            <p className="text-sm text-slate-500 mt-1">{emptyDescription}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(cardStyles.base, "p-0 overflow-hidden")}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider",
                    col.className,
                    col.hideOnMobile && "hidden md:table-cell"
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer hover:bg-slate-50"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-4 text-sm text-slate-700",
                      col.className,
                      col.hideOnMobile && "hidden md:table-cell"
                    )}
                  >
                    {col.render
                      ? col.render(item)
                      : (item as Record<string, unknown>)[col.key]?.toString() ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
      <p className="text-sm text-slate-500">
        Página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Anterior
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

