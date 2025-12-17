export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ExtratoFilters } from "./filters";
import { ExtratoTable } from "./table";

interface PageProps {
  searchParams: Promise<{ 
    page?: string; 
    type?: string; 
    startDate?: string; 
    endDate?: string;
  }>;
}

async function getExtratoData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 15;

  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  const escrowAccount = await prisma.escrowAccount.findFirst({
    where: { merchantId: merchant.id, isActive: true },
  });

  if (!escrowAccount) return null;

  const where = {
    escrowAccountId: escrowAccount.id,
    ...(params.type && { entryType: params.type as "credit" | "debit" }),
    ...(params.startDate && { createdAt: { gte: new Date(params.startDate) } }),
    ...(params.endDate && { createdAt: { lte: new Date(params.endDate) } }),
  };

  const [entries, total, credits, debits] = await Promise.all([
    prisma.escrowLedgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.escrowLedgerEntry.count({ where }),
    prisma.escrowLedgerEntry.aggregate({
      where: { ...where, entryType: "credit" },
      _sum: { amountCents: true },
    }),
    prisma.escrowLedgerEntry.aggregate({
      where: { ...where, entryType: "debit" },
      _sum: { amountCents: true },
    }),
  ]);

  return {
    entries,
    balance: escrowAccount.balanceCents,
    totalCredits: credits._sum.amountCents ?? 0n,
    totalDebits: debits._sum.amountCents ?? 0n,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default async function ExtratoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getExtratoData(params);

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Extrato Escrow" subtitle="Histórico de movimentações" />
        <Section>
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-slate-400">Conta escrow não encontrada.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Extrato Escrow"
        subtitle="Histórico detalhado de movimentações"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Saldo Atual"
            value={formatCurrency(data.balance)}
          />
          <MetricCard
            label="Total Créditos"
            value={formatCurrency(data.totalCredits)}
            variant="success"
          />
          <MetricCard
            label="Total Débitos"
            value={formatCurrency(data.totalDebits)}
          />
        </div>
      </Section>

      <Section>
        <ExtratoFilters currentType={params.type} />
      </Section>

      <Section>
        <ExtratoTable 
          entries={data.entries} 
          pagination={data.pagination}
        />
      </Section>
    </PageContainer>
  );
}
