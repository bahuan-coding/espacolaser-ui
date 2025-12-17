export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { AdminEscrowTable } from "./table";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

async function getEscrowData(page: number) {
  const limit = 15;

  const [accounts, total, stats, drawdownStats] = await Promise.all([
    prisma.escrowAccount.findMany({
      orderBy: { balanceCents: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        merchant: { select: { id: true, name: true, document: true } },
        fund: { select: { id: true, name: true } },
        _count: { select: { ledgerEntries: true, drawdowns: true } },
      },
    }),
    prisma.escrowAccount.count(),
    prisma.escrowAccount.aggregate({
      where: { isActive: true },
      _sum: { balanceCents: true },
      _count: true,
    }),
    prisma.escrowDrawdown.aggregate({
      _sum: { amountCents: true },
      _count: true,
    }),
  ]);

  return {
    accounts: accounts.map((a) => ({
      id: a.id,
      balanceCents: a.balanceCents,
      isActive: a.isActive,
      merchant: a.merchant,
      fund: a.fund,
      _count: a._count,
    })),
    totalBalance: stats._sum.balanceCents ?? 0n,
    accountCount: stats._count,
    totalDrawdowns: drawdownStats._sum.amountCents ?? 0n,
    drawdownCount: drawdownStats._count,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function EscrowPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getEscrowData(page);

  return (
    <PageContainer>
      <PageHeader
        title="Contas Escrow"
        subtitle="Gestão de contas e saldos retidos"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Saldo Total"
            value={formatCurrency(data.totalBalance)}
            variant="success"
          />
          <MetricCard
            label="Contas Ativas"
            value={data.accountCount.toString()}
          />
          <MetricCard
            label="Total Drawdowns"
            value={formatCurrency(data.totalDrawdowns)}
            description={`${data.drawdownCount} operações`}
          />
          <MetricCard
            label="Média por Conta"
            value={formatCurrency(data.accountCount > 0 ? data.totalBalance / BigInt(data.accountCount) : 0n)}
          />
        </div>
      </Section>

      <Section>
        <AdminEscrowTable
          accounts={data.accounts}
          pagination={{
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
          }}
        />
      </Section>
    </PageContainer>
  );
}
