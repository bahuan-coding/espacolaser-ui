export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { ContratosFilters } from "./filters";
import { ContratosTable } from "./table";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    search?: string;
  }>;
}

async function getContratosData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 15;

  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  const where = {
    merchantId: merchant.id,
    ...(params.status && { eligibilityStatus: params.status as any }),
    ...(params.search && {
      OR: [
        { contractNumber: { contains: params.search, mode: "insensitive" as const } },
        { endCustomer: { name: { contains: params.search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [contracts, total, stats] = await Promise.all([
    prisma.serviceContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        endCustomer: { select: { id: true, name: true, document: true } },
        _count: { select: { installments: true } },
        installments: { select: { status: true, amountCents: true } },
      },
    }),
    prisma.serviceContract.count({ where }),
    prisma.serviceContract.groupBy({
      by: ["eligibilityStatus"],
      where: { merchantId: merchant.id },
      _count: true,
      _sum: { totalAmountCents: true },
    }),
  ]);

  const statsMap = stats.reduce((acc, s) => {
    acc[s.eligibilityStatus] = {
      count: s._count,
      total: s._sum.totalAmountCents ?? 0n,
    };
    return acc;
  }, {} as Record<string, { count: number; total: bigint }>);

  return {
    contracts: contracts.map((c) => ({
      ...c,
      paidCount: c.installments.filter((i) => i.status === "paid").length,
      lateCount: c.installments.filter((i) => i.status === "late" || i.status === "defaulted").length,
      totalInstallments: c._count.installments,
    })),
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function ContratosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getContratosData(params);

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Contratos" subtitle="Gestão de contratos e parcelas" />
        <Section>
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-slate-400">Nenhum merchant encontrado.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  const eligible = (data.stats["eligible"]?.count ?? 0) + (data.stats["eligible_late"]?.count ?? 0);
  const disbursed = data.stats["disbursed"]?.count ?? 0;
  const pending = (data.stats["pending_first_installment"]?.count ?? 0) + (data.stats["pending_second_installment"]?.count ?? 0);
  const ineligible = data.stats["ineligible"]?.count ?? 0;

  return (
    <PageContainer>
      <PageHeader
        title="Contratos"
        subtitle="Gestão de contratos e parcelas do Private Label"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Elegíveis"
            value={eligible.toString()}
            variant="success"
            description="Prontos para desembolso"
          />
          <MetricCard
            label="Desembolsados"
            value={disbursed.toString()}
            variant="info"
            description="Já antecipados"
          />
          <MetricCard
            label="Pendentes"
            value={pending.toString()}
            description="Aguardando parcelas"
          />
          <MetricCard
            label="Inelegíveis"
            value={ineligible.toString()}
            description="Bloqueados"
          />
        </div>
      </Section>

      <Section>
        <ContratosFilters currentStatus={params.status} currentSearch={params.search} />
      </Section>

      <Section>
        <ContratosTable
          contracts={data.contracts}
          pagination={data.pagination}
        />
      </Section>
    </PageContainer>
  );
}

