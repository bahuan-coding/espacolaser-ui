export const dynamic = "force-dynamic";

import { Plus } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { AdminFundosTable } from "./table";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

async function getFundosData(page: number) {
  const limit = 15;

  const [funds, total, stats] = await Promise.all([
    prisma.fund.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { escrowAccounts: true, disbursements: true } },
        disbursements: {
          where: { status: "posted" },
          select: { totalAmountCents: true },
        },
        repayments: {
          select: { amountCents: true },
        },
      },
    }),
    prisma.fund.count(),
    prisma.fundDisbursement.aggregate({
      where: { status: "posted" },
      _sum: { totalAmountCents: true },
    }),
  ]);

  const totalRepaid = await prisma.fundRepayment.aggregate({
    _sum: { amountCents: true },
  });

  return {
    funds: funds.map((f) => ({
      id: f.id,
      name: f.name,
      document: f.document,
      adminName: f.adminName,
      managerName: f.managerName,
      isActive: f.isActive,
      _count: f._count,
      totalDisbursed: f.disbursements.reduce((sum, d) => sum + d.totalAmountCents, 0n),
      totalRepaid: f.repayments.reduce((sum, r) => sum + r.amountCents, 0n),
    })),
    globalStats: {
      totalDisbursed: stats._sum.totalAmountCents ?? 0n,
      totalRepaid: totalRepaid._sum.amountCents ?? 0n,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function FundosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getFundosData(page);

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Fundos FIDC"
          subtitle="Gestão de fundos e parâmetros"
        />
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-sm hover:bg-violet-500/30 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Fundo
        </button>
      </div>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Fundos"
            value={data.pagination.total.toString()}
          />
          <MetricCard
            label="Total Desembolsado"
            value={formatCurrency(data.globalStats.totalDisbursed)}
            variant="success"
          />
          <MetricCard
            label="Total Repago"
            value={formatCurrency(data.globalStats.totalRepaid)}
            variant="info"
          />
        </div>
      </Section>

      <Section>
        <AdminFundosTable
          funds={data.funds}
          pagination={{
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
          }}
        />
      </Section>
    </PageContainer>
  );
}
