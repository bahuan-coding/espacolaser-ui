"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface LedgerEntryData {
  id: string;
  createdAt: Date;
  entryType: string;
  amountCents: number;
  balanceAfterCents: number;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  escrowAccount: {
    merchant: { id: string; name: string };
    fund: { id: string; name: string };
  };
}

interface AdminLedgerTableProps {
  entries: LedgerEntryData[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
  buildUrl: (params: Record<string, string | undefined>) => string;
}

export function AdminLedgerTable({ entries, pagination, buildUrl }: AdminLedgerTableProps) {
  const columns = [
    {
      key: "createdAt",
      header: "Data",
      render: (e: LedgerEntryData) => (
        <span className="text-slate-300">{formatDateTime(e.createdAt)}</span>
      ),
    },
    {
      key: "merchant",
      header: "Lojista",
      render: (e: LedgerEntryData) => (
        <div>
          <p className="text-white font-medium">{e.escrowAccount.merchant.name}</p>
          <p className="text-xs text-slate-500">{e.escrowAccount.fund.name}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (e: LedgerEntryData) => (
        <StatusBadge status={e.entryType} type="ledger" />
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (e: LedgerEntryData) => (
        <span className={`font-medium ${
          e.entryType === "credit" ? "text-emerald-400" : "text-red-400"
        }`}>
          {e.entryType === "credit" ? "+" : "-"}{formatCurrency(e.amountCents)}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Saldo Após",
      className: "text-right",
      render: (e: LedgerEntryData) => (
        <span className="text-slate-300">{formatCurrency(e.balanceAfterCents)}</span>
      ),
    },
    {
      key: "description",
      header: "Descrição",
      render: (e: LedgerEntryData) => (
        <span className="text-slate-400 text-sm">
          {e.description || e.referenceType || "-"}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Referência",
      render: (e: LedgerEntryData) => (
        <span className="text-xs text-slate-500 font-mono">
          {e.referenceId ? `${e.referenceType}: ${e.referenceId.slice(0, 8)}...` : "-"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={entries}
        keyExtractor={(e) => e.id}
        emptyMessage="Nenhuma movimentação encontrada"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} movimentações)
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={buildUrl({ page: String(pagination.page - 1) })}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={buildUrl({ page: String(pagination.page + 1) })}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Próxima
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

