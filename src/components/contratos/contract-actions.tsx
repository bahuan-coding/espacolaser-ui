"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Link as LinkIcon, 
  CreditCard, 
  Banknote, 
  FileText,
  Check,
  Copy,
  ExternalLink,
  AlertCircle
} from "lucide-react";
import { ActionButton } from "@/components/shared/ui/action-button";
import { AlertCard } from "@/components/shared/ui/alert-card";
import { ContentCard } from "@/components/shared/ui/content-card";
import { 
  generatePaymentLink, 
  confirmPayment, 
  simulateSecondPayment,
  requestAdvance 
} from "@/app/(main)/contratos/actions";
import { formatCurrency } from "@/lib/utils";

type EligibilityStatus = 
  | "pending_first_installment"
  | "pending_second_installment"
  | "eligible"
  | "eligible_late"
  | "ineligible"
  | "disbursed";

interface ContractActionsProps {
  contractId: string;
  contractNumber: string;
  eligibilityStatus: EligibilityStatus;
  totalAmountCents: bigint;
  firstInstallmentAmountCents: bigint;
  hasPaymentLink: boolean;
  paymentLink?: string | null;
}

const statusInfo: Record<EligibilityStatus, { title: string; description: string; variant: "info" | "warning" | "success" | "danger" }> = {
  pending_first_installment: {
    title: "Aguardando 1ª Parcela",
    description: "Gere o link de pagamento e compartilhe com o cliente para iniciar o fluxo.",
    variant: "info",
  },
  pending_second_installment: {
    title: "Aguardando Fatura do PL",
    description: "O cliente recebeu o Cartão Private Label. Quando pagar a 1ª fatura (2ª parcela do contrato), o contrato ficará elegível para antecipação.",
    variant: "info",
  },
  eligible: {
    title: "Elegível para Antecipação",
    description: "O cliente pagou a fatura do PL em dia. Você pode solicitar a antecipação agora e receber 70% do valor restante.",
    variant: "success",
  },
  eligible_late: {
    title: "Elegível (com atraso)",
    description: "O cliente pagou a fatura do PL com atraso (≤60 dias). Ainda elegível para antecipação.",
    variant: "warning",
  },
  ineligible: {
    title: "Não Elegível",
    description: "O cliente não pagou a fatura do PL ou o atraso excedeu 60 dias. Não é possível antecipar.",
    variant: "danger",
  },
  disbursed: {
    title: "Antecipação Realizada",
    description: "Este contrato já foi antecipado. Acompanhe as movimentações no extrato.",
    variant: "success",
  },
};

