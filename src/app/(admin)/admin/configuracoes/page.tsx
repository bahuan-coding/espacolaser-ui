import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";

export default function AdminConfiguracoesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Configurações"
        subtitle="Parâmetros do sistema"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContentCard title="Parâmetros de Split">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Split Loja</span>
                <span className="text-white font-medium">70%</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Split Escrow</span>
                <span className="text-white font-medium">30%</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Dias atraso (elegível)</span>
                <span className="text-white font-medium">≤ 60 dias</span>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Integrações">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">BIZ API</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded">Conectado</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Gateway</span>
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded">Conectado</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Securitizadora</span>
                <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded">Pendente</span>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Políticas de Drawdown">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Auto-drawdown</span>
                <span className="text-white font-medium">Habilitado</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Dias para drawdown</span>
                <span className="text-white font-medium">D+5 após atraso</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Limite drawdown</span>
                <span className="text-white font-medium">100% do saldo</span>
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Cobrança Fallback">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Tentativas</span>
                <span className="text-white font-medium">3x</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Intervalo</span>
                <span className="text-white font-medium">7 dias</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Valor mínimo</span>
                <span className="text-white font-medium">R$ 50,00</span>
              </div>
            </div>
          </ContentCard>
        </div>
      </Section>
    </PageContainer>
  );
}

