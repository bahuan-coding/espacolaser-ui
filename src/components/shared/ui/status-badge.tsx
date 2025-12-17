import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 border-slate-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-cyan-50 text-cyan-700 border-cyan-200",
  muted: "bg-slate-50 text-slate-500 border-slate-200",
};

// Mappings for common status values
const installmentStatusVariant: Record<string, BadgeVariant> = {
  scheduled: "default",
  paid: "success",
  late: "warning",
  defaulted: "danger",
  cancelled: "muted",
};

const eligibilityStatusVariant: Record<string, BadgeVariant> = {
  pending_first_installment: "muted",
  pending_second_installment: "default",
  eligible: "success",
  eligible_late: "warning",
  ineligible: "danger",
  disbursed: "info",
};

const ledgerEntryVariant: Record<string, BadgeVariant> = {
  credit: "success",
  debit: "danger",
};

const statusLabels: Record<string, string> = {
  // Installment
  scheduled: "Agendado",
  paid: "Pago",
  late: "Atrasado",
  defaulted: "Inadimplente",
  cancelled: "Cancelado",
  // Eligibility
  pending_first_installment: "Aguardando 1ª",
  pending_second_installment: "Aguardando 2ª",
  eligible: "Elegível",
  eligible_late: "Elegível (atraso)",
  ineligible: "Inelegível",
  disbursed: "Desembolsado",
  // Ledger
  credit: "Crédito",
  debit: "Débito",
  // Disbursement / PL Card
  pending: "Pendente",
  posted: "Efetivado",
  reversed: "Estornado",
  issued: "Emitido",
  failed: "Falhou",
  blocked: "Bloqueado",
  // Tokenization
  success: "Sucesso",
  expired: "Expirado",
};

interface StatusBadgeProps {
  status: string;
  type?: "installment" | "eligibility" | "ledger" | "disbursement";
  className?: string;
  showLabel?: boolean;
}

export function StatusBadge({
  status,
  type = "installment",
  className,
  showLabel = true,
}: StatusBadgeProps) {
  let variant: BadgeVariant = "default";

  if (type === "installment") {
    variant = installmentStatusVariant[status] || "default";
  } else if (type === "eligibility") {
    variant = eligibilityStatusVariant[status] || "default";
  } else if (type === "ledger") {
    variant = ledgerEntryVariant[status] || "default";
  } else if (type === "disbursement") {
    if (status === "posted" || status === "issued" || status === "success") {
      variant = "success";
    } else if (status === "reversed" || status === "failed" || status === "blocked") {
      variant = "danger";
    } else if (status === "expired") {
      variant = "warning";
    } else {
      variant = "default";
    }
  }

  const label = showLabel ? (statusLabels[status] || status) : status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

