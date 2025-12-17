export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getContractData(id: string) {
  return prisma.serviceContract.findUnique({
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
    },
  });
}

export default async function ContratoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const contract = await getContractData(id);

  if (!contract) {
    notFound();
  }

  const paidCount = contract.installments.filter((i) => i.status === "paid").length;
  const totalPaid = contract.installments
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + (i.paidAmountCents ?? i.amountCents), 0n);

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/contratos"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contratos
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{contract.contractNumber}</h1>
          <p className="text-slate-400 mt-1">{contract.description || "Contrato de serviço"}</p>
        </div>
        <StatusBadge status={contract.eligibilityStatus} type="eligibility" />
      </div>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContentCard title="Cliente">
            <div className="space-y-2">
              <p className="text-white font-medium">{contract.endCustomer.name}</p>
              <p className="text-sm text-slate-400">{contract.endCustomer.document}</p>
              {contract.endCustomer.email && (
                <p className="text-sm text-slate-500">{contract.endCustomer.email}</p>
              )}
            </div>
          </ContentCard>

          <ContentCard title="Valores">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Total:</span>
                <span className="text-white font-medium">{formatCurrency(contract.totalAmountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Pago:</span>
                <span className="text-emerald-400">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Parcelas:</span>
                <span className="text-slate-300">{paidCount}/{contract.numberOfInstallments}</span>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Período">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Início:</span>
                <span className="text-slate-300">{formatDate(contract.startDate)}</span>
              </div>
              {contract.endDate && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Fim:</span>
                  <span className="text-slate-300">{formatDate(contract.endDate)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Criado:</span>
                <span className="text-slate-300">{formatDate(contract.createdAt)}</span>
              </div>
            </div>
          </ContentCard>
        </div>
      </Section>

      {/* Cartões */}
      {(contract.plCard || contract.tokenizedCard) && (
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contract.plCard && (
              <ContentCard title="Cartão Private Label">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Final:</span>
                    <span className="text-slate-300">**** {contract.plCard.lastFourDigits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <StatusBadge status={contract.plCard.issuanceStatus} type="disbursement" />
                  </div>
                  {contract.plCard.issuedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Emitido:</span>
                      <span className="text-slate-300">{formatDate(contract.plCard.issuedAt)}</span>
                    </div>
                  )}
                </div>
              </ContentCard>
            )}
            {contract.tokenizedCard && (
              <ContentCard title="Cartão Tokenizado (Fallback)">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Final:</span>
                    <span className="text-slate-300">**** {contract.tokenizedCard.lastFourDigits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bandeira:</span>
                    <span className="text-slate-300 uppercase">{contract.tokenizedCard.brand}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <StatusBadge status={contract.tokenizedCard.tokenizationStatus} type="disbursement" />
                  </div>
                </div>
              </ContentCard>
            )}
          </div>
        </Section>
      )}

      {/* Desembolsos */}
      {contract.disbursements.length > 0 && (
        <Section>
          <ContentCard title="Desembolsos FIDC">
            <div className="divide-y divide-slate-800/50">
              {contract.disbursements.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-300">{d.fund.name}</p>
                    <p className="text-xs text-slate-500">
                      {d.disbursedAt ? formatDateTime(d.disbursedAt) : "Pendente"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCurrency(d.totalAmountCents)}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-emerald-400">Loja: {formatCurrency(d.merchantAmountCents)}</span>
                      <span className="text-cyan-400">Escrow: {formatCurrency(d.escrowAmountCents)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>
        </Section>
      )}

      {/* Timeline de Parcelas */}
      <Section>
        <ContentCard title="Timeline de Parcelas">
          <div className="space-y-3">
            {contract.installments.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-slate-800/30 border border-slate-800/50"
              >
                <div className="w-8 h-8 rounded-full bg-slate-700/50 flex items-center justify-center text-sm text-slate-300 font-medium">
                  {inst.installmentNumber}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-300 font-medium">
                      {formatCurrency(inst.amountCents)}
                    </span>
                    <StatusBadge status={inst.status} type="installment" />
                    {inst.origin === "external_capture" && (
                      <span className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                        Adquirente
                      </span>
                    )}
                    {inst.contributesToSubQuota && (
                      <span className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded">
                        Cota Sub
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Vence: {formatDate(inst.dueDate)}
                    {inst.paidAt && ` • Pago: ${formatDate(inst.paidAt)}`}
                    {inst.daysOverdue > 0 && ` • ${inst.daysOverdue} dias de atraso`}
                  </p>
                </div>
                {inst.paidAmountCents && inst.paidAmountCents !== inst.amountCents && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Pago</p>
                    <p className="text-sm text-emerald-400">{formatCurrency(inst.paidAmountCents)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ContentCard>
      </Section>
    </PageContainer>
  );
}

