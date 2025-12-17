export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

async function getFundosData() {
  const funds = await prisma.fund.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { escrowAccounts: true, disbursements: true } },
      disbursements: {
        where: { status: "posted" },
        select: { totalAmountCents: true },
      },
      repayments: {
        select: { amountCents: true },
      },
    },
  });

  return funds.map((f) => ({
    ...f,
    totalDisbursed: f.disbursements.reduce((sum, d) => sum + d.totalAmountCents, 0n),
    totalRepaid: f.repayments.reduce((sum, r) => sum + r.amountCents, 0n),
  }));
}

export default async function FundosPage() {
  const funds = await getFundosData();

  const columns = [
    {
      key: "name",
      header: "Fundo",
      render: (f: typeof funds[0]) => (
        <div>
          <p className="text-white font-medium">{f.name}</p>
          <p className="text-xs text-slate-500">{f.document}</p>
        </div>
      ),
    },
    {
      key: "admin",
      header: "Admin / Gestor",
      render: (f: typeof funds[0]) => (
        <div>
          <p className="text-slate-300">{f.adminName || "-"}</p>
          <p className="text-xs text-slate-500">{f.managerName || "-"}</p>
        </div>
      ),
    },
    {
      key: "totalDisbursed",
      header: "Desembolsado",
      className: "text-right",
      render: (f: typeof funds[0]) => (
        <span className="text-emerald-400 font-medium">
          {formatCurrency(f.totalDisbursed)}
        </span>
      ),
    },
    {
      key: "totalRepaid",
      header: "Repago",
      className: "text-right",
      render: (f: typeof funds[0]) => (
        <span className="text-cyan-400 font-medium">
          {formatCurrency(f.totalRepaid)}
        </span>
      ),
    },
    {
      key: "escrowAccounts",
      header: "Escrows",
      className: "text-center",
      render: (f: typeof funds[0]) => (
        <span className="text-slate-300">{f._count.escrowAccounts}</span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (f: typeof funds[0]) => (
        <StatusBadge
          status={f.isActive ? "paid" : "cancelled"}
          type="installment"
          showLabel={false}
        />
      ),
    },
  ];

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Fundos FIDC"
          subtitle="Gestão de fundos e parâmetros"
        />
        <button className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-sm hover:bg-violet-500/30 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Fundo
        </button>
      </div>

      <Section>
        <DataTable
          columns={columns}
          data={funds}
          keyExtractor={(f) => f.id}
          emptyMessage="Nenhum fundo cadastrado"
        />
      </Section>
    </PageContainer>
  );
}

