export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { MerchantEditForm } from "./edit-form";

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
        title="Configurações"
        subtitle="Gerencie sua conta e preferências"
      />

      <Section>
        <ContentCard title="Editar Dados de Contato">
          <MerchantEditForm 
            merchantId={merchant.id}
            initialData={{
              email: merchant.email,
              phone: merchant.phone,
              address: merchant.address,
              city: merchant.city,
              state: merchant.state,
              zipCode: merchant.zipCode,
            }}
          />
        </ContentCard>
      </Section>

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContentCard title="Dados da Empresa">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Nome</span>
                <span className="text-slate-900 font-medium">{merchant.name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">CNPJ</span>
                <span className="text-slate-900 font-mono">{merchant.document}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-900">{merchant.email}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Telefone</span>
                <span className="text-slate-900">{merchant.phone || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Endereço</span>
                <span className="text-slate-900">{merchant.address || "-"}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Cidade/UF</span>
                <span className="text-slate-900">
                  {merchant.city && merchant.state 
                    ? `${merchant.city} - ${merchant.state}` 
                    : "-"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Cadastrado em</span>
                <span className="text-slate-700">{formatDate(merchant.createdAt)}</span>
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
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <p className="text-slate-900 font-medium">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      user.role === "admin" 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
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
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100"
                  >
                    <div>
                      <p className="text-slate-900 font-medium">{account.fund.name}</p>
                      <p className="text-xs text-slate-500 font-mono">ID: {account.id.slice(0, 12)}...</p>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium border border-emerald-200">
                      Ativa
                    </span>
                  </div>
                ))
              )}
            </div>
          </ContentCard>

          <ContentCard title="Preferências">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Notificações por Email</span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium border border-emerald-200">Ativado</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Alertas de Atraso</span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium border border-emerald-200">Ativado</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Relatórios Mensais</span>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium border border-emerald-200">Ativado</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-500">Moeda</span>
                <span className="text-slate-900 font-medium">BRL (R$)</span>
              </div>
              <p className="text-xs text-slate-400 pt-2">
                Para alterar preferências, entre em contato com o suporte.
              </p>
            </div>
          </ContentCard>
        </div>
      </Section>

      <Section>
        <ContentCard title="Parâmetros do Contrato">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium mb-1">Split Loja</p>
              <p className="text-2xl font-bold text-emerald-700">70%</p>
              <p className="text-xs text-emerald-600/70 mt-1">Recebimento imediato</p>
            </div>
            <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-100">
              <p className="text-xs text-cyan-600 uppercase tracking-wide font-medium mb-1">Split Escrow</p>
              <p className="text-2xl font-bold text-cyan-700">30%</p>
              <p className="text-xs text-cyan-600/70 mt-1">Retido como garantia</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Elegibilidade</p>
              <p className="text-2xl font-bold text-slate-900">≤ 60 dias</p>
              <p className="text-xs text-slate-500 mt-1">Atraso máximo tolerado</p>
            </div>
          </div>
        </ContentCard>
      </Section>
    </PageContainer>
  );
}
