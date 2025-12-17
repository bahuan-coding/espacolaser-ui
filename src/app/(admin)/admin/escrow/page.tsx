export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

async function getEscrowData() {
  const [accounts, stats] = await Promise.all([
    prisma.escrowAccount.findMany({
      orderBy: { balanceCents: "desc" },
      include: {
        merchant: { select: { id: true, name: true, document: true } },
        fund: { select: { id: true, name: true } },
        _count: { select: { ledgerEntries: true, drawdowns: true } },
      },
    }),
    prisma.escrowAccount.aggregate({
      where: { isActive: true },
      _sum: { balanceCents: true },
      _count: true,
    }),
  ]);

  const totalDrawdowns = await prisma.escrowDrawdown.aggregate({
    _sum: { amountCents: true },
    _count: true,
  });

  return {
    accounts,
    totalBalance: stats._sum.balanceCents ?? 0n,
    accountCount: stats._count,
    totalDrawdowns: totalDrawdowns._sum.amountCents ?? 0n,
    drawdownCount: totalDrawdowns._count,
  };
}

export default async function EscrowPage() {
  const data = await getEscrowData();

  const columns = [
    {
      key: "merchant",
      header: "Lojista",
      render: (a: typeof data.accounts[0]) => (
        <div>
          <p className="text-white font-medium">{a.merchant.name}</p>
          <p className="text-xs text-slate-500">{a.merchant.document}</p>
        </div>
      ),
    },
    {
      key: "fund",
      header: "Fundo",
      render: (a: typeof data.accounts[0]) => (
        <span className="text-slate-300">{a.fund.name}</span>
      ),
    },
    {
      key: "balanceCents",
      header: "Saldo",
      className: "text-right",
      render: (a: typeof data.accounts[0]) => (
        <span className={`font-medium ${a.balanceCents > 0n ? "text-emerald-400" : "text-slate-400"}`}>
          {formatCurrency(a.balanceCents)}
        </span>
      ),
    },
    {
      key: "ledgerEntries",
      header: "Movimentações",
      className: "text-center",
      render: (a: typeof data.accounts[0]) => (
        <span className="text-slate-300">{a._count.ledgerEntries}</span>
      ),
    },
    {
      key: "drawdowns",
      header: "Drawdowns",
      className: "text-center",
      render: (a: typeof data.accounts[0]) => (
        <span className={a._count.drawdowns > 0 ? "text-red-400" : "text-slate-500"}>
          {a._count.drawdowns}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (a: typeof data.accounts[0]) => (
        <StatusBadge
          status={a.isActive ? "paid" : "cancelled"}
          type="installment"
          showLabel={false}
        />
      ),
    },
  ];

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
        <DataTable
          columns={columns}
          data={data.accounts}
          keyExtractor={(a) => a.id}
          emptyMessage="Nenhuma conta escrow encontrada"
        />
      </Section>
    </PageContainer>
  );
}

