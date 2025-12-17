export const dynamic = "force-dynamic";

import { PageContainer } from "@/components/shared/layout/page-container";
import { PageHeader } from "@/components/shared/layout/page-header";
import { Section } from "@/components/shared/layout/section";
import { BaixaForm } from "./baixa-form";

interface PageProps {
  searchParams: Promise<{ installmentId?: string; paymentId?: string }>;
}

export default async function BaixasPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <PageContainer>
      <PageHeader
        title="Baixa Manual"
        subtitle="Registrar pagamento manual de parcela"
      />

      <Section>
        <BaixaForm
          preSelectedInstallmentId={params.installmentId}
          linkPaymentId={params.paymentId}
        />
      </Section>
    </PageContainer>
  );
}

