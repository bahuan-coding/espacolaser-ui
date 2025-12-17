export const dynamic = "force-dynamic";

import { Upload, FileText, Play, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";
import { FileUploadForm } from "./file-upload-form";
import { FileActions } from "./file-actions";

interface PageProps {
  searchParams: Promise<{ page?: string; status?: string }>;
}

async function getArquivosData(page: number, status?: string) {
  const limit = 15;
  const where = status ? { status: status as any } : {};

  const [files, total, stats] = await Promise.all([
    prisma.returnFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { payments: true } } },
    }),
    prisma.returnFile.count({ where }),
    prisma.returnFile.groupBy({
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

const statusColors: Record<string, string> = {
  uploaded: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  parsing: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  parsed: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  processing: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  processed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
};

export default async function ArquivosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getArquivosData(page, params.status);

  const columns = [
    {
      key: "fileName",
      header: "Arquivo",
      render: (f: (typeof data.files)[0]) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-white font-medium">{f.fileName}</p>
            <p className="text-xs text-slate-500">
              {formatDateTime(f.createdAt)} • {f.fileType.toUpperCase()}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "records",
      header: "Registros",
      className: "text-center",
      render: (f: (typeof data.files)[0]) => (
        <span className="text-slate-300">{f.totalRecords}</span>
      ),
    },
    {
      key: "matched",
      header: "Conciliados",
      className: "text-center",
      render: (f: (typeof data.files)[0]) => (
        <span className="text-emerald-400">{f.matchedRecords}</span>
      ),
    },
    {
      key: "unmatched",
      header: "Pendentes",
      className: "text-center",
      render: (f: (typeof data.files)[0]) => (
        <span className={f.unmatchedRecords > 0 ? "text-amber-400" : "text-slate-500"}>
          {f.unmatchedRecords}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (f: (typeof data.files)[0]) => (
        <span className={`text-xs px-2 py-1 rounded border ${statusColors[f.status] || statusColors.uploaded}`}>
          {f.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (f: (typeof data.files)[0]) => (
        <FileActions
          fileId={f.id}
          status={f.status}
          fileName={f.fileName}
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Arquivos de Retorno"
          subtitle="Upload e processamento de arquivos do gateway e BIZ"
        />
      </div>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <MetricCard
            label="Total"
            value={data.pagination.total.toString()}
            description="Arquivos"
          />
          <MetricCard
            label="Aguardando"
            value={(data.stats["uploaded"] || 0).toString()}
            description="Para processar"
          />
          <MetricCard
            label="Processando"
            value={(data.stats["processing"] || 0).toString()}
          />
          <MetricCard
            label="Processados"
            value={(data.stats["processed"] || 0).toString()}
            variant="success"
          />
          <MetricCard
            label="Falhas"
            value={(data.stats["failed"] || 0).toString()}
          />
        </div>
      </Section>

      <Section>
        <FileUploadForm />
      </Section>

      <Section>
        <DataTable
          columns={columns}
          data={data.files}
          keyExtractor={(f) => f.id}
          emptyMessage="Nenhum arquivo de retorno encontrado"
        />
      </Section>
    </PageContainer>
  );
}

