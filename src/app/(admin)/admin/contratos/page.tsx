export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    merchant?: string;
    search?: string;
  }>;
}

async function getContratosData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 20;

  const where = {
    ...(params.status && { eligibilityStatus: params.status as any }),
    ...(params.merchant && { merchantId: params.merchant }),
    ...(params.search && {
      OR: [
        { contractNumber: { contains: params.search, mode: "insensitive" as const } },
        { endCustomer: { name: { contains: params.search, mode: "insensitive" as const } } },
        { endCustomer: { document: { contains: params.search } } },
      ],
    }),
  };

  const [contracts, total, stats, merchants] = await Promise.all([
    prisma.serviceContract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        merchant: { select: { id: true, name: true } },
        endCustomer: { select: { id: true, name: true, document: true } },
        _count: { select: { installments: true } },
        installments: { select: { status: true, amountCents: true } },
        disbursements: { where: { status: "posted" }, select: { id: true, totalAmountCents: true } },
      },
    }),
    prisma.serviceContract.count({ where }),
    prisma.serviceContract.groupBy({
      by: ["eligibilityStatus"],
      _count: true,
      _sum: { totalAmountCents: true },
    }),
    prisma.merchant.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const statsMap = stats.reduce((acc, s) => {
    acc[s.eligibilityStatus] = {
      count: s._count,
      total: s._sum.totalAmountCents ?? 0n,
    };
    return acc;
  }, {} as Record<string, { count: number; total: bigint }>);

  return {
    contracts: contracts.map((c) => ({
      ...c,
      paidCount: c.installments.filter((i) => i.status === "paid").length,
      lateCount: c.installments.filter((i) => i.status === "late" || i.status === "defaulted").length,
      totalInstallments: c._count.installments,
      disbursedAmount: c.disbursements.reduce((sum, d) => sum + d.totalAmountCents, 0n),
    })),
    stats: statsMap,
    merchants,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const statusFilters = [
  { value: "", label: "Todos" },
  { value: "pending_first_installment", label: "Aguard. 1ª" },
  { value: "pending_second_installment", label: "Aguard. 2ª" },
  { value: "eligible", label: "Elegível" },
  { value: "eligible_late", label: "Elegível (atraso)" },
  { value: "disbursed", label: "Desembolsado" },
  { value: "ineligible", label: "Inelegível" },
];

export default async function AdminContratosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getContratosData(params);

  const disbursed = data.stats["disbursed"]?.count ?? 0;
  const eligible = (data.stats["eligible"]?.count ?? 0) + (data.stats["eligible_late"]?.count ?? 0);
  const pending = (data.stats["pending_first_installment"]?.count ?? 0) + (data.stats["pending_second_installment"]?.count ?? 0);
  const ineligible = data.stats["ineligible"]?.count ?? 0;

  const columns = [
    {
      key: "contractNumber",
      header: "Contrato",
      render: (c: (typeof data.contracts)[0]) => (
        <div>
          <Link
            href={`/contratos/${c.id}`}
            className="text-violet-400 hover:text-violet-300 font-medium"
          >
            {c.contractNumber}
          </Link>
          <p className="text-xs text-slate-500">{c.description || "Contrato de serviço"}</p>
        </div>
      ),
    },
    {
      key: "merchant",
      header: "Lojista",
      render: (c: (typeof data.contracts)[0]) => (
        <span className="text-slate-300">{c.merchant.name}</span>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      render: (c: (typeof data.contracts)[0]) => (
        <div>
          <p className="text-slate-300">{c.endCustomer.name}</p>
          <p className="text-xs text-slate-500">{c.endCustomer.document}</p>
        </div>
      ),
    },
    {
      key: "totalAmount",
      header: "Valor Total",
      className: "text-right",
      render: (c: (typeof data.contracts)[0]) => (
        <span className="text-white font-medium">{formatCurrency(c.totalAmountCents)}</span>
      ),
    },
    {
      key: "installments",
      header: "Parcelas",
      className: "text-center",
      render: (c: (typeof data.contracts)[0]) => (
        <div>
          <span className="text-slate-300">{c.paidCount}/{c.totalInstallments}</span>
          {c.lateCount > 0 && (
            <span className="text-xs text-red-400 ml-1">({c.lateCount} atraso)</span>
          )}
        </div>
      ),
    },
    {
      key: "disbursed",
      header: "Desembolsado",
      className: "text-right",
      render: (c: (typeof data.contracts)[0]) => (
        <span className={c.disbursedAmount > 0n ? "text-emerald-400" : "text-slate-500"}>
          {c.disbursedAmount > 0n ? formatCurrency(c.disbursedAmount) : "-"}
        </span>
      ),
    },
    {
      key: "startDate",
      header: "Início",
      render: (c: (typeof data.contracts)[0]) => (
        <span className="text-slate-400 text-sm">{formatDate(c.startDate)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c: (typeof data.contracts)[0]) => (
        <StatusBadge status={c.eligibilityStatus} type="eligibility" />
      ),
    },
  ];

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const merged = { ...params, ...newParams };
    const query = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    return `/admin/contratos${query ? `?${query}` : ""}`;
  };

  return (
    <PageContainer>
      <PageHeader
        title="Contratos (Admin)"
        subtitle="Visão global de todos os contratos do sistema"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Desembolsados"
            value={disbursed.toString()}
            variant="success"
            description="Já antecipados"
          />
          <MetricCard
            label="Elegíveis"
            value={eligible.toString()}
            variant="info"
            description="Prontos para desembolso"
          />
          <MetricCard
            label="Pendentes"
            value={pending.toString()}
            description="Aguardando parcelas"
          />
          <MetricCard
            label="Inelegíveis"
            value={ineligible.toString()}
            description="Bloqueados"
          />
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap gap-4 mb-4">
          {/* Search */}
          <form className="flex-1 min-w-[200px]">
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Buscar por contrato, cliente ou CPF..."
              className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </form>

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

        {/* Status Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {statusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={buildUrl({ status: filter.value || undefined, page: undefined })}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                params.status === filter.value || (!params.status && filter.value === "")
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={data.contracts}
          keyExtractor={(c) => c.id}
          emptyMessage="Nenhum contrato encontrado"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages} ({data.pagination.total} contratos)
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

