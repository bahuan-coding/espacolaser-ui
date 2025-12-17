"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerData {
  id: string;
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  createdAt: Date;
  totalContracts: number;
  totalValue: bigint;
  activeContracts: number;
  tokenizedCards: Array<{ id: string; tokenizationStatus: string; brand: string; lastFourDigits: string }>;
  plCards: Array<{ id: string; issuanceStatus: string; lastFourDigits: string }>;
}

interface AdminClientesTableProps {
  customers: CustomerData[];
  pagination: {
    page: number;
    totalPages: number;
  };
  searchParams: {
    search?: string;
  };
}

export function AdminClientesTable({ customers, pagination, searchParams }: AdminClientesTableProps) {
  const columns = [
    {
      key: "name",
      header: "Cliente",
      render: (c: CustomerData) => (
        <div>
          <p className="text-white font-medium">{c.name}</p>
          <p className="text-xs text-slate-500">{c.document}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (c: CustomerData) => (
        <div>
          <p className="text-slate-300">{c.email || "-"}</p>
          <p className="text-xs text-slate-500">{c.phone || "-"}</p>
        </div>
      ),
    },
    {
      key: "contracts",
      header: "Contratos",
      className: "text-center",
      render: (c: CustomerData) => (
        <div>
          <p className="text-slate-300">{c.totalContracts}</p>
          <p className="text-xs text-slate-500">{c.activeContracts} ativos</p>
        </div>
      ),
    },
    {
      key: "totalValue",
      header: "Volume",
      className: "text-right",
      render: (c: CustomerData) => (
        <span className="text-slate-300">{formatCurrency(c.totalValue)}</span>
      ),
    },
    {
      key: "cards",
      header: "Cartões",
      render: (c: CustomerData) => (
        <div className="flex gap-2">
          {c.tokenizedCards.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
              {c.tokenizedCards.length} Token
            </span>
          )}
          {c.plCards.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded">
              {c.plCards.length} PL
            </span>
          )}
          {c.tokenizedCards.length === 0 && c.plCards.length === 0 && (
            <span className="text-slate-500 text-xs">-</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Cadastro",
      render: (c: CustomerData) => (
        <span className="text-slate-500 text-sm">{formatDate(c.createdAt)}</span>
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
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/admin/clientes?${searchParams.search ? `search=${searchParams.search}&` : ""}page=${pagination.page - 1}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/admin/clientes?${searchParams.search ? `search=${searchParams.search}&` : ""}page=${pagination.page + 1}`}
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

