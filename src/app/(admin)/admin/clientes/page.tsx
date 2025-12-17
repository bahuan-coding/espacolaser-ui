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
  searchParams: Promise<{ page?: string; search?: string }>;
}

async function getClientesData(page: number, search?: string) {
  const limit = 20;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { document: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [customers, total, stats] = await Promise.all([
    prisma.endCustomer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contracts: {
          select: {
            id: true,
            totalAmountCents: true,
            eligibilityStatus: true,
          },
        },
        tokenizedCards: {
          where: { isActive: true },
          select: { id: true, tokenizationStatus: true, brand: true, lastFourDigits: true },
        },
        plCards: {
          where: { isActive: true },
          select: { id: true, issuanceStatus: true, lastFourDigits: true },
        },
      },
    }),
    prisma.endCustomer.count({ where }),
    prisma.$transaction([
      prisma.endCustomer.count(),
      prisma.serviceContract.count(),
      prisma.tokenizedCard.count({ where: { tokenizationStatus: "success" } }),
      prisma.privateLabelCard.count({ where: { issuanceStatus: "issued" } }),
    ]),
  ]);

  return {
    customers: customers.map((c) => ({
      ...c,
      totalContracts: c.contracts.length,
      totalValue: c.contracts.reduce((sum, ct) => sum + ct.totalAmountCents, 0n),
      activeContracts: c.contracts.filter(
        (ct) => ct.eligibilityStatus === "disbursed" || ct.eligibilityStatus === "eligible"
      ).length,
    })),
    stats: {
      totalCustomers: stats[0],
      totalContracts: stats[1],
      tokenizedCards: stats[2],
      plCards: stats[3],
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function ClientesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getClientesData(page, params.search);

  const columns = [
    {
      key: "name",
      header: "Cliente",
      render: (c: (typeof data.customers)[0]) => (
        <div>
          <p className="text-white font-medium">{c.name}</p>
          <p className="text-xs text-slate-500">{c.document}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (c: (typeof data.customers)[0]) => (
        <div>
          <p className="text-slate-300">{c.email || "-"}</p>
          <p className="text-xs text-slate-500">{c.phone || "-"}</p>
        </div>
      ),
    },
    {
      key: "contracts",
      header: "Contratos",
      className: "text-center",
      render: (c: (typeof data.customers)[0]) => (
        <div>
          <p className="text-slate-300">{c.totalContracts}</p>
          <p className="text-xs text-slate-500">{c.activeContracts} ativos</p>
        </div>
      ),
    },
    {
      key: "totalValue",
      header: "Volume",
      className: "text-right",
      render: (c: (typeof data.customers)[0]) => (
        <span className="text-slate-300">{formatCurrency(c.totalValue)}</span>
      ),
    },
    {
      key: "cards",
      header: "Cartões",
      render: (c: (typeof data.customers)[0]) => (
        <div className="flex gap-2">
          {c.tokenizedCards.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
              {c.tokenizedCards.length} Token
            </span>
          )}
          {c.plCards.length > 0 && (
            <span className="text-xs px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/30 rounded">
              {c.plCards.length} PL
            </span>
          )}
          {c.tokenizedCards.length === 0 && c.plCards.length === 0 && (
            <span className="text-slate-500 text-xs">-</span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Cadastro",
      render: (c: (typeof data.customers)[0]) => (
        <span className="text-slate-500 text-sm">{formatDate(c.createdAt)}</span>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader title="Clientes Finais" subtitle="Gestão de clientes (EndCustomer)" />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard label="Total Clientes" value={data.stats.totalCustomers.toString()} />
          <MetricCard
            label="Contratos"
            value={data.stats.totalContracts.toString()}
            variant="info"
          />
          <MetricCard
            label="Cartões Tokenizados"
            value={data.stats.tokenizedCards.toString()}
            variant="success"
          />
          <MetricCard label="Cartões PL" value={data.stats.plCards.toString()} />
        </div>
      </Section>

      <Section>
        <form className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Buscar por nome, CPF ou email..."
              className="flex-1 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg hover:bg-violet-500/30 transition-colors"
            >
              Buscar
            </button>
          </div>
        </form>

        <DataTable
          columns={columns}
          data={data.customers}
          keyExtractor={(c) => c.id}
          emptyMessage="Nenhum cliente encontrado"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={`/admin/clientes?${params.search ? `search=${params.search}&` : ""}page=${data.pagination.page - 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={`/admin/clientes?${params.search ? `search=${params.search}&` : ""}page=${data.pagination.page + 1}`}
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


