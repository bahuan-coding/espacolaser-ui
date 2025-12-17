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
    search?: string;
    status?: string;
  }>;
}

async function getClientesData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 20;

  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  // Get customers that have contracts with this merchant
  const customerIds = await prisma.serviceContract.findMany({
    where: { merchantId: merchant.id },
    select: { endCustomerId: true },
    distinct: ["endCustomerId"],
  });

  const customerIdList = customerIds.map((c) => c.endCustomerId);

  const where = {
    id: { in: customerIdList },
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: "insensitive" as const } },
        { document: { contains: params.search } },
        { email: { contains: params.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.endCustomer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contracts: {
          where: { merchantId: merchant.id },
          select: {
            id: true,
            contractNumber: true,
            eligibilityStatus: true,
            totalAmountCents: true,
            installments: {
              select: { status: true },
            },
          },
        },
        plCards: {
          select: { id: true, issuanceStatus: true },
        },
      },
    }),
    prisma.endCustomer.count({ where }),
  ]);

  // Calculate stats
  const customersWithData = customers.map((customer) => {
    const hasLateInstallment = customer.contracts.some((c) =>
      c.installments.some((i) => i.status === "late" || i.status === "defaulted")
    );
    const totalContracts = customer.contracts.length;
    const totalValue = customer.contracts.reduce((sum, c) => sum + c.totalAmountCents, 0n);
    const hasPlCard = customer.plCards.some((p) => p.issuanceStatus === "issued");

    return {
      ...customer,
      hasLateInstallment,
      totalContracts,
      totalValue,
      hasPlCard,
      status: hasLateInstallment ? "late" : "active",
    };
  });

  const lateCount = customersWithData.filter((c) => c.hasLateInstallment).length;
  const activeCount = customersWithData.filter((c) => !c.hasLateInstallment).length;
  const withPlCard = customersWithData.filter((c) => c.hasPlCard).length;

  return {
    customers: customersWithData,
    stats: {
      total: total,
      active: activeCount,
      late: lateCount,
      withPlCard,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getClientesData(params);

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Clientes" subtitle="Gestão de clientes finais" />
        <Section>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <p className="text-slate-500">Nenhum merchant encontrado.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  const columns = [
    {
      key: "name",
      header: "Cliente",
      render: (c: (typeof data.customers)[0]) => (
        <div>
          <p className="text-slate-900 font-medium">{c.name}</p>
          <p className="text-xs text-slate-500 font-mono">{c.document}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      hideOnMobile: true,
      render: (c: (typeof data.customers)[0]) => (
        <div>
          {c.email && <p className="text-sm text-slate-600">{c.email}</p>}
          {c.phone && <p className="text-xs text-slate-500">{c.phone}</p>}
          {!c.email && !c.phone && <span className="text-slate-400">-</span>}
        </div>
      ),
    },
    {
      key: "contracts",
      header: "Contratos",
      className: "text-center",
      render: (c: (typeof data.customers)[0]) => (
        <span className="text-slate-700">{c.totalContracts}</span>
      ),
    },
    {
      key: "totalValue",
      header: "Valor Total",
      hideOnMobile: true,
      className: "text-right",
      render: (c: (typeof data.customers)[0]) => (
        <span className="text-slate-900 font-medium">{formatCurrency(c.totalValue)}</span>
      ),
    },
    {
      key: "plCard",
      header: "Cartão PL",
      hideOnMobile: true,
      render: (c: (typeof data.customers)[0]) => (
        c.hasPlCard ? (
          <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
            Ativo
          </span>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        )
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c: (typeof data.customers)[0]) => (
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
            c.hasLateInstallment
              ? "bg-red-50 text-red-700 border-red-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          }`}
        >
          {c.hasLateInstallment ? "Atraso" : "Em dia"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (c: (typeof data.customers)[0]) => (
        <div className="flex gap-2 justify-end">
          {c.contracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/contratos/${contract.id}`}
              className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors"
              title={`Ver contrato ${contract.contractNumber}`}
            >
              {contract.contractNumber.slice(-6)}
            </Link>
          ))}
        </div>
      ),
    },
  ];

  const statusFilters = [
    { value: "", label: "Todos" },
    { value: "active", label: "Em Dia" },
    { value: "late", label: "Em Atraso" },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Clientes"
        subtitle="Clientes finais com contratos ativos"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total de Clientes"
            value={data.stats.total.toString()}
          />
          <MetricCard
            label="Em Dia"
            value={data.stats.active.toString()}
            variant="success"
            description="Sem parcelas atrasadas"
          />
          <MetricCard
            label="Em Atraso"
            value={data.stats.late.toString()}
            description="Com parcelas atrasadas"
          />
          <MetricCard
            label="Com Cartão PL"
            value={data.stats.withPlCard.toString()}
            variant="info"
          />
        </div>
      </Section>

      <Section>
        {/* Search and filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <form className="flex-1" action="/clientes" method="get">
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Buscar por nome, CPF ou email..."
              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </form>
          <div className="flex gap-2">
            {statusFilters.map((filter) => (
              <Link
                key={filter.value}
                href={`/clientes${filter.value ? `?status=${filter.value}` : ""}${params.search ? `${filter.value ? "&" : "?"}search=${params.search}` : ""}`}
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
        </div>

        <DataTable
          columns={columns}
          data={data.customers.filter((c) => {
            if (!params.status) return true;
            if (params.status === "late") return c.hasLateInstallment;
            if (params.status === "active") return !c.hasLateInstallment;
            return true;
          })}
          keyExtractor={(c) => c.id}
          emptyMessage="Nenhum cliente encontrado"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={`/clientes?page=${data.pagination.page - 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={`/clientes?page=${data.pagination.page + 1}${params.search ? `&search=${params.search}` : ""}${params.status ? `&status=${params.status}` : ""}`}
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

