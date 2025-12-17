export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { AdminParcelasTable } from "./table";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    origin?: string;
  }>;
}

async function getParcelasData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 25;

  const where = {
    ...(params.status && { status: params.status as any }),
    ...(params.origin && { origin: params.origin as any }),
  };

  const [installments, total, stats] = await Promise.all([
    prisma.contractInstallment.findMany({
      where,
      orderBy: { dueDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contract: {
          include: {
            merchant: { select: { id: true, name: true } },
            endCustomer: { select: { id: true, name: true, document: true } },
          },
        },
      },
    }),
    prisma.contractInstallment.count({ where }),
    prisma.contractInstallment.groupBy({
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
    installments: installments.map((i) => ({
      id: i.id,
      installmentNumber: i.installmentNumber,
      amountCents: Number(i.amountCents),
      dueDate: i.dueDate,
      paidAt: i.paidAt,
      daysOverdue: i.daysOverdue,
      status: i.status,
      origin: i.origin,
      contract: {
        id: i.contract.id,
        contractNumber: i.contract.contractNumber,
        merchant: i.contract.merchant,
        endCustomer: i.contract.endCustomer,
      },
    })),
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const statusFilters = [
  { value: "", label: "Todos" },
  { value: "scheduled", label: "Agendadas" },
  { value: "paid", label: "Pagas" },
  { value: "late", label: "Atrasadas" },
  { value: "defaulted", label: "Inadimplentes" },
  { value: "cancelled", label: "Canceladas" },
];

const originFilters = [
  { value: "", label: "Todas Origens" },
  { value: "private_label", label: "Private Label" },
  { value: "external_capture", label: "Adquirente" },
];

export default async function ParcelasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getParcelasData(params);

  const scheduled = data.stats["scheduled"]?.count ?? 0;
  const paid = data.stats["paid"]?.count ?? 0;
  const late = data.stats["late"]?.count ?? 0;
  const defaulted = data.stats["defaulted"]?.count ?? 0;

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...params, ...newParams };
    const query = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/admin/parcelas${query ? `?${query}` : ""}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Parcelas (Admin)"
        subtitle="Visão global de todas as parcelas do sistema"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Agendadas"
            value={scheduled.toString()}
            description={formatCurrency(data.stats["scheduled"]?.total ?? 0n)}
          />
          <MetricCard
            label="Pagas"
            value={paid.toString()}
            variant="success"
            description={formatCurrency(data.stats["paid"]?.total ?? 0n)}
          />
          <MetricCard
            label="Atrasadas"
            value={late.toString()}
            description={formatCurrency(data.stats["late"]?.total ?? 0n)}
          />
          <MetricCard
            label="Inadimplentes"
            value={defaulted.toString()}
            description={formatCurrency(data.stats["defaulted"]?.total ?? 0n)}
          />
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildUrl({ status: filter.value || undefined, page: undefined })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  params.status === filter.value || (!params.status && filter.value === "")
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          <div className="flex gap-2">
            {originFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildUrl({ origin: filter.value || undefined, page: undefined })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  params.origin === filter.value || (!params.origin && filter.value === "")
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <AdminParcelasTable
          installments={data.installments}
          pagination={{
            page: data.pagination.page,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages,
          }}
          basePath="/admin/parcelas"
          currentParams={params}
        />
      </Section>
    </PageContainer>
  );
}
