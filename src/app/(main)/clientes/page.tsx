export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { ClientesTable } from "./table";

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

  const customersWithData = customers.map((customer) => {
    const hasLateInstallment = customer.contracts.some((c) =>
      c.installments.some((i) => i.status === "late" || i.status === "defaulted")
    );
    const totalContracts = customer.contracts.length;
    const totalValue = customer.contracts.reduce((sum, c) => sum + c.totalAmountCents, 0n);
    const hasPlCard = customer.plCards.some((p) => p.issuanceStatus === "issued");

    return {
      id: customer.id,
      name: customer.name,
      document: customer.document,
      email: customer.email,
      phone: customer.phone,
      hasLateInstallment,
      totalContracts,
      totalValue,
      hasPlCard,
      status: hasLateInstallment ? "late" : "active",
      contracts: customer.contracts.map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
      })),
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

  const statusFilters = [
    { value: "", label: "Todos" },
    { value: "active", label: "Em Dia" },
    { value: "late", label: "Em Atraso" },
  ];

  const filteredCustomers = data.customers.filter((c) => {
    if (!params.status) return true;
    if (params.status === "late") return c.hasLateInstallment;
    if (params.status === "active") return !c.hasLateInstallment;
    return true;
  });

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
                href={(() => {
                  const urlParams = new URLSearchParams();
                  if (filter.value) urlParams.set("status", filter.value);
                  if (params.search) urlParams.set("search", params.search);
                  return `/clientes${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;
                })()}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  params.status === filter.value || (!params.status && filter.value === "")
                    ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                {filter.label}
              </Link>
            ))}
          </div>
        </div>

        <ClientesTable
          customers={filteredCustomers}
          pagination={{
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
          }}
          searchParams={{
            search: params.search,
            status: params.status,
          }}
        />
      </Section>
    </PageContainer>
  );
}
