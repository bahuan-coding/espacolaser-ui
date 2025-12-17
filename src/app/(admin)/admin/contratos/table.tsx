"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ContractData {
  id: string;
  contractNumber: string;
  description: string | null;
  totalAmountCents: bigint;
  startDate: Date;
  eligibilityStatus: string;
  merchant: { id: string; name: string };
  endCustomer: { id: string; name: string; document: string };
  paidCount: number;
  lateCount: number;
  totalInstallments: number;
  disbursedAmount: bigint;
}

interface AdminContratosTableProps {
  contracts: ContractData[];
  pagination: {
    page: number;
    total: number;
    totalPages: number;
  };
  buildUrl: (params: Record<string, string | undefined>) => string;
}

export function AdminContratosTable({ contracts, pagination, buildUrl }: AdminContratosTableProps) {
  const columns = [
    {
      key: "contractNumber",
      header: "Contrato",
      render: (c: ContractData) => (
        <div>
          <Link
            href={`/contratos/${c.id}`}
            className="text-violet-400 hover:text-violet-300 font-medium"
          >
            {c.contractNumber}
          </Link>
          <p className="text-xs text-slate-500">{c.description || "Contrato de serviço"}</p>
        </div>
      ),
    },
    {
      key: "merchant",
      header: "Lojista",
      render: (c: ContractData) => (
        <span className="text-slate-300">{c.merchant.name}</span>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (c: ContractData) => (
        <div>
          <p className="text-slate-300">{c.endCustomer.name}</p>
          <p className="text-xs text-slate-500">{c.endCustomer.document}</p>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Valor Total",
      className: "text-right",
      render: (c: ContractData) => (
        <span className="text-white font-medium">{formatCurrency(c.totalAmountCents)}</span>
      ),
    },
    {
      key: "installments",
      header: "Parcelas",
      className: "text-center",
      render: (c: ContractData) => (
        <div>
          <span className="text-slate-300">{c.paidCount}/{c.totalInstallments}</span>
          {c.lateCount > 0 && (
            <span className="text-xs text-red-400 ml-1">({c.lateCount} atraso)</span>
          )}
        </div>
      ),
    },
    {
      key: "disbursed",
      header: "Desembolsado",
      className: "text-right",
      render: (c: ContractData) => (
        <span className={c.disbursedAmount > 0n ? "text-emerald-400" : "text-slate-500"}>
          {c.disbursedAmount > 0n ? formatCurrency(c.disbursedAmount) : "-"}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Início",
      render: (c: ContractData) => (
        <span className="text-slate-400 text-sm">{formatDate(c.startDate)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c: ContractData) => (
        <StatusBadge status={c.eligibilityStatus} type="eligibility" />
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={contracts}
        keyExtractor={(c) => c.id}
        emptyMessage="Nenhum contrato encontrado"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages} ({pagination.total} contratos)
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

