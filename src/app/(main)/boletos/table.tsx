"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface InstallmentData {
  id: string;
  installmentNumber: number;
  amountCents: bigint;
  dueDate: Date;
  paidAt: Date | null;
  daysOverdue: number;
  status: string;
  contract: {
    id: string;
    contractNumber: string;
    numberOfInstallments: number;
    endCustomer: {
      name: string;
      document: string;
    };
  };
}

interface BoletosTableProps {
  installments: InstallmentData[];
  pagination: {
    page: number;
    totalPages: number;
  };
  searchParams: {
    status?: string;
  };
}

export function BoletosTable({ installments, pagination, searchParams }: BoletosTableProps) {
  const columns = [
    {
      key: "customer",
      header: "Cliente",
      render: (i: InstallmentData) => (
        <div>
          <p className="text-slate-900 font-medium">{i.contract.endCustomer.name}</p>
          <p className="text-xs text-slate-500">{i.contract.endCustomer.document}</p>
        </div>
      ),
    },
    {
      key: "contract",
      header: "Contrato",
      hideOnMobile: true,
      render: (i: InstallmentData) => (
        <Link
          href={`/contratos/${i.contract.id}`}
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          {i.contract.contractNumber}
        </Link>
      ),
    },
    {
      key: "installment",
      header: "Parcela",
      className: "text-center",
      hideOnMobile: true,
      render: (i: InstallmentData) => (
        <span className="text-slate-600">
          {i.installmentNumber}/{i.contract.numberOfInstallments}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (i: InstallmentData) => (
        <span className="text-slate-900 font-medium">{formatCurrency(i.amountCents)}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Vencimento",
      hideOnMobile: true,
      render: (i: InstallmentData) => (
        <div>
          <p className="text-slate-700">{formatDate(i.dueDate)}</p>
          {i.daysOverdue > 0 && (
            <p className="text-xs text-red-600">{i.daysOverdue} dias de atraso</p>
          )}
        </div>
      ),
    },
    {
      key: "paidAt",
      header: "Pagamento",
      hideOnMobile: true,
      render: (i: InstallmentData) => (
        <span className="text-slate-500">
          {i.paidAt ? formatDate(i.paidAt) : "-"}
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
        emptyMessage="Nenhuma fatura encontrada"
      />

      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={(() => {
                  const params = new URLSearchParams();
                  params.set("page", String(pagination.page - 1));
                  if (searchParams.status) params.set("status", searchParams.status);
                  return `/boletos?${params.toString()}`;
                })()}
                className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={(() => {
                  const params = new URLSearchParams();
                  params.set("page", String(pagination.page + 1));
                  if (searchParams.status) params.set("status", searchParams.status);
                  return `/boletos?${params.toString()}`;
                })()}
                className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
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

