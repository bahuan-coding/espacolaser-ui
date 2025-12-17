export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { AdminClientesTable } from "./table";

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

async function getClientesData(page: number, search?: string) {
  const limit = 20;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { document: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [customers, total, stats] = await Promise.all([
    prisma.endCustomer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contracts: {
          select: {
            id: true,
            totalAmountCents: true,
            eligibilityStatus: true,
          },
        },
        tokenizedCards: {
          where: { isActive: true },
          select: { id: true, tokenizationStatus: true, brand: true, lastFourDigits: true },
        },
        plCards: {
          where: { isActive: true },
          select: { id: true, issuanceStatus: true, lastFourDigits: true },
        },
      },
    }),
    prisma.endCustomer.count({ where }),
    prisma.$transaction([
      prisma.endCustomer.count(),
      prisma.serviceContract.count(),
      prisma.tokenizedCard.count({ where: { tokenizationStatus: "success" } }),
      prisma.privateLabelCard.count({ where: { issuanceStatus: "issued" } }),
    ]),
  ]);

  return {
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      document: c.document,
      email: c.email,
      phone: c.phone,
      createdAt: c.createdAt,
      totalContracts: c.contracts.length,
      totalValue: c.contracts.reduce((sum, ct) => sum + ct.totalAmountCents, 0n),
      activeContracts: c.contracts.filter(
        (ct) => ct.eligibilityStatus === "disbursed" || ct.eligibilityStatus === "eligible"
      ).length,
      tokenizedCards: c.tokenizedCards,
      plCards: c.plCards,
    })),
    stats: {
      totalCustomers: stats[0],
      totalContracts: stats[1],
      tokenizedCards: stats[2],
      plCards: stats[3],
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getClientesData(page, params.search);

  return (
    <PageContainer>
      <PageHeader title="Clientes Finais" subtitle="Gestão de clientes (EndCustomer)" />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="Total Clientes" value={data.stats.totalCustomers.toString()} />
          <MetricCard
            label="Contratos"
            value={data.stats.totalContracts.toString()}
            variant="info"
          />
          <MetricCard
            label="Cartões Tokenizados"
            value={data.stats.tokenizedCards.toString()}
            variant="success"
          />
          <MetricCard label="Cartões PL" value={data.stats.plCards.toString()} />
        </div>
      </Section>

      <Section>
        <form className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Buscar por nome, CPF ou email..."
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

        <AdminClientesTable
          customers={data.customers}
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
