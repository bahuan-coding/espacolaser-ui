export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PaymentActions } from "./payment-actions";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    matchStatus?: string;
    paymentMethod?: string;
  }>;
}

async function getPagamentosData(params: {
  page: number;
  matchStatus?: string;
  paymentMethod?: string;
}) {
  const limit = 25;
  const where: any = {};
  if (params.matchStatus) where.matchStatus = params.matchStatus;
  if (params.paymentMethod) where.paymentMethod = params.paymentMethod;

  const [payments, total, stats] = await Promise.all([
    prisma.paymentEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * limit,
      take: limit,
      include: {
        installment: {
          include: {
            contract: {
              include: {
                endCustomer: { select: { name: true, document: true } },
                merchant: { select: { name: true } },
              },
            },
          },
        },
        returnFile: { select: { fileName: true } },
      },
    }),
    prisma.paymentEvent.count({ where }),
    prisma.paymentEvent.groupBy({
      by: ["matchStatus"],
      _count: true,
      _sum: { paidAmountCents: true },
    }),
  ]);

  const statsMap = stats.reduce(
    (acc, s) => {
      acc[s.matchStatus] = {
        count: s._count,
        total: s._sum.paidAmountCents ?? BigInt(0),
      };
      return acc;
    },
    {} as Record<string, { count: number; total: bigint }>
  );

  return {
    payments,
    stats: statsMap,
    pagination: { page: params.page, limit, total, totalPages: Math.ceil(total / limit) },
  };
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

const matchStatusFilters = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendentes" },
  { value: "auto_matched", label: "Auto" },
  { value: "manual_matched", label: "Manual" },
  { value: "unmatched", label: "Não Vinculados" },
];

export default async function PagamentosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getPagamentosData({
    page,
    matchStatus: params.matchStatus,
    paymentMethod: params.paymentMethod,
  });

  const pendingCount = data.stats["pending"]?.count ?? 0;
  const autoMatchedCount = data.stats["auto_matched"]?.count ?? 0;
  const manualMatchedCount = data.stats["manual_matched"]?.count ?? 0;
  const totalMatched = autoMatchedCount + manualMatchedCount;

  const columns = [
    {
      key: "payment",
      header: "Pagamento",
      render: (p: (typeof data.payments)[0]) => (
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
      render: (p: (typeof data.payments)[0]) => (
        <div>
          <p className="text-slate-300">{p.customerName || "-"}</p>
          <p className="text-xs text-slate-500">{p.customerDocument || "-"}</p>
        </div>
      ),
    },
    {
      key: "installment",
      header: "Parcela Vinculada",
      render: (p: (typeof data.payments)[0]) => {
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
      render: (p: (typeof data.payments)[0]) => (
        <span className="text-slate-400 text-sm">
          {p.returnFile?.fileName || (p.createdBy ? "Manual" : "-")}
        </span>
      ),
    },
    {
      key: "matchStatus",
      header: "Status",
      render: (p: (typeof data.payments)[0]) => (
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
      render: (p: (typeof data.payments)[0]) => (
        <PaymentActions
          paymentId={p.id}
          matchStatus={p.matchStatus}
          hasInstallment={!!p.installment}
        />
      ),
    },
  ];

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...params, ...newParams };
    const query = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/admin/pagamentos${query ? `?${query}` : ""}`;
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Pagamentos"
          subtitle="Eventos de pagamento de arquivos e manuais"
        />
        <Link
          href="/admin/baixas"
          className="px-4 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 transition-colors"
        >
          Nova Baixa Manual
        </Link>
      </div>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total"
            value={data.pagination.total.toString()}
            description="Pagamentos"
          />
          <MetricCard
            label="Vinculados"
            value={totalMatched.toString()}
            variant="success"
            description={`${autoMatchedCount} auto + ${manualMatchedCount} manual`}
          />
          <MetricCard
            label="Pendentes"
            value={pendingCount.toString()}
            description="Aguardando vinculação"
          />
          <MetricCard
            label="Não Vinculados"
            value={(data.stats["unmatched"]?.count ?? 0).toString()}
            description="Requerem atenção"
          />
        </div>
      </Section>

      <Section>
        <div className="flex gap-2 mb-4 flex-wrap">
          {matchStatusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildUrl({ matchStatus: filter.value || undefined, page: undefined })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                params.matchStatus === filter.value || (!params.matchStatus && filter.value === "")
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={data.payments}
          keyExtractor={(p) => p.id}
          emptyMessage="Nenhum pagamento encontrado"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={buildUrl({ page: String(data.pagination.page - 1) })}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={buildUrl({ page: String(data.pagination.page + 1) })}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </Section>
    </PageContainer>
  );
}

