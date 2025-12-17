"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Pagination } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { EscrowLedgerEntry } from "@/generated/prisma";

interface ExtratoTableProps {
  entries: EscrowLedgerEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ExtratoTable({ entries, pagination }: ExtratoTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/extrato?${params.toString()}`);
  };

  const columns = [
    {
      key: "createdAt",
      header: "Data/Hora",
      render: (entry: EscrowLedgerEntry) => (
        <span className="text-slate-300">{formatDateTime(entry.createdAt)}</span>
      ),
    },
    {
      key: "entryType",
      header: "Tipo",
      render: (entry: EscrowLedgerEntry) => (
        <StatusBadge status={entry.entryType} type="ledger" />
      ),
    },
    {
      key: "amountCents",
      header: "Valor",
      className: "text-right",
      render: (entry: EscrowLedgerEntry) => (
        <span className={`font-medium ${
          entry.entryType === "credit" ? "text-emerald-400" : "text-red-400"
        }`}>
          {entry.entryType === "credit" ? "+" : "-"}
          {formatCurrency(entry.amountCents)}
        </span>
      ),
    },
    {
      key: "balanceAfterCents",
      header: "Saldo Após",
      className: "text-right",
      render: (entry: EscrowLedgerEntry) => (
        <span className="text-slate-300">{formatCurrency(entry.balanceAfterCents)}</span>
      ),
    },
    {
      key: "description",
      header: "Descrição",
      render: (entry: EscrowLedgerEntry) => (
        <span className="text-slate-400">
          {entry.description || entry.referenceType || "-"}
        </span>
      ),
    },
    {
      key: "referenceId",
      header: "Referência",
      render: (entry: EscrowLedgerEntry) => (
        <span className="text-xs text-slate-500 font-mono">
          {entry.referenceId ? entry.referenceId.slice(0, 12) + "..." : "-"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={entries}
        keyExtractor={(entry) => entry.id}
        emptyMessage="Nenhuma movimentação encontrada"
      />
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

