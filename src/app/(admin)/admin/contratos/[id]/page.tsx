export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { ContractTimeline } from "@/components/contratos/contract-timeline";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getContractData(id: string) {
  const contract = await prisma.serviceContract.findUnique({
    where: { id },
    include: {
      endCustomer: true,
      merchant: { select: { id: true, name: true } },
      plCard: true,
      tokenizedCard: true,
      installments: {
        orderBy: { installmentNumber: "asc" },
        include: {
          reconciliationItems: { select: { id: true, status: true } },
        },
      },
      disbursements: {
        include: {
          fund: { select: { name: true } },
          splits: true,
        },
      },
      gatewayTransactions: {
        select: { id: true, paymentLink: true, status: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!contract) return null;

  const events = await prisma.domainEvent.findMany({
    where: {
      payload: {
        path: ["contractId"],
        equals: id,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return { contract, events };
}

export default async function AdminContratoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getContractData(id);

  if (!data) {
    notFound();
  }

  const { contract, events } = data;

  const paidCount = contract.installments.filter((i) => i.status === "paid").length;
  const totalPaid = contract.installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.paidAmountCents ?? i.amountCents), 0n);

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/admin/contratos"
          className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contratos
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{contract.contractNumber}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{contract.description || "Contrato de serviço"}</p>
        </div>
        <StatusBadge status={contract.eligibilityStatus} type="eligibility" />
      </div>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContentCard title="Lojista">
            <div className="space-y-2">
              <p className="text-slate-900 dark:text-slate-100 font-medium">{contract.merchant.name}</p>
            </div>
          </ContentCard>

          <ContentCard title="Cliente">
            <div className="space-y-2">
              <p className="text-slate-900 dark:text-slate-100 font-medium">{contract.endCustomer.name}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-mono">{contract.endCustomer.document}</p>
              {contract.endCustomer.email && (
                <p className="text-sm text-slate-500 dark:text-slate-500">{contract.endCustomer.email}</p>
              )}
              {contract.endCustomer.phone && (
                <p className="text-sm text-slate-500 dark:text-slate-500">{contract.endCustomer.phone}</p>
              )}
            </div>
          </ContentCard>

          <ContentCard title="Valores">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total:</span>
                <span className="text-slate-900 dark:text-white font-medium">{formatCurrency(contract.totalAmountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Pago:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Parcelas:</span>
                <span className="text-slate-700 dark:text-slate-300">{paidCount}/{contract.numberOfInstallments}</span>
              </div>
            </div>
          </ContentCard>
        </div>
      </Section>

      {(contract.plCard || contract.tokenizedCard) && (
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contract.plCard && (
              <ContentCard title="Cartão Private Label">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Final:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">**** {contract.plCard.lastFourDigits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Status:</span>
                    <StatusBadge status={contract.plCard.issuanceStatus} type="disbursement" />
                  </div>
                  {contract.plCard.creditLimitCents && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Limite:</span>
                      <span className="text-slate-700 dark:text-slate-300">{formatCurrency(contract.plCard.creditLimitCents)}</span>
                    </div>
                  )}
                  {contract.plCard.issuedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Emitido:</span>
                      <span className="text-slate-700 dark:text-slate-300">{formatDate(contract.plCard.issuedAt)}</span>
                    </div>
                  )}
                </div>
              </ContentCard>
            )}
            {contract.tokenizedCard && (
              <ContentCard title="Cartão Tokenizado (Fallback)">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Final:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono">**** {contract.tokenizedCard.lastFourDigits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Bandeira:</span>
                    <span className="text-slate-700 dark:text-slate-300 uppercase">{contract.tokenizedCard.brand}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Status:</span>
                    <StatusBadge status={contract.tokenizedCard.tokenizationStatus} type="disbursement" />
                  </div>
                </div>
              </ContentCard>
            )}
          </div>
        </Section>
      )}

      {contract.disbursements.length > 0 && (
        <Section>
          <ContentCard title="Desembolsos FIDC">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {contract.disbursements.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-700 dark:text-slate-300 font-medium">{d.fund.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {d.disbursedAt ? formatDateTime(d.disbursedAt) : "Pendente"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-900 dark:text-white font-medium">{formatCurrency(d.totalAmountCents)}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-emerald-600 dark:text-emerald-400">Loja: {formatCurrency(d.merchantAmountCents)}</span>
                      <span className="text-cyan-600 dark:text-cyan-400">Escrow: {formatCurrency(d.escrowAmountCents)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>
        </Section>
      )}

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContentCard title="Parcelas do Contrato">
            <div className="space-y-3">
              {contract.installments.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm text-slate-700 dark:text-slate-300 font-medium shadow-sm shrink-0">
                    {inst.installmentNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-900 dark:text-white font-medium">
                        {formatCurrency(inst.amountCents)}
                      </span>
                      <StatusBadge status={inst.status} type="installment" />
                      {inst.origin === "external_capture" && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-200 dark:border-slate-700">
                          Gateway
                        </span>
                      )}
                      {inst.installmentNumber === 2 && (
                        <span className="text-xs px-2 py-0.5 bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800 rounded">
                          1ª Fatura PL
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Vence: {formatDate(inst.dueDate)}
                      {inst.paidAt && ` • Pago: ${formatDate(inst.paidAt)}`}
                      {inst.daysOverdue > 0 && ` • ${inst.daysOverdue}d atraso`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>

          <ContractTimeline events={events as any} />
        </div>
      </Section>
    </PageContainer>
  );
}

