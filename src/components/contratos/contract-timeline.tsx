import { 
  FileText, 
  Link, 
  CreditCard, 
  Smartphone, 
  Receipt,
  Banknote,
  Wallet,
  AlertTriangle,
  PhoneCall,
  CheckCircle
} from "lucide-react";
import { Timeline, TimelineEvent } from "@/components/shared/ui/timeline";
import { ContentCard } from "@/components/shared/ui/content-card";

interface DomainEvent {
  id: string;
  eventType: string;
  source: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

interface ContractTimelineProps {
  events: DomainEvent[];
}

const eventConfig: Record<string, { 
  title: string; 
  icon: React.ReactNode; 
  status: TimelineEvent["status"];
  getDescription?: (payload: Record<string, unknown>) => string | undefined;
}> = {
  "contract.created": {
    title: "Contrato Criado",
    icon: <FileText className="w-4 h-4" />,
    status: "default",
  },
  "gateway.payment_link.created": {
    title: "Link de Pagamento Gerado",
    icon: <Link className="w-4 h-4" />,
    status: "info",
  },
  "gateway.transaction.captured": {
    title: "Pagamento Confirmado",
    icon: <CreditCard className="w-4 h-4" />,
    status: "success",
    getDescription: (p) => p.amount ? `Valor: R$ ${(Number(p.amount) / 100).toFixed(2)}` : undefined,
  },
  "gateway.card.tokenized": {
    title: "Cartão Tokenizado",
    icon: <Smartphone className="w-4 h-4" />,
    status: "success",
  },
  "biz.pl_card.issued": {
    title: "Cartão Private Label Emitido",
    icon: <CreditCard className="w-4 h-4" />,
    status: "success",
  },
  "biz.pl_card.issuance_failed": {
    title: "Falha na Emissão do Cartão PL",
    icon: <AlertTriangle className="w-4 h-4" />,
    status: "danger",
  },
  "biz.installment.paid": {
    title: "Parcela Paga",
    icon: <Receipt className="w-4 h-4" />,
    status: "success",
  },
  "biz.installment.late": {
    title: "Parcela em Atraso",
    icon: <AlertTriangle className="w-4 h-4" />,
    status: "warning",
  },
  "biz.disbursement.eligible": {
    title: "Contrato Elegível para Antecipação",
    icon: <CheckCircle className="w-4 h-4" />,
    status: "success",
  },
  "a55.disbursement.requested": {
    title: "Antecipação Solicitada",
    icon: <Banknote className="w-4 h-4" />,
    status: "info",
  },
  "a55.disbursement.posted": {
    title: "Antecipação Efetivada",
    icon: <Banknote className="w-4 h-4" />,
    status: "success",
    getDescription: () => "Split 70% loja / 30% escrow",
  },
  "a55.escrow.credited": {
    title: "Crédito na Escrow",
    icon: <Wallet className="w-4 h-4" />,
    status: "info",
    getDescription: (p) => p.amount ? `Valor: R$ ${(Number(p.amount) / 100).toFixed(2)}` : undefined,
  },
  "a55.escrow.drawdown": {
    title: "Débito na Escrow",
    icon: <Wallet className="w-4 h-4" />,
    status: "warning",
  },
  "a55.fallback_charge.attempted": {
    title: "Tentativa de Cobrança (Token)",
    icon: <PhoneCall className="w-4 h-4" />,
    status: "info",
  },
  "a55.fallback_charge.success": {
    title: "Cobrança no Token - Sucesso",
    icon: <CheckCircle className="w-4 h-4" />,
    status: "success",
  },
  "a55.fallback_charge.failed": {
    title: "Cobrança no Token - Falhou",
    icon: <AlertTriangle className="w-4 h-4" />,
    status: "danger",
  },
};

export function ContractTimeline({ events }: ContractTimelineProps) {
  const timelineEvents: TimelineEvent[] = events.map((event) => {
    const config = eventConfig[event.eventType] || {
      title: event.eventType,
      icon: <FileText className="w-4 h-4" />,
      status: "default" as const,
    };

    return {
      id: event.id,
      title: config.title,
      description: config.getDescription?.(event.payload as Record<string, unknown>),
      timestamp: new Date(event.createdAt),
      icon: config.icon,
      status: config.status,
    };
  });

  // Sort by timestamp descending (most recent first)
  timelineEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <ContentCard 
      title="Histórico de Eventos" 
      description="Linha do tempo do contrato"
    >
      <Timeline 
        events={timelineEvents} 
        emptyMessage="Nenhum evento registrado ainda"
      />
    </ContentCard>
  );
}

