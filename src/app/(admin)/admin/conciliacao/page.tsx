export const dynamic = "force-dynamic";

import { Upload } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable, Pagination } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/utils";

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

async function getConciliacaoData(page: number) {
  const limit = 15;

  const [files, total, stats] = await Promise.all([
    prisma.reconciliationFile.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { items: true } },
      },
    }),
    prisma.reconciliationFile.count(),
    prisma.reconciliationFile.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const statsMap = stats.reduce((acc, s) => {
    acc[s.status] = s._count;
    return acc;
  }, {} as Record<string, number>);

  return {
    files,
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const statusVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
  matched: "success",
  mismatched: "danger",
  pending: "warning",
  ignored: "default",
};

export default async function ConciliacaoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getConciliacaoData(page);

  const columns = [
    {
      key: "fileName",
      header: "Arquivo",
      render: (f: typeof data.files[0]) => (
        <div>
          <p className="text-white font-medium">{f.fileName}</p>
          <p className="text-xs text-slate-500">{formatDateTime(f.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Fonte",
      render: (f: typeof data.files[0]) => (
        <span className="text-slate-300 uppercase text-xs">{f.source}</span>
      ),
    },
    {
      key: "period",
      header: "Período",
      render: (f: typeof data.files[0]) => (
        <span className="text-slate-300">
          {formatDate(f.periodStart)} - {formatDate(f.periodEnd)}
        </span>
      ),
    },
    {
      key: "totalRecords",
      header: "Registros",
      className: "text-center",
      render: (f: typeof data.files[0]) => (
        <span className="text-slate-300">{f.totalRecords}</span>
      ),
    },
    {
      key: "matched",
      header: "Conciliados",
      className: "text-center",
      render: (f: typeof data.files[0]) => (
        <span className="text-emerald-400">{f.matchedCount}</span>
      ),
    },
    {
      key: "mismatched",
      header: "Divergentes",
      className: "text-center",
      render: (f: typeof data.files[0]) => (
        <span className={f.mismatchedCount > 0 ? "text-red-400" : "text-slate-500"}>
          {f.mismatchedCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (f: typeof data.files[0]) => (
        <StatusBadge status={f.status} type="disbursement" />
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Conciliação"
          subtitle="Arquivos de retorno BIZ e reconciliação"
        />
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-sm hover:bg-violet-500/30 transition-colors">
          <Upload className="w-4 h-4" />
          Upload Arquivo
        </button>
      </div>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Pendentes"
            value={(data.stats["pending"] || 0).toString()}
            description="Aguardando processamento"
          />
          <MetricCard
            label="Conciliados"
            value={(data.stats["matched"] || 0).toString()}
            variant="success"
          />
          <MetricCard
            label="Divergentes"
            value={(data.stats["mismatched"] || 0).toString()}
            description="Requerem atenção"
          />
          <MetricCard
            label="Total Arquivos"
            value={data.pagination.total.toString()}
          />
        </div>
      </Section>

      <Section>
        <DataTable
          columns={columns}
          data={data.files}
          keyExtractor={(f) => f.id}
          emptyMessage="Nenhum arquivo de conciliação encontrado"
        />
      </Section>
    </PageContainer>
  );
}

