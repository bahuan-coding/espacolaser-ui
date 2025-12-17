export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { AdminPagamentosTable } from "./table";

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
    payments: payments.map((p) => ({
      id: p.id,
      paidAmountCents: Number(p.paidAmountCents),
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      customerName: p.customerName,
      customerDocument: p.customerDocument,
      matchStatus: p.matchStatus,
      createdBy: p.createdBy,
      installment: p.installment
        ? {
            installmentNumber: p.installment.installmentNumber,
            contract: {
              id: p.installment.contract.id,
              contractNumber: p.installment.contract.contractNumber,
              endCustomer: { name: p.installment.contract.endCustomer.name },
            },
          }
        : null,
      returnFile: p.returnFile,
    })),
    stats: statsMap,
    pagination: { page: params.page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

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

        <AdminPagamentosTable
          payments={data.payments}
          pagination={{
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
          }}
          buildUrl={buildUrl}
        />
      </Section>
    </PageContainer>
  );
}
