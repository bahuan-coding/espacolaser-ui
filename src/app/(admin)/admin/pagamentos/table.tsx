"use client";

import Link from "next/link";
import { DataTable } from "@/components/shared/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentActions } from "./payment-actions";

interface PaymentData {
  id: string;
  paidAmountCents: bigint;
  paymentDate: Date;
  paymentMethod: string;
  customerName: string | null;
  customerDocument: string | null;
  matchStatus: string;
  createdBy: string | null;
  installment: {
    installmentNumber: number;
    contract: {
      id: string;
      contractNumber: string;
      endCustomer: { name: string };
    };
  } | null;
  returnFile: { fileName: string } | null;
}

interface AdminPagamentosTableProps {
  payments: PaymentData[];
  pagination: {
    page: number;
    totalPages: number;
  };
  buildUrl: (params: Record<string, string | undefined>) => string;
}

const matchStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  auto_matched: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  manual_matched: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  unmatched: "bg-red-500/10 text-red-400 border-red-500/30",
  disputed: "bg-violet-500/10 text-violet-400 border-violet-500/30",
};

const methodLabels: Record<string, string> = {
  boleto: "Boleto",
  pix: "PIX",
  credit_card: "Cartão",
  debit_card: "Débito",
  bank_transfer: "TED",
  escrow_drawdown: "Escrow",
  fallback_charge: "Fallback",
};

export function AdminPagamentosTable({ payments, pagination, buildUrl }: AdminPagamentosTableProps) {
  const columns = [
    {
      key: "payment",
      header: "Pagamento",
      render: (p: PaymentData) => (
        <div>
          <p className="text-white font-medium">{formatCurrency(p.paidAmountCents)}</p>
          <p className="text-xs text-slate-500">
            {formatDate(p.paymentDate)} • {methodLabels[p.paymentMethod] || p.paymentMethod}
          </p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Pagador",
      render: (p: PaymentData) => (
        <div>
          <p className="text-slate-300">{p.customerName || "-"}</p>
          <p className="text-xs text-slate-500">{p.customerDocument || "-"}</p>
        </div>
      ),
    },
    {
      key: "installment",
      header: "Parcela Vinculada",
      render: (p: PaymentData) => {
        if (!p.installment) {
          return <span className="text-slate-500">Não vinculado</span>;
        }
        return (
          <div>
            <Link
              href={`/contratos/${p.installment.contract.id}`}
              className="text-violet-400 hover:text-violet-300"
            >
              {p.installment.contract.contractNumber}
            </Link>
            <p className="text-xs text-slate-500">
              Parcela {p.installment.installmentNumber} • {p.installment.contract.endCustomer.name}
            </p>
          </div>
        );
      },
    },
    {
      key: "source",
      header: "Origem",
      render: (p: PaymentData) => (
        <span className="text-slate-400 text-sm">
          {p.returnFile?.fileName || (p.createdBy ? "Manual" : "-")}
        </span>
      ),
    },
    {
      key: "matchStatus",
      header: "Status",
      render: (p: PaymentData) => (
        <span
          className={`text-xs px-2 py-1 rounded border ${
            matchStatusColors[p.matchStatus] || matchStatusColors.pending
          }`}
        >
          {p.matchStatus.replace("_", " ")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p: PaymentData) => (
        <PaymentActions
          paymentId={p.id}
          matchStatus={p.matchStatus}
          hasInstallment={!!p.installment}
        />
      ),
    },
  ];

  return (
    <div>
      <DataTable
        columns={columns}
        data={payments}
        keyExtractor={(p) => p.id}
        emptyMessage="Nenhum pagamento encontrado"
      />

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Página {pagination.page} de {pagination.totalPages}
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

