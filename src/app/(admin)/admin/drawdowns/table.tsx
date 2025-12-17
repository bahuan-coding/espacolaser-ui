"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface DrawdownData {
  id: string;
  amountCents: number;
  reason: string;
  description: string | null;
  referenceType: string | null;
  referenceId: string | null;
  executedAt: Date;
  escrowAccount: {
    merchant: { id: string; name: string };
    fund: { id: string; name: string };
  };
}

interface AdminDrawdownsTableProps {
  drawdowns: DrawdownData[];
  pagination: {
    page: number;
    totalPages: number;
  };
  buildUrl: (params: Record<string, string | undefined>) => string;
}

const reasonLabels: Record<string, string> = {
  late_payment: "Atraso",
  default_coverage: "Inadimplência",
  fee_charge: "Taxa",
  manual_adjustment: "Ajuste Manual",
};

export function AdminDrawdownsTable({ drawdowns, pagination, buildUrl }: AdminDrawdownsTableProps) {
  const columns = [
    {
      key: "merchant",
      header: "Lojista",
      render: (d: DrawdownData) => (
        <div>
          <p className="text-white font-medium">{d.escrowAccount.merchant.name}</p>
          <p className="text-xs text-slate-500">{d.escrowAccount.fund.name}</p>
        </div>
      ),
    },
    {
      key: "executedAt",
      header: "Data",
      render: (d: DrawdownData) => (
        <span className="text-slate-300">{formatDateTime(d.executedAt)}</span>
      ),
    },
    {
      key: "amountCents",
      header: "Valor",
      className: "text-right",
      render: (d: DrawdownData) => (
        <span className="text-red-400 font-medium">
          -{formatCurrency(d.amountCents)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Motivo",
      render: (d: DrawdownData) => (
        <StatusBadge status={d.reason} type="installment" showLabel={false} />
      ),
    },
    {
      key: "description",
      header: "Descrição",
      render: (d: DrawdownData) => (
        <span className="text-slate-400 text-sm">
          {d.description || reasonLabels[d.reason] || d.reason}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Referência",
      render: (d: DrawdownData) => (
        <span className="text-xs text-slate-500 font-mono">
          {d.referenceId ? `${d.referenceType}: ${d.referenceId.slice(0, 8)}...` : "-"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={drawdowns}
        keyExtractor={(d) => d.id}
        emptyMessage="Nenhum drawdown encontrado"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
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

