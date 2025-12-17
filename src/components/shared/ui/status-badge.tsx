import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted";

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-700/50 text-slate-300 border-slate-600",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  danger: "bg-red-500/10 text-red-400 border-red-500/30",
  info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  muted: "bg-slate-800/50 text-slate-500 border-slate-700",
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
  // Disbursement
  pending: "Pendente",
  posted: "Efetivado",
  reversed: "Estornado",
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
    variant = status === "posted" ? "success" : status === "reversed" ? "danger" : "default";
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

