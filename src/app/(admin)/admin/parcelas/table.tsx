"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InstallmentData {
  id: string;
  installmentNumber: number;
  amountCents: number;
  dueDate: Date;
  paidAt: Date | null;
  daysOverdue: number;
  status: string;
  origin: string;
  contract: {
    id: string;
    contractNumber: string;
    merchant: { id: string; name: string };
    endCustomer: { id: string; name: string; document: string };
  };
}

interface AdminParcelasTableProps {
  installments: InstallmentData[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
  basePath: string;
  currentParams: Record<string, string | undefined>;
}

export function AdminParcelasTable({ installments, pagination, basePath, currentParams }: AdminParcelasTableProps) {
  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...currentParams, ...newParams };
    const query = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `${basePath}${query ? `?${query}` : ""}`;
  };

  const columns = [
    {
      key: "contract",
      header: "Contrato",
      render: (i: InstallmentData) => (
        <div>
          <Link
            href={`/admin/contratos/${i.contract.id}`}
            className="text-violet-400 hover:text-violet-300 font-medium"
          >
            {i.contract.contractNumber}
          </Link>
          <p className="text-xs text-slate-500">{i.contract.merchant.name}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (i: InstallmentData) => (
        <div>
          <p className="text-slate-300">{i.contract.endCustomer.name}</p>
          <p className="text-xs text-slate-500">{i.contract.endCustomer.document}</p>
        </div>
      ),
    },
    {
      key: "installment",
      header: "Parcela",
      className: "text-center",
      render: (i: InstallmentData) => (
        <span className="text-slate-300">{i.installmentNumber}</span>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (i: InstallmentData) => (
        <span className="text-white font-medium">{formatCurrency(i.amountCents)}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Vencimento",
      render: (i: InstallmentData) => (
        <div>
          <p className="text-slate-300">{formatDate(i.dueDate)}</p>
          {i.daysOverdue > 0 && (
            <p className="text-xs text-red-400">{i.daysOverdue}d atraso</p>
          )}
        </div>
      ),
    },
    {
      key: "paidAt",
      header: "Pagamento",
      render: (i: InstallmentData) => (
        <span className="text-slate-400 text-sm">
          {i.paidAt ? formatDate(i.paidAt) : "-"}
        </span>
      ),
    },
    {
      key: "origin",
      header: "Origem",
      render: (i: InstallmentData) => (
        <span className={`text-xs px-2 py-0.5 rounded ${
          i.origin === "external_capture"
            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
            : "bg-violet-500/10 text-violet-400 border border-violet-500/30"
        }`}>
          {i.origin === "external_capture" ? "Adquirente" : "PL"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (i: InstallmentData) => (
        <StatusBadge status={i.status} type="installment" />
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={installments}
        keyExtractor={(i) => i.id}
        emptyMessage="Nenhuma parcela encontrada"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} parcelas)
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