export function ContractActions({
  contractId,
  contractNumber,
  eligibilityStatus,
  totalAmountCents,
  firstInstallmentAmountCents,
  hasPaymentLink,
  paymentLink,
}: ContractActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(paymentLink || null);
  const [copied, setCopied] = useState(false);
  const [advanceResult, setAdvanceResult] = useState<{ merchant: number; escrow: number } | null>(null);

  const info = statusInfo[eligibilityStatus];
  const remainingValue = totalAmountCents - firstInstallmentAmountCents;
  const merchantAmount = (remainingValue * 70n) / 100n;
  const escrowAmount = remainingValue - merchantAmount;

  const handleGenerateLink = async () => {
    setLoading("generate");
    setError(null);
    const result = await generatePaymentLink(contractId);
    setLoading(null);
    
    if (result.success && result.data) {
      setGeneratedLink(result.data.paymentLink);
    } else {
      setError(result.error || "Erro ao gerar link");
    }
  };

  const handleConfirmPayment = async () => {
    setLoading("confirm");
    setError(null);
    const result = await confirmPayment(contractId);
    setLoading(null);
    
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Erro ao confirmar pagamento");
    }
  };

  const handleSimulateSecond = async (daysLate: number = 0) => {
    setLoading("simulate");
    setError(null);
    const result = await simulateSecondPayment(contractId, daysLate);
    setLoading(null);
    
    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Erro ao simular pagamento");
    }
  };

  const handleRequestAdvance = async () => {
    setLoading("advance");
    setError(null);
    const result = await requestAdvance(contractId);
    setLoading(null);
    
    if (result.success && result.data) {
      setAdvanceResult({
        merchant: result.data.merchantAmount,
        escrow: result.data.escrowAmount,
      });
      router.refresh();
    } else {
      setError(result.error || "Erro ao solicitar antecipação");
    }
  };

  const handleCopyLink = async () => {
    if (generatedLink) {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <ContentCard title="Ações do Contrato" description="Próximos passos disponíveis">
      <div className="space-y-4">
        {/* Status Info */}
        <AlertCard
          title={info.title}
          description={info.description}
          variant={info.variant}
        />

        {/* Error Message */}
        {error && (
          <AlertCard
            title="Erro"
            description={error}
            variant="danger"
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          />
        )}

        {/* Actions based on status */}
        <div className="space-y-3 pt-2">
          {/* PENDING FIRST INSTALLMENT */}
          {eligibilityStatus === "pending_first_installment" && (
            <>
              {!generatedLink ? (
                <ActionButton
                  onClick={handleGenerateLink}
                  loading={loading === "generate"}
                  loadingText="Gerando..."
                  icon={<LinkIcon className="w-4 h-4" />}
                  className="w-full"
                >
                  Gerar Link de Pagamento (1ª Parcela)
                </ActionButton>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Link de Pagamento</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm text-slate-700 truncate">
                        {generatedLink}
                      </code>
                      <button
                        onClick={handleCopyLink}
                        className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                        aria-label="Copiar link"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                      <a
                        href={generatedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-slate-200 transition-colors"
                        aria-label="Abrir link"
                      >
                        <ExternalLink className="w-4 h-4 text-slate-500" />
                      </a>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-sm text-amber-800">
                      <strong>Simulação:</strong> Em ambiente de testes, clique abaixo para simular o pagamento do cliente.
                    </p>
                  </div>

                  <ActionButton
                    onClick={handleConfirmPayment}
                    loading={loading === "confirm"}
                    loadingText="Processando..."
                    icon={<CreditCard className="w-4 h-4" />}
                    className="w-full"
                  >
                    Simular Pagamento + Tokenização + Emissão PL
                  </ActionButton>
                </div>
              )}
            </>
          )}

          {/* PENDING SECOND INSTALLMENT */}
          {eligibilityStatus === "pending_second_installment" && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                <p className="text-sm text-cyan-800">
                  <strong>Simulação:</strong> Simule o pagamento da 2ª parcela (1ª fatura do PL) para testar a elegibilidade.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <ActionButton
                  onClick={() => handleSimulateSecond(0)}
                  loading={loading === "simulate"}
                  loadingText="..."
                  variant="primary"
                  className="w-full"
                >
                  Pagar em Dia
                </ActionButton>
                <ActionButton
                  onClick={() => handleSimulateSecond(30)}
                  loading={loading === "simulate"}
                  loadingText="..."
                  variant="secondary"
                  className="w-full"
                >
                  Pagar com 30d Atraso
                </ActionButton>
                <ActionButton
                  onClick={() => handleSimulateSecond(90)}
                  loading={loading === "simulate"}
                  loadingText="..."
                  variant="danger"
                  className="w-full"
                >
                  Não Pagar (90d)
                </ActionButton>
              </div>
            </div>
          )}

          {/* ELIGIBLE */}
          {(eligibilityStatus === "eligible" || eligibilityStatus === "eligible_late") && !advanceResult && (
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-sm text-emerald-800 mb-3">
                  Ao solicitar a antecipação, você receberá:
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-emerald-600 uppercase tracking-wide">Recebimento (70%)</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(merchantAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-cyan-600 uppercase tracking-wide">Escrow (30%)</p>
                    <p className="text-xl font-bold text-cyan-700">
                      {formatCurrency(escrowAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <ActionButton
                onClick={handleRequestAdvance}
                loading={loading === "advance"}
                loadingText="Solicitando..."
                icon={<Banknote className="w-4 h-4" />}
                className="w-full"
              >
                Solicitar Antecipação
              </ActionButton>
            </div>
          )}

          {/* ADVANCE RESULT */}
          {advanceResult && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-2 mb-3">
                <Check className="w-5 h-5 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-800">
                  Antecipação realizada com sucesso!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-emerald-600">Creditado na sua conta</p>
                  <p className="text-lg font-bold text-emerald-700">
                    {formatCurrency(BigInt(advanceResult.merchant))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-cyan-600">Retido em Escrow</p>
                  <p className="text-lg font-bold text-cyan-700">
                    {formatCurrency(BigInt(advanceResult.escrow))}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* INELIGIBLE */}
          {eligibilityStatus === "ineligible" && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
              <p className="text-sm text-red-800">
                Este contrato não está elegível para antecipação. Aguarde a regularização do pagamento ou entre em contato com o suporte.
              </p>
            </div>
          )}

          {/* DISBURSED */}
          {eligibilityStatus === "disbursed" && (
            <ActionButton
              onClick={() => router.push("/extrato")}
              variant="secondary"
              icon={<FileText className="w-4 h-4" />}
              className="w-full"
            >
              Ver Extrato
            </ActionButton>
          )}
        </div>
      </div>
    </ContentCard>
  );
}

