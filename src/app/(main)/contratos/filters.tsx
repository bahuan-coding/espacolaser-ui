"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { cardStyles } from "@/lib/design-system/tokens";

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "pending_first_installment", label: "Aguardando 1ª" },
  { value: "pending_second_installment", label: "Aguardando 2ª" },
  { value: "eligible", label: "Elegível" },
  { value: "eligible_late", label: "Elegível (atraso)" },
  { value: "disbursed", label: "Desembolsado" },
  { value: "ineligible", label: "Inelegível" },
];

interface ContratosFiltersProps {
  currentStatus?: string;
  currentSearch?: string;
}

export function ContratosFilters({ currentStatus, currentSearch }: ContratosFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch || "");

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    params.delete("page");
    router.push(`/contratos?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`/contratos?${params.toString()}`);
  };

  return (
    <div className={cardStyles.base}>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número ou cliente..."
              className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-100 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm text-slate-500 whitespace-nowrap font-medium">Status:</span>
          <select
            value={currentStatus || "all"}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

