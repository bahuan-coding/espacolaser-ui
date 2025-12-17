export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
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
      ...f,
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

  const columns = [
    {
      key: "name",
      header: "Fundo",
      render: (f: (typeof data.funds)[0]) => (
        <div>
          <p className="text-white font-medium">{f.name}</p>
          <p className="text-xs text-slate-500">{f.document}</p>
        </div>
      ),
    },
    {
      key: "admin",
      header: "Admin / Gestor",
      render: (f: (typeof data.funds)[0]) => (
        <div>
          <p className="text-slate-300">{f.adminName || "-"}</p>
          <p className="text-xs text-slate-500">{f.managerName || "-"}</p>
        </div>
      ),
    },
    {
      key: "totalDisbursed",
      header: "Desembolsado",
      className: "text-right",
      render: (f: (typeof data.funds)[0]) => (
        <span className="text-emerald-400 font-medium">
          {formatCurrency(f.totalDisbursed)}
        </span>
      ),
    },
    {
      key: "totalRepaid",
      header: "Repago",
      className: "text-right",
      render: (f: (typeof data.funds)[0]) => (
        <span className="text-cyan-400 font-medium">
          {formatCurrency(f.totalRepaid)}
        </span>
      ),
    },
    {
      key: "escrowAccounts",
      header: "Escrows",
      className: "text-center",
      render: (f: (typeof data.funds)[0]) => (
        <span className="text-slate-300">{f._count.escrowAccounts}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (f: (typeof data.funds)[0]) => (
        <StatusBadge
          status={f.isActive ? "paid" : "cancelled"}
          type="installment"
          showLabel={false}
        />
      ),
    },
  ];

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
        <DataTable
          columns={columns}
          data={data.funds}
          keyExtractor={(f) => f.id}
          emptyMessage="Nenhum fundo cadastrado"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={`/admin/fundos?page=${data.pagination.page - 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={`/admin/fundos?page=${data.pagination.page + 1}`}
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
