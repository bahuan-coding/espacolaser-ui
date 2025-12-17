export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { AdminDrawdownsTable } from "./table";

interface PageProps {
  searchParams: Promise<{ page?: string; reason?: string }>;
}

const reasonLabels: Record<string, string> = {
  late_payment: "Atraso",
  default_coverage: "Inadimplência",
  fee_charge: "Taxa",
  manual_adjustment: "Ajuste Manual",
};

async function getDrawdownsData(page: number, reason?: string) {
  const limit = 15;

  const where = reason ? { reason: reason as any } : {};

  const [drawdowns, total, stats, chargeAttempts] = await Promise.all([
    prisma.escrowDrawdown.findMany({
      where,
      orderBy: { executedAt: "desc" },
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
    prisma.escrowDrawdown.count({ where }),
    prisma.escrowDrawdown.groupBy({
      by: ["reason"],
      _count: true,
      _sum: { amountCents: true },
    }),
    prisma.tokenizedCardCharge.findMany({
      where: { status: { in: ["pending", "processing"] } },
      take: 5,
      include: {
        installment: {
          include: {
            contract: {
              include: { endCustomer: { select: { name: true } } },
            },
          },
        },
      },
    }),
  ]);

  const totalAmount = stats.reduce((sum, s) => sum + (s._sum.amountCents ?? 0n), 0n);

  return {
    drawdowns: drawdowns.map((d) => ({
      id: d.id,
      amountCents: Number(d.amountCents),
      reason: d.reason,
      description: d.description,
      referenceType: d.referenceType,
      referenceId: d.referenceId,
      executedAt: d.executedAt,
      escrowAccount: {
        merchant: d.escrowAccount.merchant,
        fund: d.escrowAccount.fund,
      },
    })),
    stats,
    totalAmount,
    chargeAttempts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const reasonFilters = [
  { value: "", label: "Todos" },
  { value: "late_payment", label: "Atraso" },
  { value: "default_coverage", label: "Inadimplência" },
  { value: "fee_charge", label: "Taxa" },
  { value: "manual_adjustment", label: "Ajuste" },
];

export default async function DrawdownsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getDrawdownsData(page, params.reason);

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...params, ...newParams };
    const query = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/admin/drawdowns${query ? `?${query}` : ""}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Drawdowns & Recovery"
        subtitle="Saídas de escrow e tentativas de cobrança"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Drawdowns"
            value={formatCurrency(data.totalAmount)}
            description={`${data.pagination.total} operações`}
          />
          {data.stats.slice(0, 3).map((s) => (
            <MetricCard
              key={s.reason}
              label={reasonLabels[s.reason] || s.reason}
              value={formatCurrency(s._sum.amountCents ?? 0n)}
              description={`${s._count} operações`}
            />
          ))}
        </div>
      </Section>

      {data.chargeAttempts.length > 0 && (
        <Section>
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <h3 className="text-lg font-semibold text-white mb-3">
              Cobranças Pendentes (Cartão Tokenizado)
            </h3>
            <div className="divide-y divide-amber-500/20">
              {data.chargeAttempts.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-300">
                      {c.installment.contract.endCustomer.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      Parcela {c.installment.installmentNumber} • Tentativa {c.attemptNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-amber-400 font-medium">
                      {formatCurrency(c.amountCents)}
                    </span>
                    <StatusBadge status={c.status} type="disbursement" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      <Section>
        <div className="flex gap-2 mb-4 flex-wrap">
          {reasonFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildUrl({ reason: filter.value || undefined, page: undefined })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                params.reason === filter.value || (!params.reason && filter.value === "")
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <AdminDrawdownsTable
          drawdowns={data.drawdowns}
          pagination={{
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
          }}
          buildUrl={buildUrl}
        />
      </Section>
    </PageContainer>
  );
}
