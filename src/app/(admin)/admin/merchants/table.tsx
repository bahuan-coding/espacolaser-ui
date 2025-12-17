"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MerchantData {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string | null;
  createdAt: Date;
  isActive: boolean;
  _count: { serviceContracts: number; users: number };
  escrowBalance: bigint;
  totalContractValue: bigint;
  disbursedCount: number;
}

interface AdminMerchantsTableProps {
  merchants: MerchantData[];
  pagination: {
    page: number;
    totalPages: number;
  };
  searchParams: {
    search?: string;
  };
}

export function AdminMerchantsTable({ merchants, pagination, searchParams }: AdminMerchantsTableProps) {
  const columns = [
    {
      key: "name",
      header: "Lojista",
      render: (m: MerchantData) => (
        <div>
          <p className="text-white font-medium">{m.name}</p>
          <p className="text-xs text-slate-500">{m.document}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (m: MerchantData) => (
        <div>
          <p className="text-slate-300">{m.email}</p>
          <p className="text-xs text-slate-500">{m.phone || "-"}</p>
        </div>
      ),
    },
    {
      key: "contracts",
      header: "Contratos",
      className: "text-center",
      render: (m: MerchantData) => (
        <div>
          <p className="text-slate-300">{m._count.serviceContracts}</p>
          <p className="text-xs text-slate-500">{m.disbursedCount} antecipados</p>
        </div>
      ),
    },
    {
      key: "escrowBalance",
      header: "Saldo Escrow",
      className: "text-right",
      render: (m: MerchantData) => (
        <span className={`font-medium ${m.escrowBalance > 0n ? "text-emerald-400" : "text-slate-400"}`}>
          {formatCurrency(m.escrowBalance)}
        </span>
      ),
    },
    {
      key: "totalContractValue",
      header: "Volume",
      className: "text-right",
      render: (m: MerchantData) => (
        <span className="text-slate-300">
          {formatCurrency(m.totalContractValue)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (m: MerchantData) => (
        <StatusBadge
          status={m.isActive ? "paid" : "cancelled"}
          type="installment"
          showLabel={false}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Cadastro",
      render: (m: MerchantData) => (
        <span className="text-slate-500 text-sm">{formatDate(m.createdAt)}</span>
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={merchants}
        keyExtractor={(m) => m.id}
        emptyMessage="Nenhum lojista cadastrado"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/admin/merchants?${searchParams.search ? `search=${searchParams.search}&` : ""}page=${pagination.page - 1}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/admin/merchants?${searchParams.search ? `search=${searchParams.search}&` : ""}page=${pagination.page + 1}`}
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

