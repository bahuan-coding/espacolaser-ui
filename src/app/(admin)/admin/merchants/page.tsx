export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { AdminMerchantsTable } from "./table";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

async function getMerchantsData(page: number, search?: string) {
  const limit = 15;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { document: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [merchants, total, stats] = await Promise.all([
    prisma.merchant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { serviceContracts: true, users: true } },
        escrowAccounts: {
          where: { isActive: true },
          select: { balanceCents: true },
        },
        serviceContracts: {
          select: { totalAmountCents: true, eligibilityStatus: true },
        },
      },
    }),
    prisma.merchant.count({ where }),
    prisma.merchant.aggregate({
      _count: true,
    }),
  ]);

  const totalVolume = await prisma.serviceContract.aggregate({
    _sum: { totalAmountCents: true },
  });

  return {
    merchants: merchants.map((m) => ({
      id: m.id,
      name: m.name,
      document: m.document,
      email: m.email,
      phone: m.phone,
      createdAt: m.createdAt,
      isActive: m.isActive,
      _count: m._count,
      escrowBalance: m.escrowAccounts.reduce((sum, a) => sum + a.balanceCents, 0n),
      totalContractValue: m.serviceContracts.reduce((sum, c) => sum + c.totalAmountCents, 0n),
      disbursedCount: m.serviceContracts.filter((c) => c.eligibilityStatus === "disbursed").length,
    })),
    globalStats: {
      totalMerchants: stats._count,
      totalVolume: totalVolume._sum.totalAmountCents ?? 0n,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function MerchantsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getMerchantsData(page, params.search);

  return (
    <PageContainer>
      <PageHeader
        title="Lojistas"
        subtitle="Gestão de merchants cadastrados"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Lojistas"
            value={data.globalStats.totalMerchants.toString()}
          />
          <MetricCard
            label="Volume Total"
            value={formatCurrency(data.globalStats.totalVolume)}
            variant="success"
          />
          <MetricCard
            label="Exibindo"
            value={data.merchants.length.toString()}
            description={`de ${data.pagination.total}`}
          />
        </div>
      </Section>

      <Section>
        <form className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Buscar por nome, CNPJ ou email..."
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg hover:bg-violet-500/30 transition-colors"
            >
              Buscar
            </button>
          </div>
        </form>

        <AdminMerchantsTable
          merchants={data.merchants}
          pagination={{
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
          }}
          searchParams={{
            search: params.search,
          }}
        />
      </Section>
    </PageContainer>
  );
}
