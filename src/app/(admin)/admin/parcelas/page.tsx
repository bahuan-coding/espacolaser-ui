export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    origin?: string;
  }>;
}

async function getParcelasData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 25;

  const where = {
    ...(params.status && { status: params.status as any }),
    ...(params.origin && { origin: params.origin as any }),
  };

  const [installments, total, stats] = await Promise.all([
    prisma.contractInstallment.findMany({
      where,
      orderBy: { dueDate: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contract: {
          include: {
            merchant: { select: { id: true, name: true } },
            endCustomer: { select: { id: true, name: true, document: true } },
          },
        },
      },
    }),
    prisma.contractInstallment.count({ where }),
    prisma.contractInstallment.groupBy({
      by: ["status"],
      _count: true,
      _sum: { amountCents: true },
    }),
  ]);

  const statsMap = stats.reduce((acc, s) => {
    acc[s.status] = {
      count: s._count,
      total: s._sum.amountCents ?? 0n,
    };
    return acc;
  }, {} as Record<string, { count: number; total: bigint }>);

  return {
    installments,
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const statusFilters = [
  { value: "", label: "Todos" },
  { value: "scheduled", label: "Agendadas" },
  { value: "paid", label: "Pagas" },
  { value: "late", label: "Atrasadas" },
  { value: "defaulted", label: "Inadimplentes" },
  { value: "cancelled", label: "Canceladas" },
];

const originFilters = [
  { value: "", label: "Todas Origens" },
  { value: "private_label", label: "Private Label" },
  { value: "external_capture", label: "Adquirente" },
];

export default async function ParcelasPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getParcelasData(params);

  const scheduled = data.stats["scheduled"]?.count ?? 0;
  const paid = data.stats["paid"]?.count ?? 0;
  const late = data.stats["late"]?.count ?? 0;
  const defaulted = data.stats["defaulted"]?.count ?? 0;

  const columns = [
    {
      key: "contract",
      header: "Contrato",
      render: (i: (typeof data.installments)[0]) => (
        <div>
          <Link
            href={`/contratos/${i.contract.id}`}
            className="text-violet-400 hover:text-violet-300 font-medium"
          >
            {i.contract.contractNumber}
          </Link>
          <p className="text-xs text-slate-500">{i.contract.merchant.name}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (i: (typeof data.installments)[0]) => (
        <div>
          <p className="text-slate-300">{i.contract.endCustomer.name}</p>
          <p className="text-xs text-slate-500">{i.contract.endCustomer.document}</p>
        </div>
      ),
    },
    {
      key: "installment",
      header: "Parcela",
      className: "text-center",
      render: (i: (typeof data.installments)[0]) => (
        <span className="text-slate-300">{i.installmentNumber}</span>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (i: (typeof data.installments)[0]) => (
        <span className="text-white font-medium">{formatCurrency(i.amountCents)}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Vencimento",
      render: (i: (typeof data.installments)[0]) => (
        <div>
          <p className="text-slate-300">{formatDate(i.dueDate)}</p>
          {i.daysOverdue > 0 && (
            <p className="text-xs text-red-400">{i.daysOverdue}d atraso</p>
          )}
        </div>
      ),
    },
    {
      key: "paidAt",
      header: "Pagamento",
      render: (i: (typeof data.installments)[0]) => (
        <span className="text-slate-400 text-sm">
          {i.paidAt ? formatDate(i.paidAt) : "-"}
        </span>
      ),
    },
    {
      key: "origin",
      header: "Origem",
      render: (i: (typeof data.installments)[0]) => (
        <span className={`text-xs px-2 py-0.5 rounded ${
          i.origin === "external_capture"
            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
            : "bg-violet-500/10 text-violet-400 border border-violet-500/30"
        }`}>
          {i.origin === "external_capture" ? "Adquirente" : "PL"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (i: (typeof data.installments)[0]) => (
        <StatusBadge status={i.status} type="installment" />
      ),
    },
  ];

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...params, ...newParams };
    const query = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/admin/parcelas${query ? `?${query}` : ""}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Parcelas (Admin)"
        subtitle="Visão global de todas as parcelas do sistema"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Agendadas"
            value={scheduled.toString()}
            description={formatCurrency(data.stats["scheduled"]?.total ?? 0n)}
          />
          <MetricCard
            label="Pagas"
            value={paid.toString()}
            variant="success"
            description={formatCurrency(data.stats["paid"]?.total ?? 0n)}
          />
          <MetricCard
            label="Atrasadas"
            value={late.toString()}
            description={formatCurrency(data.stats["late"]?.total ?? 0n)}
          />
          <MetricCard
            label="Inadimplentes"
            value={defaulted.toString()}
            description={formatCurrency(data.stats["defaulted"]?.total ?? 0n)}
          />
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Status Filters */}
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildUrl({ status: filter.value || undefined, page: undefined })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  params.status === filter.value || (!params.status && filter.value === "")
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>

          {/* Origin Filter */}
          <div className="flex gap-2">
            {originFilters.map((filter) => (
              <Link
                key={filter.value}
                href={buildUrl({ origin: filter.value || undefined, page: undefined })}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  params.origin === filter.value || (!params.origin && filter.value === "")
                    ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                    : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data.installments}
          keyExtractor={(i) => i.id}
          emptyMessage="Nenhuma parcela encontrada"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages} ({data.pagination.total} parcelas)
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

