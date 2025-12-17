export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SimulatorActions } from "./simulator-actions";

async function getSimulatorData() {
  const [contracts, recentEvents, stats] = await Promise.all([
    prisma.serviceContract.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        endCustomer: { select: { name: true } },
        merchant: { select: { name: true } },
        installments: {
          orderBy: { installmentNumber: "asc" },
          select: {
            id: true,
            installmentNumber: true,
            amountCents: true,
            status: true,
            dueDate: true,
            paidAt: true,
            daysOverdue: true,
          },
        },
        disbursements: { where: { status: "posted" }, select: { id: true } },
      },
    }),
    prisma.domainEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.$transaction([
      prisma.contractInstallment.count({ where: { status: "scheduled" } }),
      prisma.contractInstallment.count({ where: { status: "paid" } }),
      prisma.contractInstallment.count({ where: { status: "late" } }),
      prisma.contractInstallment.count({ where: { status: "defaulted" } }),
      prisma.escrowDrawdown.count(),
      prisma.tokenizedCardCharge.count(),
    ]),
  ]);

  return {
    contracts,
    recentEvents,
    stats: {
      scheduled: stats[0],
      paid: stats[1],
      late: stats[2],
      defaulted: stats[3],
      drawdowns: stats[4],
      chargeAttempts: stats[5],
    },
  };
}

export default async function SimuladorPage() {
  const data = await getSimulatorData();

  return (
    <PageContainer>
      <PageHeader
        title="Simulador de Eventos"
        subtitle="Teste fluxos de negócio em tempo real"
      />

      <Section>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-xl text-center">
            <p className="text-2xl font-bold text-slate-300">{data.stats.scheduled}</p>
            <p className="text-xs text-slate-500">Agendadas</p>
          </div>
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
            <p className="text-2xl font-bold text-emerald-400">{data.stats.paid}</p>
            <p className="text-xs text-slate-500">Pagas</p>
          </div>
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
            <p className="text-2xl font-bold text-amber-400">{data.stats.late}</p>
            <p className="text-xs text-slate-500">Atrasadas</p>
          </div>
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
            <p className="text-2xl font-bold text-red-400">{data.stats.defaulted}</p>
            <p className="text-xs text-slate-500">Inadimplentes</p>
          </div>
          <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl text-center">
            <p className="text-2xl font-bold text-violet-400">{data.stats.drawdowns}</p>
            <p className="text-xs text-slate-500">Drawdowns</p>
          </div>
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-center">
            <p className="text-2xl font-bold text-cyan-400">{data.stats.chargeAttempts}</p>
            <p className="text-xs text-slate-500">Cobranças</p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Contracts List */}
          <ContentCard
            title="Contratos para Simulação"
            description="Selecione um contrato e parcela para testar"
          >
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {data.contracts.map((contract) => (
                <div
                  key={contract.id}
                  className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-medium">{contract.contractNumber}</p>
                      <p className="text-xs text-slate-500">
                        {contract.endCustomer.name} • {contract.merchant.name}
                      </p>
                    </div>
                    <StatusBadge status={contract.eligibilityStatus} type="eligibility" />
                  </div>

                  <div className="space-y-2">
                    {contract.installments.map((inst) => (
                      <div
                        key={inst.id}
                        className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg"
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-700/50 flex items-center justify-center text-xs text-slate-400">
                          {inst.installmentNumber}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300">
                              {formatCurrency(inst.amountCents)}
                            </span>
                            <StatusBadge status={inst.status} type="installment" />
                          </div>
                          <p className="text-xs text-slate-500">
                            Vence: {formatDate(inst.dueDate)}
                            {inst.daysOverdue > 0 && ` • ${inst.daysOverdue}d atraso`}
                          </p>
                        </div>
                        <SimulatorActions
                          installmentId={inst.id}
                          status={inst.status}
                          hasDisbursement={contract.disbursements.length > 0}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ContentCard>

          {/* Recent Events */}
          <ContentCard
            title="Eventos Recentes"
            description="Últimos eventos processados"
          >
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {data.recentEvents.length === 0 ? (
                <p className="text-slate-500 py-8 text-center">
                  Nenhum evento registrado ainda
                </p>
              ) : (
                data.recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        {event.eventType}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          event.status === "delivered"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : event.status === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {event.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{event.source}</span>
                      <span>→</span>
                      <span>{event.target || "—"}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-mono truncate">
                      {JSON.stringify(event.payload)}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700">
              <SimulatorActions isGlobal />
            </div>
          </ContentCard>
        </div>
      </Section>
    </PageContainer>
  );
}

