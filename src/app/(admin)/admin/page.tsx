export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

async function getAdminDashboardData() {
  const [
    totalMerchants,
    totalContracts,
    totalFunds,
    escrowStats,
    disbursementStats,
    lateInstallments,
    recentDrawdowns,
    pendingReconciliation,
  ] = await Promise.all([
    prisma.merchant.count({ where: { isActive: true } }),
    prisma.serviceContract.count(),
    prisma.fund.count({ where: { isActive: true } }),
    prisma.escrowAccount.aggregate({
      where: { isActive: true },
      _sum: { balanceCents: true },
      _count: true,
    }),
    prisma.fundDisbursement.aggregate({
      where: { status: "posted" },
      _sum: { totalAmountCents: true, merchantAmountCents: true, escrowAmountCents: true },
      _count: true,
    }),
    prisma.contractInstallment.aggregate({
      where: { status: { in: ["late", "defaulted"] } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.escrowDrawdown.findMany({
      orderBy: { executedAt: "desc" },
      take: 5,
      include: {
        escrowAccount: {
          include: { merchant: { select: { name: true } } },
        },
      },
    }),
    prisma.reconciliationFile.count({ where: { status: "pending" } }),
  ]);

  return {
    merchants: totalMerchants,
    contracts: totalContracts,
    funds: totalFunds,
    escrow: {
      total: escrowStats._sum.balanceCents ?? 0n,
      accounts: escrowStats._count,
    },
    disbursements: {
      total: disbursementStats._sum.totalAmountCents ?? 0n,
      count: disbursementStats._count,
    },
    late: {
      total: lateInstallments._sum.amountCents ?? 0n,
      count: lateInstallments._count,
    },
    recentDrawdowns,
    pendingReconciliation,
  };
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard Administrativo"
        subtitle="Visão geral do sistema Private Label"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Lojistas Ativos"
            value={data.merchants.toString()}
            description={`${data.contracts} contratos`}
          />
          <MetricCard
            label="Total Escrow"
            value={formatCurrency(data.escrow.total)}
            variant="info"
            description={`${data.escrow.accounts} contas`}
          />
          <MetricCard
            label="Desembolsado"
            value={formatCurrency(data.disbursements.total)}
            variant="success"
            description={`${data.disbursements.count} contratos`}
          />
          <MetricCard
            label="Em Atraso"
            value={formatCurrency(data.late.total)}
            description={`${data.late.count} parcelas`}
          />
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContentCard
            title="Drawdowns Recentes"
            description="Saídas de escrow para cobrir inadimplência"
          >
            {data.recentDrawdowns.length === 0 ? (
              <p className="text-slate-500 py-4">Nenhum drawdown</p>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {data.recentDrawdowns.map((dd) => (
                  <div key={dd.id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="text-slate-300">{dd.escrowAccount.merchant.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(dd.executedAt)} • {dd.reason}
                      </p>
                    </div>
                    <p className="text-red-400 font-medium">
                      -{formatCurrency(dd.amountCents)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>

          <ContentCard
            title="Alertas"
            description="Itens que requerem atenção"
          >
            <div className="space-y-3">
              {data.pendingReconciliation > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-3">
                    <StatusBadge status="late" type="installment" />
                    <span className="text-slate-300">Arquivos pendentes de conciliação</span>
                  </div>
                  <span className="text-amber-400 font-medium">{data.pendingReconciliation}</span>
                </div>
              )}
              {data.late.count > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center gap-3">
                    <StatusBadge status="defaulted" type="installment" />
                    <span className="text-slate-300">Parcelas em atraso/inadimplência</span>
                  </div>
                  <span className="text-red-400 font-medium">{data.late.count}</span>
                </div>
              )}
              {data.pendingReconciliation === 0 && data.late.count === 0 && (
                <p className="text-slate-500 py-4 text-center">Nenhum alerta no momento</p>
              )}
            </div>
          </ContentCard>
        </div>
      </Section>
    </PageContainer>
  );
}

