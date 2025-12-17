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
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-sm text-slate-400 whitespace-nowrap">Status:</span>
          <select
            value={currentStatus || "all"}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-emerald-500/50"
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

