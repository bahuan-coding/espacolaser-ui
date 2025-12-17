export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    merchant?: string;
  }>;
}

async function getLedgerData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 25;

  const where = {
    ...(params.type && { entryType: params.type as "credit" | "debit" }),
    ...(params.merchant && { escrowAccount: { merchantId: params.merchant } }),
  };

  const [entries, total, credits, debits, merchants] = await Promise.all([
    prisma.escrowLedgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        escrowAccount: {
          include: {
            merchant: { select: { id: true, name: true } },
            fund: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.escrowLedgerEntry.count({ where }),
    prisma.escrowLedgerEntry.aggregate({
      where: { ...where, entryType: "credit" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.escrowLedgerEntry.aggregate({
      where: { ...where, entryType: "debit" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.merchant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    entries,
    stats: {
      totalCredits: credits._sum.amountCents ?? 0n,
      creditCount: credits._count,
      totalDebits: debits._sum.amountCents ?? 0n,
      debitCount: debits._count,
    },
    merchants,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const typeFilters = [
  { value: "", label: "Todos" },
  { value: "credit", label: "Créditos" },
  { value: "debit", label: "Débitos" },
];

export default async function LedgerPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getLedgerData(params);

  const columns = [
    {
      key: "createdAt",
      header: "Data",
      render: (e: (typeof data.entries)[0]) => (
        <span className="text-slate-300">{formatDateTime(e.createdAt)}</span>
      ),
    },
    {
      key: "merchant",
      header: "Lojista",
      render: (e: (typeof data.entries)[0]) => (
        <div>
          <p className="text-white font-medium">{e.escrowAccount.merchant.name}</p>
          <p className="text-xs text-slate-500">{e.escrowAccount.fund.name}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (e: (typeof data.entries)[0]) => (
        <StatusBadge status={e.entryType} type="ledger" />
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (e: (typeof data.entries)[0]) => (
        <span className={`font-medium ${
          e.entryType === "credit" ? "text-emerald-400" : "text-red-400"
        }`}>
          {e.entryType === "credit" ? "+" : "-"}{formatCurrency(e.amountCents)}
        </span>
      ),
    },
    {
      key: "balanceAfter",
      header: "Saldo Após",
      className: "text-right",
      render: (e: (typeof data.entries)[0]) => (
        <span className="text-slate-300">{formatCurrency(e.balanceAfterCents)}</span>
      ),
    },
    {
      key: "description",
      header: "Descrição",
      render: (e: (typeof data.entries)[0]) => (
        <span className="text-slate-400 text-sm">
          {e.description || e.referenceType || "-"}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Referência",
      render: (e: (typeof data.entries)[0]) => (
        <span className="text-xs text-slate-500 font-mono">
          {e.referenceId ? `${e.referenceType}: ${e.referenceId.slice(0, 8)}...` : "-"}
        </span>
      ),
    },
  ];

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...params, ...newParams };
    const query = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/admin/ledger${query ? `?${query}` : ""}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Ledger Escrow (Admin)"
        subtitle="Histórico global de movimentações escrow"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Movimentações"
            value={data.pagination.total.toString()}
          />
          <MetricCard
            label="Total Créditos"
            value={formatCurrency(data.stats.totalCredits)}
            variant="success"
            description={`${data.stats.creditCount} lançamentos`}
          />
          <MetricCard
            label="Total Débitos"
            value={formatCurrency(data.stats.totalDebits)}
            description={`${data.stats.debitCount} lançamentos`}
          />
          <MetricCard
            label="Saldo Líquido"
            value={formatCurrency(data.stats.totalCredits - data.stats.totalDebits)}
            variant="info"
          />
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Type Filters */}
          <div className="flex gap-2">
            {typeFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildUrl({ type: filter.value || undefined, page: undefined })}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  params.type === filter.value || (!params.type && filter.value === "")
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          {/* Merchant Filter */}
          <select
            defaultValue={params.merchant || ""}
            onChange={(e) => {
              window.location.href = buildUrl({ merchant: e.target.value || undefined, page: undefined });
            }}
            className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 focus:outline-none focus:border-violet-500"
          >
            <option value="">Todos os Lojistas</option>
            {data.merchants.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <DataTable
          columns={columns}
          data={data.entries}
          keyExtractor={(e) => e.id}
          emptyMessage="Nenhuma movimentação encontrada"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages} ({data.pagination.total} movimentações)
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={buildUrl({ page: String(data.pagination.page - 1) })}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={buildUrl({ page: String(data.pagination.page + 1) })}
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

