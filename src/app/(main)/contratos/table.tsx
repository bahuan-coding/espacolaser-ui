"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable, Pagination } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ServiceContract, EndCustomer } from "@/generated/prisma";

type ContractWithRelations = ServiceContract & {
  endCustomer: Pick<EndCustomer, "id" | "name" | "document">;
  paidCount: number;
  lateCount: number;
  totalInstallments: number;
};

interface ContratosTableProps {
  contracts: ContractWithRelations[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ContratosTable({ contracts, pagination }: ContratosTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/contratos?${params.toString()}`);
  };

  const handleRowClick = (contract: ContractWithRelations) => {
    router.push(`/contratos/${contract.id}`);
  };

  const columns = [
    {
      key: "contractNumber",
      header: "Contrato",
      render: (c: ContractWithRelations) => (
        <div>
          <p className="text-white font-medium">{c.contractNumber}</p>
          <p className="text-xs text-slate-500">{formatDate(c.startDate)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (c: ContractWithRelations) => (
        <div>
          <p className="text-slate-300">{c.endCustomer.name}</p>
          <p className="text-xs text-slate-500">{c.endCustomer.document}</p>
        </div>
      ),
    },
    {
      key: "totalAmountCents",
      header: "Valor Total",
      className: "text-right",
      render: (c: ContractWithRelations) => (
        <span className="text-slate-300 font-medium">
          {formatCurrency(c.totalAmountCents)}
        </span>
      ),
    },
    {
      key: "installments",
      header: "Parcelas",
      render: (c: ContractWithRelations) => (
        <div className="flex items-center gap-2">
          <span className="text-slate-300">
            {c.paidCount}/{c.totalInstallments}
          </span>
          {c.lateCount > 0 && (
            <span className="text-xs text-red-400">({c.lateCount} atraso)</span>
          )}
        </div>
      ),
    },
    {
      key: "eligibilityStatus",
      header: "Status",
      render: (c: ContractWithRelations) => (
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
        onRowClick={handleRowClick}
        emptyMessage="Nenhum contrato encontrado"
      />
      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}

