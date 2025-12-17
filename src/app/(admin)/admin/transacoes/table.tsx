"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface TransactionData {
  id: string;
  gatewayTransactionId: string;
  amountCents: bigint;
  status: string;
  authorizationCode: string | null;
  processedAt: Date;
  merchant: { name: string };
  contract: {
    contractNumber: string;
    endCustomer: { name: string };
  } | null;
}

interface AdminTransacoesTableProps {
  transactions: TransactionData[];
  pagination: {
    page: number;
    totalPages: number;
  };
  searchParams: {
    status?: string;
  };
}

const statusColors: Record<string, string> = {
  authorized: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  captured: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  settled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  refunded: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function AdminTransacoesTable({ transactions, pagination, searchParams }: AdminTransacoesTableProps) {
  const columns = [
    {
      key: "gatewayTransactionId",
      header: "ID Gateway",
      render: (t: TransactionData) => (
        <span className="text-white font-mono text-sm">{t.gatewayTransactionId}</span>
      ),
    },
    {
      key: "merchant",
      header: "Lojista",
      render: (t: TransactionData) => (
        <span className="text-slate-300">{t.merchant.name}</span>
      ),
    },
    {
      key: "contract",
      header: "Contrato / Cliente",
      render: (t: TransactionData) => (
        <div>
          {t.contract ? (
            <>
              <Link
                href={`/contratos/${t.contract.contractNumber}`}
                className="text-violet-400 hover:text-violet-300 text-sm"
              >
                {t.contract.contractNumber}
              </Link>
              <p className="text-xs text-slate-500">{t.contract.endCustomer.name}</p>
            </>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (t: TransactionData) => (
        <span className="text-white font-medium">{formatCurrency(t.amountCents)}</span>
      ),
    },
    {
      key: "processedAt",
      header: "Processado",
      render: (t: TransactionData) => (
        <span className="text-slate-400 text-sm">{formatDateTime(t.processedAt)}</span>
      ),
    },
    {
      key: "authCode",
      header: "Autorização",
      render: (t: TransactionData) => (
        <span className="text-slate-500 font-mono text-xs">
          {t.authorizationCode || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t: TransactionData) => (
        <span
          className={`text-xs px-2 py-1 rounded border ${statusColors[t.status] || "bg-slate-700 text-slate-400 border-slate-600"}`}
        >
          {t.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={transactions}
        keyExtractor={(t) => t.id}
        emptyMessage="Nenhuma transação encontrada"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/admin/transacoes?${searchParams.status ? `status=${searchParams.status}&` : ""}page=${pagination.page - 1}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/admin/transacoes?${searchParams.status ? `status=${searchParams.status}&` : ""}page=${pagination.page + 1}`}
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

