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
  searchParams: Promise<{ page?: string; search?: string }>;
}

async function getMerchantsData(page: number, search?: string) {
  const limit = 15;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { document: { contains: search } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [merchants, total, stats] = await Promise.all([
    prisma.merchant.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { serviceContracts: true, users: true } },
        escrowAccounts: {
          where: { isActive: true },
          select: { balanceCents: true },
        },
        serviceContracts: {
          select: { totalAmountCents: true, eligibilityStatus: true },
        },
      },
    }),
    prisma.merchant.count({ where }),
    prisma.merchant.aggregate({
      _count: true,
    }),
  ]);

  const totalVolume = await prisma.serviceContract.aggregate({
    _sum: { totalAmountCents: true },
  });

  return {
    merchants: merchants.map((m) => ({
      ...m,
      escrowBalance: m.escrowAccounts.reduce((sum, a) => sum + a.balanceCents, 0n),
      totalContractValue: m.serviceContracts.reduce((sum, c) => sum + c.totalAmountCents, 0n),
      disbursedCount: m.serviceContracts.filter((c) => c.eligibilityStatus === "disbursed").length,
    })),
    globalStats: {
      totalMerchants: stats._count,
      totalVolume: totalVolume._sum.totalAmountCents ?? 0n,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function MerchantsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getMerchantsData(page, params.search);

  const columns = [
    {
      key: "name",
      header: "Lojista",
      render: (m: (typeof data.merchants)[0]) => (
        <div>
          <p className="text-white font-medium">{m.name}</p>
          <p className="text-xs text-slate-500">{m.document}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (m: (typeof data.merchants)[0]) => (
        <div>
          <p className="text-slate-300">{m.email}</p>
          <p className="text-xs text-slate-500">{m.phone || "-"}</p>
        </div>
      ),
    },
    {
      key: "contracts",
      header: "Contratos",
      className: "text-center",
      render: (m: (typeof data.merchants)[0]) => (
        <div>
          <p className="text-slate-300">{m._count.serviceContracts}</p>
          <p className="text-xs text-slate-500">{m.disbursedCount} antecipados</p>
        </div>
      ),
    },
    {
      key: "escrowBalance",
      header: "Saldo Escrow",
      className: "text-right",
      render: (m: (typeof data.merchants)[0]) => (
        <span className={`font-medium ${m.escrowBalance > 0n ? "text-emerald-400" : "text-slate-400"}`}>
          {formatCurrency(m.escrowBalance)}
        </span>
      ),
    },
    {
      key: "totalContractValue",
      header: "Volume",
      className: "text-right",
      render: (m: (typeof data.merchants)[0]) => (
        <span className="text-slate-300">
          {formatCurrency(m.totalContractValue)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (m: (typeof data.merchants)[0]) => (
        <StatusBadge
          status={m.isActive ? "paid" : "cancelled"}
          type="installment"
          showLabel={false}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Cadastro",
      render: (m: (typeof data.merchants)[0]) => (
        <span className="text-slate-500 text-sm">{formatDate(m.createdAt)}</span>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Lojistas"
        subtitle="Gestão de merchants cadastrados"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Total Lojistas"
            value={data.globalStats.totalMerchants.toString()}
          />
          <MetricCard
            label="Volume Total"
            value={formatCurrency(data.globalStats.totalVolume)}
            variant="success"
          />
          <MetricCard
            label="Exibindo"
            value={data.merchants.length.toString()}
            description={`de ${data.pagination.total}`}
          />
        </div>
      </Section>

      <Section>
        <form className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              name="search"
              defaultValue={params.search}
              placeholder="Buscar por nome, CNPJ ou email..."
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
          data={data.merchants}
          keyExtractor={(m) => m.id}
          emptyMessage="Nenhum lojista cadastrado"
        />

        {data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">
              Página {data.pagination.page} de {data.pagination.totalPages}
            </p>
            <div className="flex gap-2">
              {data.pagination.page > 1 && (
                <Link
                  href={`/admin/merchants?${params.search ? `search=${params.search}&` : ""}page=${data.pagination.page - 1}`}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Anterior
                </Link>
              )}
              {data.pagination.page < data.pagination.totalPages && (
                <Link
                  href={`/admin/merchants?${params.search ? `search=${params.search}&` : ""}page=${data.pagination.page + 1}`}
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
