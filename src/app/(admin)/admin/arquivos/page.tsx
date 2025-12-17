export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { prisma } from "@/lib/prisma";
import { FileUploadForm } from "./file-upload-form";
import { AdminArquivosTable } from "./table";

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
    files: files.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      totalRecords: f.totalRecords,
      matchedRecords: f.matchedRecords,
      unmatchedRecords: f.unmatchedRecords,
      status: f.status,
      createdAt: f.createdAt,
      _count: f._count,
    })),
    stats: statsMap,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export default async function ArquivosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const data = await getArquivosData(page, params.status);

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
        <AdminArquivosTable files={data.files} />
      </Section>
    </PageContainer>
  );
}
