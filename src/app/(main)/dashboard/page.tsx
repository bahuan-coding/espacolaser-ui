export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, AlertTriangle, Banknote, HelpCircle } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { ContentCard } from "@/components/shared/ui/content-card";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { AlertCard } from "@/components/shared/ui/alert-card";
import { CustomAreaChart } from "@/components/charts/area-chart";
import { CustomPieChart } from "@/components/charts/pie-chart";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, formatDate } from "@/lib/utils";

async function getDashboardData() {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
  });

  if (!merchant) return null;

  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    escrowAccount,
    disbursements,
    lateInstallments,
    recentLedger,
    eligibleContracts,
    upcomingInstallments,
    contractStats,
    historicalLedger,
  ] = await Promise.all([
    prisma.escrowAccount.findFirst({
      where: { merchantId: merchant.id, isActive: true },
      select: { id: true, balanceCents: true },
    }),
    prisma.fundDisbursement.aggregate({
      where: {
        contract: { merchantId: merchant.id },
        status: "posted",
      },
      _sum: {
        totalAmountCents: true,
        merchantAmountCents: true,
        escrowAmountCents: true,
      },
    }),
    prisma.contractInstallment.findMany({
      where: {
        contract: { merchantId: merchant.id },
        status: { in: ["late", "defaulted"] },
      },
      take: 5,
      orderBy: { dueDate: "asc" },
      include: {
        contract: {
          select: { id: true, contractNumber: true, endCustomer: { select: { name: true } } },
        },
      },
    }),
    prisma.escrowLedgerEntry.findMany({
      where: { escrowAccount: { merchantId: merchant.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.serviceContract.findMany({
      where: {
        merchantId: merchant.id,
        eligibilityStatus: { in: ["eligible", "eligible_late"] },
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
      include: {
        endCustomer: { select: { name: true } },
        installments: { where: { installmentNumber: 1 }, select: { amountCents: true } },
      },
    }),
    prisma.contractInstallment.findMany({
      where: {
        contract: { merchantId: merchant.id },
        status: "scheduled",
        dueDate: { gte: today, lte: in7Days },
      },
      take: 5,
      orderBy: { dueDate: "asc" },
      include: {
        contract: {
          select: { id: true, contractNumber: true, endCustomer: { select: { name: true } } },
        },
      },
    }),
    prisma.serviceContract.groupBy({
      by: ["eligibilityStatus"],
      where: { merchantId: merchant.id },
      _count: true,
    }),
    prisma.escrowLedgerEntry.findMany({
      where: {
        escrowAccount: { merchantId: merchant.id },
        createdAt: { gte: last30Days },
      },
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        balanceAfterCents: true,
        entryType: true,
        amountCents: true,
      },
    }),
  ]);

  const lateTotal = lateInstallments.reduce((sum, i) => sum + i.amountCents, 0n);

  const statsMap = contractStats.reduce((acc, s) => {
    acc[s.eligibilityStatus] = s._count;
    return acc;
  }, {} as Record<string, number>);

  // Prepare chart data - aggregate by day
  const chartDataMap = new Map<string, { date: string; balance: number; credits: number; debits: number }>();
  
  historicalLedger.forEach((entry) => {
    const date = entry.createdAt.toISOString().split("T")[0];
    const existing = chartDataMap.get(date) || { date, balance: 0, credits: 0, debits: 0 };
    
    if (entry.entryType === "credit") {
      existing.credits += Number(entry.amountCents);
    } else {
      existing.debits += Number(entry.amountCents);
    }
    existing.balance = Number(entry.balanceAfterCents);
    chartDataMap.set(date, existing);
  });

  const chartData = Array.from(chartDataMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      name: new Date(d.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      saldo: Number(d.balance) / 100,
      creditos: Number(d.credits) / 100,
      debitos: Number(d.debits) / 100,
    }));

  // Distribution chart data
  const distributionData = [
    { name: "Elegíveis", value: (statsMap["eligible"] ?? 0) + (statsMap["eligible_late"] ?? 0) },
    { name: "Pendentes", value: (statsMap["pending_first_installment"] ?? 0) + (statsMap["pending_second_installment"] ?? 0) },
    { name: "Desembolsados", value: statsMap["disbursed"] ?? 0 },
    { name: "Inelegíveis", value: statsMap["ineligible"] ?? 0 },
  ].filter((d) => d.value > 0);

  return {
    merchant,
    escrowBalance: escrowAccount?.balanceCents ?? 0n,
    disbursements: {
      total: disbursements._sum.totalAmountCents ?? 0n,
      merchant: disbursements._sum.merchantAmountCents ?? 0n,
      escrow: disbursements._sum.escrowAmountCents ?? 0n,
    },
    lateInstallments: {
      items: lateInstallments,
      count: lateInstallments.length,
      total: lateTotal,
    },
    recentLedger,
    eligibleContracts,
    upcomingInstallments,
    contractStats: {
      eligible: (statsMap["eligible"] ?? 0) + (statsMap["eligible_late"] ?? 0),
      pending: (statsMap["pending_first_installment"] ?? 0) + (statsMap["pending_second_installment"] ?? 0),
      disbursed: statsMap["disbursed"] ?? 0,
      ineligible: statsMap["ineligible"] ?? 0,
    },
    chartData,
    distributionData,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <PageContainer>
        <PageHeader title="Dashboard" subtitle="Visão geral da sua operação" />
        <Section>
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <p className="text-slate-500">Nenhum merchant encontrado.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle={`Visão geral - ${data.merchant.name}`}
      />

      {/* Alerts Section */}
      {(data.lateInstallments.count > 0 || data.eligibleContracts.length > 0) && (
        <Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.lateInstallments.count > 0 && (
              <AlertCard
                title={`${data.lateInstallments.count} parcela(s) em atraso`}
                description={`Total: ${formatCurrency(data.lateInstallments.total)} - Atenção às cobranças pendentes.`}
                variant="warning"
                action={{ label: "Ver detalhes", href: "/boletos?status=late" }}
              />
            )}
            {data.eligibleContracts.length > 0 && (
              <AlertCard
                title={`${data.eligibleContracts.length} contrato(s) elegível(eis)`}
                description="Você pode solicitar antecipação agora e receber 70% do valor."
                variant="success"
                action={{ label: "Ver contratos", href: "/contratos?status=eligible" }}
              />
            )}
          </div>
        </Section>
      )}

      {/* Metrics */}
      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Saldo Escrow"
            value={formatCurrency(data.escrowBalance)}
            description="Retido como garantia (30%)"
          />
          <MetricCard
            label="Recebido (70%)"
            value={formatCurrency(data.disbursements.merchant)}
            variant="success"
            description="Total desembolsado"
          />
          <MetricCard
            label="Elegíveis"
            value={data.contractStats.eligible.toString()}
            variant="info"
            description="Prontos para antecipação"
          />
          <MetricCard
            label="Em Atraso"
            value={formatCurrency(data.lateInstallments.total)}
            description={`${data.lateInstallments.count} parcela(s)`}
          />
        </div>
      </Section>

      {/* How it works - Microcopy */}
      <Section>
        <div className="p-4 bg-gradient-to-r from-slate-50 to-cyan-50 dark:from-slate-800/50 dark:to-cyan-900/20 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Como funciona a Antecipação?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Quando seu cliente paga a <strong>1ª fatura do Cartão PL</strong> (2ª parcela do contrato), 
                o contrato fica <strong>elegível para antecipação</strong>. Você recebe <strong>70%</strong> do 
                valor restante e <strong>30%</strong> fica em escrow como garantia.
              </p>
              <Link 
                href="/contratos" 
                className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-cyan-700 hover:text-cyan-900 transition-colors"
              >
                Ver meus contratos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </Section>

      {/* Charts Section */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContentCard
            title="Evolução do Saldo Escrow"
            description="Últimos 30 dias"
          >
            {data.chartData.length > 0 ? (
              <CustomAreaChart
                data={data.chartData}
                dataKey="saldo"
                color="#10b981"
                height={250}
              />
            ) : (
              <p className="text-slate-500 dark:text-slate-400 py-4 text-center">Sem dados históricos</p>
            )}
          </ContentCard>

          <ContentCard
            title="Distribuição de Contratos"
            description="Por status de elegibilidade"
          >
            {data.distributionData.length > 0 ? (
              <CustomPieChart
                data={data.distributionData}
                height={250}
              />
            ) : (
              <p className="text-slate-500 dark:text-slate-400 py-4 text-center">Sem contratos</p>
            )}
          </ContentCard>
        </div>
      </Section>

      {/* Main Content */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Eligible Contracts */}
          <ContentCard
            title="Contratos Elegíveis"
            description="Prontos para solicitar antecipação"
          >
            {data.eligibleContracts.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 py-4">Nenhum contrato elegível no momento</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.eligibleContracts.map((contract) => {
                  const firstInstallment = contract.installments[0]?.amountCents ?? 0n;
                  const remaining = contract.totalAmountCents - firstInstallment;
                  const merchantAmount = (remaining * 70n) / 100n;

                  return (
                    <Link
                      key={contract.id}
                      href={`/contratos/${contract.id}`}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-sm text-slate-900 dark:text-slate-100 font-medium">
                          {contract.endCustomer.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{contract.contractNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-600 font-medium">
                          +{formatCurrency(merchantAmount)}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">a receber</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
            {data.contractStats.eligible > 5 && (
              <Link
                href="/contratos?status=eligible"
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                Ver todos ({data.contractStats.eligible}) <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </ContentCard>

          {/* Late Installments */}
          <ContentCard
            title="Parcelas em Atraso"
            description="Requerem atenção"
          >
            {data.lateInstallments.count === 0 ? (
              <div className="py-4 text-center">
                <p className="text-emerald-600 font-medium">Tudo em dia!</p>
                <p className="text-sm text-slate-500 mt-1">Nenhuma parcela atrasada</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.lateInstallments.items.map((inst) => (
                  <Link
                    key={inst.id}
                    href={`/contratos/${inst.contract.id}`}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-sm text-slate-900 dark:text-slate-100">{inst.contract.endCustomer.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Parcela {inst.installmentNumber} • {inst.daysOverdue}d atraso
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-red-600 font-medium">
                        {formatCurrency(inst.amountCents)}
                      </p>
                      <StatusBadge status={inst.status} type="installment" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </ContentCard>
        </div>
      </Section>

      {/* Recent Ledger & Upcoming */}
      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContentCard
            title="Últimas Movimentações"
            description="Extrato escrow recente"
          >
            {data.recentLedger.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 py-4">Nenhuma movimentação</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentLedger.map((entry) => (
                  <div key={entry.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={entry.entryType} type="ledger" />
                      <div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {entry.description || entry.referenceType || "Movimentação"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${
                      entry.entryType === "credit" ? "text-emerald-600" : "text-red-600"
                    }`}>
                      {entry.entryType === "credit" ? "+" : "-"}
                      {formatCurrency(entry.amountCents)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <Link
              href="/extrato"
              className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Ver extrato completo <ArrowRight className="w-4 h-4" />
            </Link>
          </ContentCard>

          <ContentCard
            title="Próximos Vencimentos"
            description="Parcelas vencendo em 7 dias"
          >
            {data.upcomingInstallments.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 py-4">Nenhuma parcela vencendo esta semana</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.upcomingInstallments.map((inst) => (
                  <Link
                    key={inst.id}
                    href={`/contratos/${inst.contract.id}`}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div>
                      <p className="text-sm text-slate-900 dark:text-slate-100">{inst.contract.endCustomer.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Parcela {inst.installmentNumber} • Vence {formatDate(inst.dueDate)}
                      </p>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                      {formatCurrency(inst.amountCents)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </ContentCard>
        </div>
      </Section>
    </PageContainer>
  );
}
