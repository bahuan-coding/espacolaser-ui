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
  }>;
}

async function getBoletosData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 20;

  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  const where = {
    contract: { merchantId: merchant.id },
    origin: "private_label" as const, // Only PL installments (not 1st via acquirer)
    ...(params.status && { status: params.status as any }),
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
            endCustomer: { select: { name: true, document: true } },
          },
        },
      },
    }),
    prisma.contractInstallment.count({ where }),
    prisma.contractInstallment.groupBy({
      by: ["status"],
      where: { contract: { merchantId: merchant.id }, origin: "private_label" },
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

export default async function BoletosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getBoletosData(params);

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Boletos / Faturas" subtitle="Acompanhamento de cobranças" />
        <Section>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <p className="text-slate-500">Nenhum merchant encontrado.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  const scheduled = data.stats["scheduled"]?.count ?? 0;
  const paid = data.stats["paid"]?.count ?? 0;
  const late = data.stats["late"]?.count ?? 0;
  const defaulted = data.stats["defaulted"]?.count ?? 0;

  const columns = [
    {
      key: "customer",
      header: "Cliente",
      render: (i: (typeof data.installments)[0]) => (
        <div>
          <p className="text-slate-900 font-medium">{i.contract.endCustomer.name}</p>
          <p className="text-xs text-slate-500">{i.contract.endCustomer.document}</p>
        </div>
      ),
    },
    {
      key: "contract",
      header: "Contrato",
      hideOnMobile: true,
      render: (i: (typeof data.installments)[0]) => (
        <Link
          href={`/contratos/${i.contract.id}`}
          className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
        >
          {i.contract.contractNumber}
        </Link>
      ),
    },
    {
      key: "installment",
      header: "Parcela",
      className: "text-center",
      hideOnMobile: true,
      render: (i: (typeof data.installments)[0]) => (
        <span className="text-slate-600">
          {i.installmentNumber}/{i.contract.numberOfInstallments}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Valor",
      className: "text-right",
      render: (i: (typeof data.installments)[0]) => (
        <span className="text-slate-900 font-medium">{formatCurrency(i.amountCents)}</span>
      ),
    },
    {
      key: "dueDate",
      header: "Vencimento",
      hideOnMobile: true,
      render: (i: (typeof data.installments)[0]) => (
        <div>
          <p className="text-slate-700">{formatDate(i.dueDate)}</p>
          {i.daysOverdue > 0 && (
            <p className="text-xs text-red-600">{i.daysOverdue} dias de atraso</p>
          )}
        </div>
      ),
    },
    {
      key: "paidAt",
      header: "Pagamento",
      hideOnMobile: true,
      render: (i: (typeof data.installments)[0]) => (
        <span className="text-slate-500">
          {i.paidAt ? formatDate(i.paidAt) : "-"}
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

  const statusFilters = [
    { value: "", label: "Todos" },
    { value: "scheduled", label: "Agendados" },
    { value: "paid", label: "Pagos" },
    { value: "late", label: "Atrasados" },
    { value: "defaulted", label: "Inadimplentes" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Boletos / Faturas"
        subtitle="Acompanhamento de parcelas do Private Label"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Agendados"
            value={scheduled.toString()}
            description={formatCurrency(data.stats["scheduled"]?.total ?? 0n)}
          />
          <MetricCard
            label="Pagos"
            value={paid.toString()}
            variant="success"
            description={formatCurrency(data.stats["paid"]?.total ?? 0n)}
          />
          <MetricCard
            label="Atrasados"
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
        <div className="flex flex-wrap gap-2 mb-4">
          {statusFilters.map((filter) => (
            <Link
              key={filter.value}
              href={`/boletos${filter.value ? `?status=${filter.value}` : ""}`}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                params.status === filter.value || (!params.status && filter.value === "")
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {filter.label}
            </Link>
          ))}
        </div>

        <DataTable
          columns={columns}
          data={data.installments}
          keyExtractor={(i) => i.id}
          emptyMessage="Nenhuma fatura encontrada"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={`/boletos?${params.status ? `status=${params.status}&` : ""}page=${data.pagination.page - 1}`}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={`/boletos?${params.status ? `status=${params.status}&` : ""}page=${data.pagination.page + 1}`}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
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
