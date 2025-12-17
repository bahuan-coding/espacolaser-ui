export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { ContractActions } from "@/components/contratos/contract-actions";
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

  // Get domain events for this contract
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

export default async function ContratoDetailPage({ params }: PageProps) {
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

  const firstInstallment = contract.installments.find((i) => i.installmentNumber === 1);
  const hasPaymentLink = contract.gatewayTransactions.length > 0;
  const paymentLink = contract.gatewayTransactions[0]?.paymentLink;

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/contratos"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contratos
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{contract.contractNumber}</h1>
          <p className="text-slate-500 mt-1">{contract.description || "Contrato de serviço"}</p>
        </div>
        <StatusBadge status={contract.eligibilityStatus} type="eligibility" />
      </div>

      {/* Contract Actions - Most important section */}
      <Section>
        <ContractActions
          contractId={contract.id}
          contractNumber={contract.contractNumber}
          eligibilityStatus={contract.eligibilityStatus}
          totalAmountCents={contract.totalAmountCents}
          firstInstallmentAmountCents={firstInstallment?.amountCents ?? 0n}
          hasPaymentLink={hasPaymentLink}
          paymentLink={paymentLink}
        />
      </Section>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ContentCard title="Cliente">
            <div className="space-y-2">
              <p className="text-slate-900 font-medium">{contract.endCustomer.name}</p>
              <p className="text-sm text-slate-600 font-mono">{contract.endCustomer.document}</p>
              {contract.endCustomer.email && (
                <p className="text-sm text-slate-500">{contract.endCustomer.email}</p>
              )}
              {contract.endCustomer.phone && (
                <p className="text-sm text-slate-500">{contract.endCustomer.phone}</p>
              )}
            </div>
          </ContentCard>

          <ContentCard title="Valores">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Total:</span>
                <span className="text-slate-900 font-medium">{formatCurrency(contract.totalAmountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pago:</span>
                <span className="text-emerald-600 font-medium">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Parcelas:</span>
                <span className="text-slate-700">{paidCount}/{contract.numberOfInstallments}</span>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Período">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Início:</span>
                <span className="text-slate-700">{formatDate(contract.startDate)}</span>
              </div>
              {contract.endDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Fim:</span>
                  <span className="text-slate-700">{formatDate(contract.endDate)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Criado:</span>
                <span className="text-slate-700">{formatDate(contract.createdAt)}</span>
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
                    <span className="text-slate-500">Final:</span>
                    <span className="text-slate-700 font-mono">**** {contract.plCard.lastFourDigits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status:</span>
                    <StatusBadge status={contract.plCard.issuanceStatus} type="disbursement" />
                  </div>
                  {contract.plCard.creditLimitCents && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Limite:</span>
                      <span className="text-slate-700">{formatCurrency(contract.plCard.creditLimitCents)}</span>
                    </div>
                  )}
                  {contract.plCard.issuedAt && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Emitido:</span>
                      <span className="text-slate-700">{formatDate(contract.plCard.issuedAt)}</span>
                    </div>
                  )}
                </div>
              </ContentCard>
            )}
            {contract.tokenizedCard && (
              <ContentCard title="Cartão Tokenizado (Fallback)">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Final:</span>
                    <span className="text-slate-700 font-mono">**** {contract.tokenizedCard.lastFourDigits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Bandeira:</span>
                    <span className="text-slate-700 uppercase">{contract.tokenizedCard.brand}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Status:</span>
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
            <div className="divide-y divide-slate-100">
              {contract.disbursements.map((d) => (
                <div key={d.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-slate-700 font-medium">{d.fund.name}</p>
                    <p className="text-xs text-slate-500">
                      {d.disbursedAt ? formatDateTime(d.disbursedAt) : "Pendente"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-900 font-medium">{formatCurrency(d.totalAmountCents)}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-emerald-600">Loja: {formatCurrency(d.merchantAmountCents)}</span>
                      <span className="text-cyan-600">Escrow: {formatCurrency(d.escrowAmountCents)}</span>
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
          {/* Timeline de Parcelas */}
          <ContentCard title="Parcelas do Contrato">
            <div className="space-y-3">
              {contract.installments.map((inst) => (
                <div
                  key={inst.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm text-slate-700 font-medium shadow-sm shrink-0">
                    {inst.installmentNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-900 font-medium">
                        {formatCurrency(inst.amountCents)}
                      </span>
                      <StatusBadge status={inst.status} type="installment" />
                      {inst.origin === "external_capture" && (
                        <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                          Gateway
                        </span>
                      )}
                      {inst.installmentNumber === 2 && (
                        <span className="text-xs px-2 py-0.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded">
                          1ª Fatura PL
                        </span>
                      )}
                      {inst.contributesToSubQuota && (
                        <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded">
                          Cota Sub
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Vence: {formatDate(inst.dueDate)}
                      {inst.paidAt && ` • Pago: ${formatDate(inst.paidAt)}`}
                      {inst.daysOverdue > 0 && ` • ${inst.daysOverdue}d atraso`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>

          {/* Histórico de Eventos */}
          <ContractTimeline events={events as any} />
        </div>
      </Section>
    </PageContainer>
  );
}

