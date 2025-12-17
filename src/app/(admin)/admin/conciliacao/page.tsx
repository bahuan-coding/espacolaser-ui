export const dynamic = "force-dynamic";

import { Upload } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { AdminConciliacaoTable } from "./table";

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
    files: files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      source: f.source,
      periodStart: f.periodStart,
      periodEnd: f.periodEnd,
      totalRecords: f.totalRecords,
      matchedCount: f.matchedCount,
      mismatchedCount: f.mismatchedCount,
      status: f.status,
      createdAt: f.createdAt,
      _count: f._count,
    })),
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function ConciliacaoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getConciliacaoData(page);

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
        <AdminConciliacaoTable files={data.files} />
      </Section>
    </PageContainer>
  );
}
