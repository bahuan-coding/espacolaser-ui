export const dynamic = "force-dynamic";

import Link from "next/link";
import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

async function getMerchantsData() {
  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { serviceContracts: true, users: true } },
      escrowAccounts: {
        where: { isActive: true },
        select: { balanceCents: true },
      },
      serviceContracts: {
        select: { totalAmountCents: true, eligibilityStatus: true },
      },
    },
  });

  return merchants.map((m) => ({
    ...m,
    escrowBalance: m.escrowAccounts.reduce((sum, a) => sum + a.balanceCents, 0n),
    totalContractValue: m.serviceContracts.reduce((sum, c) => sum + c.totalAmountCents, 0n),
    disbursedCount: m.serviceContracts.filter((c) => c.eligibilityStatus === "disbursed").length,
  }));
}

export default async function MerchantsPage() {
  const merchants = await getMerchantsData();

  const columns = [
    {
      key: "name",
      header: "Lojista",
      render: (m: typeof merchants[0]) => (
        <div>
          <p className="text-white font-medium">{m.name}</p>
          <p className="text-xs text-slate-500">{m.document}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contato",
      render: (m: typeof merchants[0]) => (
        <div>
          <p className="text-slate-300">{m.email}</p>
          <p className="text-xs text-slate-500">{m.phone || "-"}</p>
        </div>
      ),
    },
    {
      key: "contracts",
      header: "Contratos",
      className: "text-center",
      render: (m: typeof merchants[0]) => (
        <div>
          <p className="text-slate-300">{m._count.serviceContracts}</p>
          <p className="text-xs text-slate-500">{m.disbursedCount} antecipados</p>
        </div>
      ),
    },
    {
      key: "escrowBalance",
      header: "Saldo Escrow",
      className: "text-right",
      render: (m: typeof merchants[0]) => (
        <span className={`font-medium ${m.escrowBalance > 0n ? "text-emerald-400" : "text-slate-400"}`}>
          {formatCurrency(m.escrowBalance)}
        </span>
      ),
    },
    {
      key: "totalContractValue",
      header: "Volume",
      className: "text-right",
      render: (m: typeof merchants[0]) => (
        <span className="text-slate-300">
          {formatCurrency(m.totalContractValue)}
        </span>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (m: typeof merchants[0]) => (
        <StatusBadge
          status={m.isActive ? "paid" : "cancelled"}
          type="installment"
          showLabel={false}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Cadastro",
      render: (m: typeof merchants[0]) => (
        <span className="text-slate-500 text-sm">{formatDate(m.createdAt)}</span>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Lojistas"
        subtitle="Gestão de merchants cadastrados"
      />

      <Section>
        <DataTable
          columns={columns}
          data={merchants}
          keyExtractor={(m) => m.id}
          emptyMessage="Nenhum lojista cadastrado"
        />
      </Section>
    </PageContainer>
  );
}

