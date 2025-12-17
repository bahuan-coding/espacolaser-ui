"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cardStyles } from "@/lib/design-system/tokens";

interface ExtratoFiltersProps {
  currentType?: string;
}

export function ExtratoFilters({ currentType }: ExtratoFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeChange = (type: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (type === "all") {
      params.delete("type");
    } else {
      params.set("type", type);
    }
    params.delete("page");
    router.push(`/extrato?${params.toString()}`);
  };

  return (
    <div className={cardStyles.base}>
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Tipo:</span>
          <div className="flex gap-1">
            {[
              { value: "all", label: "Todos" },
              { value: "credit", label: "Créditos" },
              { value: "debit", label: "Débitos" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleTypeChange(option.value)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  (currentType === option.value) || (!currentType && option.value === "all")
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

