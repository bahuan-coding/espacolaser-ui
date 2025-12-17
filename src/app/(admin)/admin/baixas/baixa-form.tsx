"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CheckCircle, Loader2, AlertTriangle } from "lucide-react";

interface InstallmentCandidate {
  id: string;
  contractId: string;
  contractNumber: string;
  installmentNumber: number;
  amountCents: string;
  dueDate: string;
  customerDocument: string;
  customerName: string;
  merchantName: string;
}

interface BaixaFormProps {
  preSelectedInstallmentId?: string;
  linkPaymentId?: string;
}

const eventTypes = [
  { value: "full_payment", label: "Pagamento Completo" },
  { value: "partial_payment", label: "Pagamento Parcial" },
  { value: "late_payment", label: "Pagamento com Atraso" },
  { value: "overpayment", label: "Pagamento Maior" },
  { value: "write_off", label: "Baixa por Prejuízo" },
  { value: "refund", label: "Estorno" },
  { value: "chargeback", label: "Chargeback" },
];

const paymentMethods = [
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "PIX" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "debit_card", label: "Cartão de Débito" },
  { value: "bank_transfer", label: "Transferência Bancária" },
  { value: "escrow_drawdown", label: "Débito Escrow" },
  { value: "fallback_charge", label: "Cobrança Fallback" },
];

export function BaixaForm({ preSelectedInstallmentId, linkPaymentId }: BaixaFormProps) {
  const router = useRouter();

  // Search state
  const [searchType, setSearchType] = useState<"contract" | "document">("contract");
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<InstallmentCandidate[]>([]);

  // Selected installment
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentCandidate | null>(null);

  // Form state
  const [eventType, setEventType] = useState("full_payment");
  const [paymentMethod, setPaymentMethod] = useState("boleto");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [observations, setObservations] = useState("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setCandidates([]);
    setSelectedInstallment(null);

    try {
      const params = new URLSearchParams();
      if (searchType === "contract") {
        params.set("contractNumber", searchQuery);
      } else {
        params.set("customerDocument", searchQuery);
      }

      const res = await fetch(`/api/admin/baixas?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setCandidates(data.candidates || []);
      } else {
        alert(data.error || "Erro ao buscar");
      }
    } catch {
      alert("Erro ao buscar parcelas");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectInstallment = (inst: InstallmentCandidate) => {
    setSelectedInstallment(inst);
    setPaidAmount((parseInt(inst.amountCents) / 100).toFixed(2));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/baixas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: selectedInstallment.id,
          eventType,
          paymentMethod,
          paidAmountCents: Math.round(parseFloat(paidAmount) * 100),
          paymentDate,
          observations,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ success: true, message: data.message });
        // Reset form
        setSelectedInstallment(null);
        setCandidates([]);
        setSearchQuery("");
        setPaidAmount("");
        setObservations("");
        router.refresh();
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch {
      setResult({ success: false, message: "Erro ao aplicar baixa" });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (cents: string) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseInt(cents) / 100);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
        <h3 className="text-lg font-semibold text-white mb-4">1. Buscar Parcela</h3>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setSearchType("contract")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              searchType === "contract"
                ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            Por Contrato
          </button>
          <button
            onClick={() => setSearchType("document")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              searchType === "document"
                ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            Por CPF
          </button>
        </div>

        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={searchType === "contract" ? "Número do contrato..." : "CPF do cliente..."}
            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-6 py-3 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Buscar
          </button>
        </div>

        {/* Results */}
        {candidates.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-400">{candidates.length} parcela(s) encontrada(s)</p>
            {candidates.map((inst) => (
              <button
                key={inst.id}
                onClick={() => handleSelectInstallment(inst)}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedInstallment?.id === inst.id
                    ? "bg-violet-500/20 border-violet-500/50"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">
                      {inst.contractNumber} - Parcela {inst.installmentNumber}
                    </p>
                    <p className="text-sm text-slate-400">
                      {inst.customerName} • {inst.merchantName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCurrency(inst.amountCents)}</p>
                    <p className="text-xs text-slate-500">Vence: {formatDate(inst.dueDate)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {candidates.length === 0 && searchQuery && !searching && (
          <p className="mt-4 text-slate-500">Nenhuma parcela em aberto encontrada</p>
        )}
      </div>

      {/* Form Section */}
      {selectedInstallment && (
        <form onSubmit={handleSubmit} className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4">2. Registrar Pagamento</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Tipo de Pagamento</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {eventTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Método de Pagamento</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Valor Pago (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                Valor esperado: {formatCurrency(selectedInstallment.amountCents)}
              </p>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Data do Pagamento</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-slate-400 mb-2">Observações</label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                placeholder="Observações opcionais..."
              />
            </div>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Resumo da Baixa</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Contrato</p>
                <p className="text-white">{selectedInstallment.contractNumber}</p>
              </div>
              <div>
                <p className="text-slate-500">Parcela</p>
                <p className="text-white">{selectedInstallment.installmentNumber}</p>
              </div>
              <div>
                <p className="text-slate-500">Valor Esperado</p>
                <p className="text-white">{formatCurrency(selectedInstallment.amountCents)}</p>
              </div>
              <div>
                <p className="text-slate-500">Valor Informado</p>
                <p className="text-white">R$ {paidAmount || "0.00"}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              Confirmar Baixa
            </button>

            <button
              type="button"
              onClick={() => setSelectedInstallment(null)}
              className="px-6 py-3 text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>

          {result && (
            <div
              className={`mt-4 p-4 rounded-lg flex items-center gap-3 ${
                result.success
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
              {result.message}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

