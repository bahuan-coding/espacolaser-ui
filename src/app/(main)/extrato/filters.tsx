"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cardStyles, inputStyles, buttonStyles } from "@/lib/design-system/tokens";
import { Calendar, X, Filter } from "lucide-react";

interface ExtratoFiltersProps {
  currentType?: string;
  currentStartDate?: string;
  currentEndDate?: string;
  currentReferenceType?: string;
  referenceTypes?: { type: string; count: number }[];
}

const referenceTypeLabels: Record<string, string> = {
  disbursement_split: "Antecipação",
  drawdown: "Débito",
  manual: "Manual",
};

export function ExtratoFilters({ 
  currentType, 
  currentStartDate, 
  currentEndDate,
  currentReferenceType,
  referenceTypes = [],
}: ExtratoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState(currentStartDate || "");
  const [endDate, setEndDate] = useState(currentEndDate || "");

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete("page");
    router.push(`/extrato?${params.toString()}`);
  };

  const handleTypeChange = (type: string) => {
    updateParams({ type: type === "all" ? null : type });
  };

  const handleReferenceTypeChange = (refType: string) => {
    updateParams({ referenceType: refType === "all" ? null : refType });
  };

  const handleDateFilter = () => {
    updateParams({
      startDate: startDate || null,
      endDate: endDate || null,
    });
  };

  const clearDateFilter = () => {
    setStartDate("");
    setEndDate("");
    updateParams({ startDate: null, endDate: null });
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    router.push("/extrato");
  };

  const hasDateFilter = currentStartDate || currentEndDate;
  const hasAnyFilter = currentType || currentReferenceType || hasDateFilter;

  return (
    <div className={cardStyles.base}>
      <div className="space-y-4">
        {/* First row: Type and Reference Type */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Tipo:</span>
            <div className="flex gap-1">
              {[
                { value: "all", label: "Todos" },
                { value: "credit", label: "Créditos" },
                { value: "debit", label: "Débitos" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleTypeChange(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    (currentType === option.value) || (!currentType && option.value === "all")
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reference Type filter */}
          {referenceTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Origem:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => handleReferenceTypeChange("all")}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    !currentReferenceType
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  Todos
                </button>
                {referenceTypes.map((rt) => (
                  <button
                    key={rt.type}
                    onClick={() => handleReferenceTypeChange(rt.type)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      currentReferenceType === rt.type
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    {referenceTypeLabels[rt.type] || rt.type} ({rt.count})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Second row: Date filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500 font-medium">Período:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`${inputStyles.base} w-auto text-sm py-2`}
              aria-label="Data inicial"
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`${inputStyles.base} w-auto text-sm py-2`}
              aria-label="Data final"
            />
            <button
              onClick={handleDateFilter}
              className={`${buttonStyles.secondary} text-sm py-2`}
            >
              Aplicar
            </button>
            {hasDateFilter && (
              <button
                onClick={clearDateFilter}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Limpar filtro de data"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Clear all */}
          {hasAnyFilter && (
            <button
              onClick={clearAllFilters}
              className="ml-auto text-sm text-slate-500 hover:text-slate-700 underline transition-colors"
            >
              Limpar todos os filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
