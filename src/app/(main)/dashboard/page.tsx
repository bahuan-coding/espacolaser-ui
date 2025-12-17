import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { MetricCard } from "@/components/shared/ui/metric-card";
import { ContentCard } from "@/components/shared/ui/content-card";

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral da sua operação"
      />

      <Section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="Saldo Disponível"
            value="R$ 0,00"
          />
          <MetricCard
            label="A Receber"
            value="R$ 0,00"
            variant="success"
          />
          <MetricCard
            label="Antecipado"
            value="R$ 0,00"
            variant="info"
          />
        </div>
      </Section>

      <Section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContentCard
            title="Recebíveis"
            description="Evolução dos últimos 30 dias"
          >
            <div className="h-48 flex items-center justify-center text-slate-500">
              Gráfico em breve
            </div>
          </ContentCard>

          <ContentCard
            title="Últimos Movimentos"
            description="Transações recentes"
          >
            <div className="h-48 flex items-center justify-center text-slate-500">
              Lista em breve
            </div>
          </ContentCard>
        </div>
      </Section>
    </PageContainer>
  );
}
