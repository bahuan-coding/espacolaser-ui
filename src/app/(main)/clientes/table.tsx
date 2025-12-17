"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/shared/ui/data-table";
import { formatCurrency } from "@/lib/utils";

interface CustomerData {
  id: string;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  hasLateInstallment: boolean;
  totalContracts: number;
  totalValue: bigint;
  hasPlCard: boolean;
  contracts: Array<{ id: string; contractNumber: string }>;
}

interface ClientesTableProps {
  customers: CustomerData[];
  pagination: {
    page: number;
    totalPages: number;
  };
  searchParams: {
    search?: string;
    status?: string;
  };
}

export function ClientesTable({ customers, pagination, searchParams }: ClientesTableProps) {
  const router = useRouter();

  const columns = [
    {
      key: "name",
      header: "Cliente",
      render: (c: CustomerData) => (
        <div>
          <p className="text-slate-900 font-medium">{c.name}</p>
          <p className="text-xs text-slate-500 font-mono">{c.document}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      hideOnMobile: true,
      render: (c: CustomerData) => (
        <div>
          {c.email && <p className="text-sm text-slate-600">{c.email}</p>}
          {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
          {!c.email && !c.phone && <span className="text-slate-400">-</span>}
        </div>
      ),
    },
    {
      key: "contracts",
      header: "Contratos",
      className: "text-center",
      render: (c: CustomerData) => (
        <span className="text-slate-700">{c.totalContracts}</span>
      ),
    },
    {
      key: "totalValue",
      header: "Valor Total",
      hideOnMobile: true,
      className: "text-right",
      render: (c: CustomerData) => (
        <span className="text-slate-900 font-medium">{formatCurrency(c.totalValue)}</span>
      ),
    },
    {
      key: "plCard",
      header: "Cartão PL",
      hideOnMobile: true,
      render: (c: CustomerData) => (
        c.hasPlCard ? (
          <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            Ativo
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c: CustomerData) => (
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
            c.hasLateInstallment
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {c.hasLateInstallment ? "Atraso" : "Em dia"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (c: CustomerData) => (
        <div className="flex gap-2 justify-end">
          {c.contracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/contratos/${contract.id}`}
              className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
              title={`Ver contrato ${contract.contractNumber}`}
            >
              {contract.contractNumber.slice(-6)}
            </Link>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={customers}
        keyExtractor={(c) => c.id}
        emptyMessage="Nenhum cliente encontrado"
      />

      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/clientes?page=${pagination.page - 1}${searchParams.search ? `&search=${searchParams.search}` : ""}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
                className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/clientes?page=${pagination.page + 1}${searchParams.search ? `&search=${searchParams.search}` : ""}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
                className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
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

