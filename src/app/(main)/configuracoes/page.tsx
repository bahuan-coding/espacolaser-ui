export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

async function getMerchantData() {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
    include: {
      users: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
      },
      escrowAccounts: {
        where: { isActive: true },
        include: {
          fund: { select: { name: true } },
        },
      },
    },
  });

  return merchant;
}

export default async function ConfiguracoesPage() {
  const merchant = await getMerchantData();

  if (!merchant) {
    return (
      <PageContainer>
        <PageHeader title="Configurações" subtitle="Gerencie sua conta e preferências" />
        <Section>
          <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-2xl">
            <p className="text-slate-400">Nenhum merchant encontrado.</p>
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        subtitle="Gerencie sua conta e preferências"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContentCard title="Dados da Empresa">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Nome</span>
                <span className="text-white font-medium">{merchant.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">CNPJ</span>
                <span className="text-white font-mono">{merchant.document}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Email</span>
                <span className="text-white">{merchant.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Telefone</span>
                <span className="text-white">{merchant.phone || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Endereço</span>
                <span className="text-white">{merchant.address || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Cidade/UF</span>
                <span className="text-white">
                  {merchant.city && merchant.state 
                    ? `${merchant.city} - ${merchant.state}` 
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Cadastrado em</span>
                <span className="text-slate-300">{formatDate(merchant.createdAt)}</span>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Usuários">
            <div className="space-y-3">
              {merchant.users.length === 0 ? (
                <p className="text-slate-500 py-4 text-center">Nenhum usuário cadastrado</p>
              ) : (
                merchant.users.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800/50"
                  >
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.role === "admin" 
                        ? "bg-violet-500/10 text-violet-400 border border-violet-500/30"
                        : "bg-slate-700/50 text-slate-400 border border-slate-600"
                    }`}>
                      {user.role === "admin" ? "Admin" : user.role === "operator" ? "Operador" : "Viewer"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </ContentCard>

          <ContentCard title="Contas Escrow Vinculadas">
            <div className="space-y-3">
              {merchant.escrowAccounts.length === 0 ? (
                <p className="text-slate-500 py-4 text-center">Nenhuma conta escrow vinculada</p>
              ) : (
                merchant.escrowAccounts.map((account) => (
                  <div 
                    key={account.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-800/50"
                  >
                    <div>
                      <p className="text-white font-medium">{account.fund.name}</p>
                      <p className="text-xs text-slate-500">ID: {account.id.slice(0, 12)}...</p>
                    </div>
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/30">
                      Ativa
                    </span>
                  </div>
                ))
              )}
            </div>
          </ContentCard>

          <ContentCard title="Preferências">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Notificações por Email</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded">Ativado</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Alertas de Atraso</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded">Ativado</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Relatórios Mensais</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded">Ativado</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Moeda</span>
                <span className="text-white font-medium">BRL (R$)</span>
              </div>
            </div>
          </ContentCard>
        </div>
      </Section>

      <Section>
        <ContentCard title="Parâmetros do Contrato">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Split Loja</p>
              <p className="text-2xl font-bold text-emerald-400">70%</p>
              <p className="text-xs text-slate-500 mt-1">Recebimento imediato</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Split Escrow</p>
              <p className="text-2xl font-bold text-cyan-400">30%</p>
              <p className="text-xs text-slate-500 mt-1">Retido como garantia</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Elegibilidade</p>
              <p className="text-2xl font-bold text-white">≤ 60 dias</p>
              <p className="text-xs text-slate-500 mt-1">Atraso máximo tolerado</p>
            </div>
          </div>
        </ContentCard>
      </Section>
    </PageContainer>
  );
}
