export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

async function getDashboardData() {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  const [escrowAccount, disbursements, lateInstallments, recentLedger] =
    await Promise.all([
      prisma.escrowAccount.findFirst({
        where: { merchantId: merchant.id, isActive: true },
        select: { id: true, balanceCents: true },
      }),
      prisma.fundDisbursement.aggregate({
        where: {
          contract: { merchantId: merchant.id },
          status: "posted",
        },
        _sum: {
          totalAmountCents: true,
          merchantAmountCents: true,
          escrowAmountCents: true,
        },
      }),
      prisma.contractInstallment.aggregate({
        where: {
          contract: { merchantId: merchant.id },
          status: { in: ["late", "defaulted"] },
        },
        _count: true,
        _sum: { amountCents: true },
      }),
      prisma.escrowLedgerEntry.findMany({
        where: { escrowAccount: { merchantId: merchant.id } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  return {
    merchant,
    escrowBalance: escrowAccount?.balanceCents ?? 0n,
    disbursements: {
      total: disbursements._sum.totalAmountCents ?? 0n,
      merchant: disbursements._sum.merchantAmountCents ?? 0n,
      escrow: disbursements._sum.escrowAmountCents ?? 0n,
    },
    lateInstallments: {
      count: lateInstallments._count,
      total: lateInstallments._sum.amountCents ?? 0n,
    },
    recentLedger,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard" subtitle="Visão geral da sua operação" />
        <Section>
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-slate-400">Nenhum merchant encontrado.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral - ${data.merchant.name}`}
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Saldo Escrow"
            value={formatCurrency(data.escrowBalance)}
            description="Retido como garantia"
          />
          <MetricCard
            label="Recebido (70%)"
            value={formatCurrency(data.disbursements.merchant)}
            variant="success"
            description="Desembolso loja"
          />
          <MetricCard
            label="Retido (30%)"
            value={formatCurrency(data.disbursements.escrow)}
            variant="info"
            description="Split escrow"
          />
          <MetricCard
            label="Em Atraso"
            value={formatCurrency(data.lateInstallments.total)}
            description={`${data.lateInstallments.count} parcela(s)`}
          />
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContentCard
            title="Total Desembolsado"
            description="Valor total antecipado pelo FIDC"
          >
            <div className="py-4">
              <p className="text-3xl font-bold text-white">
                {formatCurrency(data.disbursements.total)}
              </p>
              <div className="mt-4 flex gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Loja: </span>
                  <span className="text-emerald-400">{formatCurrency(data.disbursements.merchant)}</span>
                </div>
                <div>
                  <span className="text-slate-500">Escrow: </span>
                  <span className="text-cyan-400">{formatCurrency(data.disbursements.escrow)}</span>
                </div>
              </div>
            </div>
          </ContentCard>

          <ContentCard
            title="Últimas Movimentações"
            description="Extrato escrow recente"
          >
            {data.recentLedger.length === 0 ? (
              <p className="text-slate-500 py-4">Nenhuma movimentação</p>
            ) : (
              <div className="divide-y divide-slate-800/50">
                {data.recentLedger.map((entry) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={entry.entryType} type="ledger" />
                      <div>
                        <p className="text-sm text-slate-300">
                          {entry.description || entry.referenceType || "Movimentação"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${
                      entry.entryType === "credit" ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {entry.entryType === "credit" ? "+" : "-"}
                      {formatCurrency(entry.amountCents)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>
        </div>
      </Section>
    </PageContainer>
  );
}
