export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { BoletosTable } from "./table";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
  }>;
}

async function getBoletosData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 20;

  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  const where = {
    contract: { merchantId: merchant.id },
    origin: "private_label" as const,
    ...(params.status && { status: params.status as any }),
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
            endCustomer: { select: { name: true, document: true } },
          },
        },
      },
    }),
    prisma.contractInstallment.count({ where }),
    prisma.contractInstallment.groupBy({
      by: ["status"],
      where: { contract: { merchantId: merchant.id }, origin: "private_label" },
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
      amountCents: i.amountCents,
      dueDate: i.dueDate,
      paidAt: i.paidAt,
      daysOverdue: i.daysOverdue,
      status: i.status,
      contract: {
        id: i.contract.id,
        contractNumber: i.contract.contractNumber,
        numberOfInstallments: i.contract.numberOfInstallments,
        endCustomer: {
          name: i.contract.endCustomer.name,
          document: i.contract.endCustomer.document,
        },
      },
    })),
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function BoletosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getBoletosData(params);

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Boletos / Faturas" subtitle="Acompanhamento de cobranças" />
        <Section>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <p className="text-slate-500">Nenhum merchant encontrado.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  const scheduled = data.stats["scheduled"]?.count ?? 0;
  const paid = data.stats["paid"]?.count ?? 0;
  const late = data.stats["late"]?.count ?? 0;
  const defaulted = data.stats["defaulted"]?.count ?? 0;

  const statusFilters = [
    { value: "", label: "Todos" },
    { value: "scheduled", label: "Agendados" },
    { value: "paid", label: "Pagos" },
    { value: "late", label: "Atrasados" },
    { value: "defaulted", label: "Inadimplentes" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Boletos / Faturas"
        subtitle="Acompanhamento de parcelas do Private Label"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Agendados"
            value={scheduled.toString()}
            description={formatCurrency(data.stats["scheduled"]?.total ?? 0n)}
          />
          <MetricCard
            label="Pagos"
            value={paid.toString()}
            variant="success"
            description={formatCurrency(data.stats["paid"]?.total ?? 0n)}
          />
          <MetricCard
            label="Atrasados"
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
        <div className="flex flex-wrap gap-2 mb-4">
          {statusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={`/boletos${filter.value ? `?status=${filter.value}` : ""}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                params.status === filter.value || (!params.status && filter.value === "")
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <BoletosTable
          installments={data.installments}
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
