"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, AlertTriangle, CreditCard, FileCheck, Loader2 } from "lucide-react";

interface SimulatorActionsProps {
  installmentId?: string;
  status?: string;
  hasDisbursement?: boolean;
  isGlobal?: boolean;
}

type EventType =
  | "pay_installment"
  | "mark_late"
  | "mark_defaulted"
  | "execute_drawdown"
  | "attempt_fallback_charge"
  | "process_reconciliation";

export function SimulatorActions({
  installmentId,
  status,
  hasDisbursement,
  isGlobal,
}: SimulatorActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<EventType | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const executeEvent = async (event: EventType) => {
    setLoading(event);
    setResult(null);

    try {
      const res = await fetch("/api/simulator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, installmentId }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message });
        router.refresh();
      } else {
        setResult({ success: false, message: data.error || "Erro desconhecido" });
      }
    } catch (error) {
      setResult({ success: false, message: "Erro de conexão" });
    } finally {
      setLoading(null);
    }
  };

  if (isGlobal) {
    return (
      <div className="space-y-3">
        <button
          onClick={() => executeEvent("process_reconciliation")}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-lg text-sm hover:bg-violet-500/30 transition-colors disabled:opacity-50"
        >
          {loading === "process_reconciliation" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileCheck className="w-4 h-4" />
          )}
          Processar Conciliação
        </button>

        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.success
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border border-red-500/30"
            }`}
          >
            {result.message}
          </div>
        )}
      </div>
    );
  }

  // Determine which actions are available based on status
  const canPay = status === "scheduled" || status === "late";
  const canMarkLate = status === "scheduled";
  const canMarkDefaulted = status === "scheduled" || status === "late";
  const canDrawdown = (status === "late" || status === "defaulted") && hasDisbursement;
  const canCharge = status === "late" || status === "defaulted";

  return (
    <div className="flex items-center gap-1">
      {canPay && (
        <button
          onClick={() => executeEvent("pay_installment")}
          disabled={loading !== null}
          title="Pagar parcela"
          className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          {loading === "pay_installment" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {canMarkLate && (
        <button
          onClick={() => executeEvent("mark_late")}
          disabled={loading !== null}
          title="Marcar como atrasada"
          className="p-1.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
        >
          {loading === "mark_late" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {canMarkDefaulted && (
        <button
          onClick={() => executeEvent("mark_defaulted")}
          disabled={loading !== null}
          title="Marcar como inadimplente"
          className="p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {loading === "mark_defaulted" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <AlertTriangle className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {canDrawdown && (
        <button
          onClick={() => executeEvent("execute_drawdown")}
          disabled={loading !== null}
          title="Executar drawdown"
          className="p-1.5 rounded bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-50"
        >
          {loading === "execute_drawdown" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {canCharge && (
        <button
          onClick={() => executeEvent("attempt_fallback_charge")}
          disabled={loading !== null}
          title="Tentar cobrança no cartão"
          className="p-1.5 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          {loading === "attempt_fallback_charge" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CreditCard className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

