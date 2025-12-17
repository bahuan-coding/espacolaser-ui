export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

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
    accounts,
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

  const columns = [
    {
      key: "merchant",
      header: "Lojista",
      render: (a: (typeof data.accounts)[0]) => (
        <div>
          <p className="text-white font-medium">{a.merchant.name}</p>
          <p className="text-xs text-slate-500">{a.merchant.document}</p>
        </div>
      ),
    },
    {
      key: "fund",
      header: "Fundo",
      render: (a: (typeof data.accounts)[0]) => (
        <span className="text-slate-300">{a.fund.name}</span>
      ),
    },
    {
      key: "balanceCents",
      header: "Saldo",
      className: "text-right",
      render: (a: (typeof data.accounts)[0]) => (
        <span className={`font-medium ${a.balanceCents > 0n ? "text-emerald-400" : "text-slate-400"}`}>
          {formatCurrency(a.balanceCents)}
        </span>
      ),
    },
    {
      key: "ledgerEntries",
      header: "Movimentações",
      className: "text-center",
      render: (a: (typeof data.accounts)[0]) => (
        <span className="text-slate-300">{a._count.ledgerEntries}</span>
      ),
    },
    {
      key: "drawdowns",
      header: "Drawdowns",
      className: "text-center",
      render: (a: (typeof data.accounts)[0]) => (
        <span className={a._count.drawdowns > 0 ? "text-red-400" : "text-slate-500"}>
          {a._count.drawdowns}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (a: (typeof data.accounts)[0]) => (
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

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={`/admin/escrow?page=${data.pagination.page - 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={`/admin/escrow?page=${data.pagination.page + 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Próxima
                </Link>
              )}
            </div>
          </div>
        )}
      </Section>
    </PageContainer>
  );
}
