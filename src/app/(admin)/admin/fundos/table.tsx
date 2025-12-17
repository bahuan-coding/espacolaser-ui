"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatCurrency } from "@/lib/utils";

interface FundData {
  id: string;
  name: string;
  document: string;
  adminName: string | null;
  managerName: string | null;
  isActive: boolean;
  _count: { escrowAccounts: number; disbursements: number };
  totalDisbursed: bigint;
  totalRepaid: bigint;
}

interface AdminFundosTableProps {
  funds: FundData[];
  pagination: {
    page: number;
    totalPages: number;
  };
}

export function AdminFundosTable({ funds, pagination }: AdminFundosTableProps) {
  const columns = [
    {
      key: "name",
      header: "Fundo",
      render: (f: FundData) => (
        <div>
          <p className="text-white font-medium">{f.name}</p>
          <p className="text-xs text-slate-500">{f.document}</p>
        </div>
      ),
    },
    {
      key: "admin",
      header: "Admin / Gestor",
      render: (f: FundData) => (
        <div>
          <p className="text-slate-300">{f.adminName || "-"}</p>
          <p className="text-xs text-slate-500">{f.managerName || "-"}</p>
        </div>
      ),
    },
    {
      key: "totalDisbursed",
      header: "Desembolsado",
      className: "text-right",
      render: (f: FundData) => (
        <span className="text-emerald-400 font-medium">
          {formatCurrency(f.totalDisbursed)}
        </span>
      ),
    },
    {
      key: "totalRepaid",
      header: "Repago",
      className: "text-right",
      render: (f: FundData) => (
        <span className="text-cyan-400 font-medium">
          {formatCurrency(f.totalRepaid)}
        </span>
      ),
    },
    {
      key: "escrowAccounts",
      header: "Escrows",
      className: "text-center",
      render: (f: FundData) => (
        <span className="text-slate-300">{f._count.escrowAccounts}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (f: FundData) => (
        <StatusBadge
          status={f.isActive ? "paid" : "cancelled"}
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
        data={funds}
        keyExtractor={(f) => f.id}
        emptyMessage="Nenhum fundo cadastrado"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            {pagination.page > 1 && (
              <Link
                href={`/admin/fundos?page=${pagination.page - 1}`}
                className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
              >
                Anterior
              </Link>
            )}
            {pagination.page < pagination.totalPages && (
              <Link
                href={`/admin/fundos?page=${pagination.page + 1}`}
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

