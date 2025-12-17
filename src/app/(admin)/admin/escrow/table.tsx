"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency } from "@/lib/utils";

interface EscrowAccountData {
  id: string;
  balanceCents: bigint;
  isActive: boolean;
  merchant: { id: string; name: string; document: string };
  fund: { id: string; name: string };
  _count: { ledgerEntries: number; drawdowns: number };
}

interface AdminEscrowTableProps {
  accounts: EscrowAccountData[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

export function AdminEscrowTable({ accounts, pagination }: AdminEscrowTableProps) {
  const columns = [
    {
      key: "merchant",
      header: "Lojista",
      render: (a: EscrowAccountData) => (
        <div>
          <p className="text-white font-medium">{a.merchant.name}</p>
          <p className="text-xs text-slate-500">{a.merchant.document}</p>
        </div>
      ),
    },
    {
      key: "fund",
      header: "Fundo",
      render: (a: EscrowAccountData) => (
        <span className="text-slate-300">{a.fund.name}</span>
      ),
    },
    {
      key: "balanceCents",
      header: "Saldo",
      className: "text-right",
      render: (a: EscrowAccountData) => (
        <span className={`font-medium ${a.balanceCents > 0n ? "text-emerald-400" : "text-slate-400"}`}>
          {formatCurrency(a.balanceCents)}
        </span>
      ),
    },
    {
      key: "ledgerEntries",
      header: "Movimentações",
      className: "text-center",
      render: (a: EscrowAccountData) => (
        <span className="text-slate-300">{a._count.ledgerEntries}</span>
      ),
    },
    {
      key: "drawdowns",
      header: "Drawdowns",
      className: "text-center",
      render: (a: EscrowAccountData) => (
        <span className={a._count.drawdowns > 0 ? "text-red-400" : "text-slate-500"}>
          {a._count.drawdowns}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (a: EscrowAccountData) => (
        <StatusBadge
          status={a.isActive ? "paid" : "cancelled"}
          type="installment"
          showLabel={false}
        />
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={accounts}
        keyExtractor={(a) => a.id}
        emptyMessage="Nenhuma conta escrow encontrada"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/admin/escrow?page=${pagination.page - 1}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/admin/escrow?page=${pagination.page + 1}`}
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

