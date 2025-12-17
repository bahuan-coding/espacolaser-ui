export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

async function getTransacoesData(page: number, status?: string) {
  const limit = 20;

  const where = status ? { status } : {};

  const [transactions, total, stats] = await Promise.all([
    prisma.gatewayTransaction.findMany({
      where,
      orderBy: { processedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        merchant: { select: { name: true } },
        contract: {
          select: {
            contractNumber: true,
            endCustomer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.gatewayTransaction.count({ where }),
    prisma.gatewayTransaction.groupBy({
      by: ["status"],
      _count: true,
      _sum: { amountCents: true },
    }),
  ]);

  const statsMap = stats.reduce((acc, s) => {
    acc[s.status] = {
      count: s._count,
      total: s._sum.amountCents ?? 0n,
    };
    return acc;
  }, {} as Record<string, { count: number; total: bigint }>);

  return {
    transactions,
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const statusColors: Record<string, string> = {
  authorized: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  captured: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  settled: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  refunded: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default async function TransacoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getTransacoesData(page, params.status);

  const columns = [
    {
      key: "gatewayTransactionId",
      header: "ID Gateway",
      render: (t: (typeof data.transactions)[0]) => (
        <span className="text-white font-mono text-sm">{t.gatewayTransactionId}</span>
      ),
    },
    {
      key: "merchant",
      header: "Lojista",
      render: (t: (typeof data.transactions)[0]) => (
        <span className="text-slate-300">{t.merchant.name}</span>
      ),
    },
    {
      key: "contract",
      header: "Contrato / Cliente",
      render: (t: (typeof data.transactions)[0]) => (
        <div>
          {t.contract ? (
            <>
              <Link
                href={`/contratos/${t.contract.contractNumber}`}
                className="text-violet-400 hover:text-violet-300 text-sm"
              >
                {t.contract.contractNumber}
              </Link>
              <p className="text-xs text-slate-500">{t.contract.endCustomer.name}</p>
            </>
          ) : (
            <span className="text-slate-500">-</span>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (t: (typeof data.transactions)[0]) => (
        <span className="text-white font-medium">{formatCurrency(t.amountCents)}</span>
      ),
    },
    {
      key: "processedAt",
      header: "Processado",
      render: (t: (typeof data.transactions)[0]) => (
        <span className="text-slate-400 text-sm">{formatDateTime(t.processedAt)}</span>
      ),
    },
    {
      key: "authCode",
      header: "Autorização",
      render: (t: (typeof data.transactions)[0]) => (
        <span className="text-slate-500 font-mono text-xs">
          {t.authorizationCode || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t: (typeof data.transactions)[0]) => (
        <span
          className={`text-xs px-2 py-1 rounded border ${statusColors[t.status] || "bg-slate-700 text-slate-400 border-slate-600"}`}
        >
          {t.status}
        </span>
      ),
    },
  ];

  const statusFilters = [
    { value: "", label: "Todos" },
    { value: "authorized", label: "Autorizado" },
    { value: "captured", label: "Capturado" },
    { value: "settled", label: "Liquidado" },
    { value: "refunded", label: "Estornado" },
    { value: "failed", label: "Falhou" },
  ];

  const settled = data.stats["settled"]?.total ?? 0n;
  const totalCount = data.pagination.total;

  return (
    <PageContainer>
      <PageHeader title="Transações Gateway" subtitle="Histórico de transações do gateway de pagamento" />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Transações"
            value={totalCount.toString()}
          />
          <MetricCard
            label="Liquidadas"
            value={(data.stats["settled"]?.count ?? 0).toString()}
            variant="success"
            description={formatCurrency(settled)}
          />
          <MetricCard
            label="Autorizadas"
            value={(data.stats["authorized"]?.count ?? 0).toString()}
            description="Pendentes captura"
          />
          <MetricCard
            label="Falhas"
            value={(data.stats["failed"]?.count ?? 0).toString()}
            description="Recusadas"
          />
        </div>
      </Section>

      <Section>
        <div className="flex gap-2 mb-4 flex-wrap">
          {statusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={`/admin/transacoes${filter.value ? `?status=${filter.value}` : ""}`}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                params.status === filter.value || (!params.status && filter.value === "")
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
          data={data.transactions}
          keyExtractor={(t) => t.id}
          emptyMessage="Nenhuma transação encontrada"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={`/admin/transacoes?${params.status ? `status=${params.status}&` : ""}page=${data.pagination.page - 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={`/admin/transacoes?${params.status ? `status=${params.status}&` : ""}page=${data.pagination.page + 1}`}
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


