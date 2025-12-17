export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { AdminTransacoesTable } from "./table";

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
            id: true,
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
    transactions: transactions.map((t) => ({
      id: t.id,
      gatewayTransactionId: t.gatewayTransactionId,
      amountCents: t.amountCents,
      status: t.status,
      authorizationCode: t.authorizationCode,
      processedAt: t.processedAt,
      merchant: t.merchant,
      contract: t.contract,
    })),
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function TransacoesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getTransacoesData(page, params.status);

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

        <AdminTransacoesTable
          transactions={data.transactions}
          pagination={{
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
          }}
          searchParams={{
            status: params.status,
          }}
        />
      </Section>
    </PageContainer>
  );
}
