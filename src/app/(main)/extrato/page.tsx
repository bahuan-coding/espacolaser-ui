export const dynamic = "force-dynamic";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ExtratoFilters } from "./filters";

interface PageProps {
  searchParams: Promise<{ 
    page?: string; 
    type?: string; 
    startDate?: string; 
    endDate?: string;
    referenceType?: string;
  }>;
}

async function getExtratoData(params: Awaited<PageProps["searchParams"]>) {
  const page = parseInt(params.page || "1");
  const limit = 20;

  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  const escrowAccount = await prisma.escrowAccount.findFirst({
    where: { merchantId: merchant.id, isActive: true },
  });

  if (!escrowAccount) return null;

  const where = {
    escrowAccountId: escrowAccount.id,
    ...(params.type && { entryType: params.type as "credit" | "debit" }),
    ...(params.referenceType && { referenceType: params.referenceType }),
    ...(params.startDate && { createdAt: { gte: new Date(params.startDate) } }),
    ...(params.endDate && { createdAt: { lte: new Date(`${params.endDate}T23:59:59`) } }),
  };

  const [entries, total, credits, debits, referenceTypes] = await Promise.all([
    prisma.escrowLedgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.escrowLedgerEntry.count({ where }),
    prisma.escrowLedgerEntry.aggregate({
      where: { escrowAccountId: escrowAccount.id, entryType: "credit" },
      _sum: { amountCents: true },
    }),
    prisma.escrowLedgerEntry.aggregate({
      where: { escrowAccountId: escrowAccount.id, entryType: "debit" },
      _sum: { amountCents: true },
    }),
    prisma.escrowLedgerEntry.groupBy({
      by: ["referenceType"],
      where: { escrowAccountId: escrowAccount.id },
      _count: true,
    }),
  ]);

  // Get related disbursements and drawdowns for linking
  const disbursementIds = entries
    .filter((e) => e.referenceType === "disbursement_split" && e.referenceId)
    .map((e) => e.referenceId!);

  const drawdownIds = entries
    .filter((e) => e.referenceType === "drawdown" && e.referenceId)
    .map((e) => e.referenceId!);

  const [disbursements, drawdowns] = await Promise.all([
    disbursementIds.length > 0
      ? prisma.fundDisbursement.findMany({
          where: { id: { in: disbursementIds } },
          select: { id: true, contractId: true, contract: { select: { contractNumber: true } } },
        })
      : Promise.resolve([]),
    drawdownIds.length > 0
      ? prisma.escrowDrawdown.findMany({
          where: { id: { in: drawdownIds } },
          select: { id: true, referenceId: true, referenceType: true },
        })
      : Promise.resolve([]),
  ]);

  const disbursementMap = new Map(disbursements.map((d) => [d.id, d]));
  const drawdownMap = new Map(drawdowns.map((d) => [d.id, d]));

  const entriesWithLinks = entries.map((entry) => {
    let contractId: string | null = null;
    let contractNumber: string | null = null;

    if (entry.referenceType === "disbursement_split" && entry.referenceId) {
      const disb = disbursementMap.get(entry.referenceId);
      if (disb) {
        contractId = disb.contractId;
        contractNumber = disb.contract.contractNumber;
      }
    }

    return { ...entry, contractId, contractNumber };
  });

  return {
    entries: entriesWithLinks,
    balance: escrowAccount.balanceCents,
    totalCredits: credits._sum.amountCents ?? 0n,
    totalDebits: debits._sum.amountCents ?? 0n,
    referenceTypes: referenceTypes.map((r) => ({
      type: r.referenceType || "manual",
      count: r._count,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

const referenceTypeLabels: Record<string, string> = {
  disbursement_split: "Antecipação (30%)",
  drawdown: "Débito Escrow",
  manual: "Ajuste Manual",
};

export default async function ExtratoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const data = await getExtratoData(params);

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Extrato Escrow" subtitle="Histórico de movimentações" />
        <Section>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <p className="text-slate-500">Conta escrow não encontrada.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Extrato Escrow"
        subtitle="Histórico detalhado de movimentações"
      />

      {/* Info Card */}
      <Section>
        <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-200">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-cyan-900">O que é a Escrow?</h3>
              <p className="text-sm text-cyan-700 mt-1">
                A escrow é uma conta-reserva que retém <strong>30%</strong> de cada antecipação como garantia. 
                Em caso de inadimplência do cliente, esse saldo pode ser usado para cobrir o débito junto ao fundo.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Saldo Atual"
            value={formatCurrency(data.balance)}
            description="Disponível em escrow"
          />
          <MetricCard
            label="Total Créditos"
            value={formatCurrency(data.totalCredits)}
            variant="success"
            description="Entradas (30% das antecipações)"
          />
          <MetricCard
            label="Total Débitos"
            value={formatCurrency(data.totalDebits)}
            description="Saídas (coberturas)"
          />
        </div>
      </Section>

      <Section>
        <ExtratoFilters 
          currentType={params.type} 
          currentStartDate={params.startDate}
          currentEndDate={params.endDate}
          currentReferenceType={params.referenceType}
          referenceTypes={data.referenceTypes}
        />
      </Section>

      <Section>
        <ContentCard title="Movimentações" description="Todas as entradas e saídas da conta escrow">
          {data.entries.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              Nenhuma movimentação encontrada
            </div>
          ) : (
            <div className="divide-y divide-slate-100 -mx-2">
              {data.entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <StatusBadge status={entry.entryType} type="ledger" />
                    <div>
                      <p className="text-sm text-slate-900">
                        {entry.description || referenceTypeLabels[entry.referenceType || ""] || "Movimentação"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">
                          {formatDateTime(entry.createdAt)}
                        </span>
                        {entry.contractNumber && (
                          <Link
                            href={`/contratos/${entry.contractId}`}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                          >
                            {entry.contractNumber}
                          </Link>
                        )}
                        {entry.referenceType && (
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                            {referenceTypeLabels[entry.referenceType] || entry.referenceType}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:text-right">
                    <div>
                      <p className={`text-sm font-medium ${
                        entry.entryType === "credit" ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {entry.entryType === "credit" ? "+" : "-"}
                        {formatCurrency(entry.amountCents)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Saldo: {formatCurrency(entry.balanceAfterCents)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Página {data.pagination.page} de {data.pagination.totalPages} ({data.pagination.total} registros)
              </p>
              <div className="flex gap-2">
                {data.pagination.page > 1 && (
                  <Link
                    href={(() => {
                      const urlParams = new URLSearchParams();
                      urlParams.set("page", String(data.pagination.page - 1));
                      if (params.type) urlParams.set("type", params.type);
                      if (params.startDate) urlParams.set("startDate", params.startDate);
                      if (params.endDate) urlParams.set("endDate", params.endDate);
                      if (params.referenceType) urlParams.set("referenceType", params.referenceType);
                      return `/extrato?${urlParams.toString()}`;
                    })()}
                    className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    Anterior
                  </Link>
                )}
                {data.pagination.page < data.pagination.totalPages && (
                  <Link
                    href={(() => {
                      const urlParams = new URLSearchParams();
                      urlParams.set("page", String(data.pagination.page + 1));
                      if (params.type) urlParams.set("type", params.type);
                      if (params.startDate) urlParams.set("startDate", params.startDate);
                      if (params.endDate) urlParams.set("endDate", params.endDate);
                      if (params.referenceType) urlParams.set("referenceType", params.referenceType);
                      return `/extrato?${urlParams.toString()}`;
                    })()}
                    className="px-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    Próxima
                  </Link>
                )}
              </div>
            </div>
          )}
        </ContentCard>
      </Section>
    </PageContainer>
  );
}
