"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, User, Calendar, DollarSign, Hash } from "lucide-react";
import { PageContainer } from "@/components/shared/layout/page-container";
import { Section } from "@/components/shared/layout/section";
import { ContentCard } from "@/components/shared/ui/content-card";
import { ActionButton } from "@/components/shared/ui/action-button";
import { AlertCard } from "@/components/shared/ui/alert-card";
import { createContract, CreateContractInput } from "@/app/(main)/contratos/actions";
import { inputStyles } from "@/lib/design-system/tokens";

// CPF mask
const formatCPF = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Phone mask
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Currency mask
const formatCurrency = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  const amount = parseInt(digits, 10) / 100;
  return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

export function NovoContratoForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ contractId: string; contractNumber: string } | null>(null);

  const [form, setForm] = useState({
    customerName: "",
    customerDocument: "",
    customerEmail: "",
    customerPhone: "",
    description: "",
    totalAmount: "",
    numberOfInstallments: "12",
    startDate: new Date().toISOString().split("T")[0],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.customerName.trim()) {
      newErrors.customerName = "Nome é obrigatório";
    }

    const cpfDigits = form.customerDocument.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      newErrors.customerDocument = "CPF deve ter 11 dígitos";
    }

    if (!form.description.trim()) {
      newErrors.description = "Descrição é obrigatória";
    }

    const amountDigits = form.totalAmount.replace(/\D/g, "");
    if (!amountDigits || parseInt(amountDigits, 10) < 1000) {
      newErrors.totalAmount = "Valor mínimo é R$ 10,00";
    }

    const installments = parseInt(form.numberOfInstallments, 10);
    if (isNaN(installments) || installments < 2 || installments > 24) {
      newErrors.numberOfInstallments = "Entre 2 e 24 parcelas";
    }

    if (!form.startDate) {
      newErrors.startDate = "Data de início é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;

    setLoading(true);
    setError(null);

    const input: CreateContractInput = {
      customerName: form.customerName.trim(),
      customerDocument: form.customerDocument.replace(/\D/g, ""),
      customerEmail: form.customerEmail.trim() || undefined,
      customerPhone: form.customerPhone.replace(/\D/g, "") || undefined,
      description: form.description.trim(),
      totalAmountCents: parseInt(form.totalAmount.replace(/\D/g, ""), 10),
      numberOfInstallments: parseInt(form.numberOfInstallments, 10),
      startDate: form.startDate,
    };

    const result = await createContract(input);
    setLoading(false);

    if (result.success && result.data) {
      setSuccess(result.data);
    } else {
      setError(result.error || "Erro ao criar contrato");
    }
  };

  if (success) {
    return (
      <PageContainer>
        <Section>
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 flex items-center justify-center">
              <FileText className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Contrato Criado!
            </h1>
            <p className="text-slate-600 mb-6">
              Número: <span className="font-mono font-medium">{success.contractNumber}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <ActionButton
                onClick={() => router.push(`/contratos/${success.contractId}`)}
                icon={<FileText className="w-4 h-4" />}
              >
                Ver Contrato
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setSuccess(null);
                  setForm({
                    customerName: "",
                    customerDocument: "",
                    customerEmail: "",
                    customerPhone: "",
                    description: "",
                    totalAmount: "",
                    numberOfInstallments: "12",
                    startDate: new Date().toISOString().split("T")[0],
                  });
                }}
                variant="secondary"
              >
                Criar Outro
              </ActionButton>
            </div>
          </div>
        </Section>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/contratos"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Contratos
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Novo Contrato</h1>
        <p className="text-slate-500 mt-1">
          Cadastre um novo contrato de serviço com cliente final
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cliente */}
          <Section>
            <ContentCard title="Dados do Cliente" description="Informações do cliente final">
              <div className="space-y-4">
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-slate-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Nome Completo *
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className={errors.customerName ? inputStyles.error : inputStyles.base}
                    placeholder="João da Silva"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customerDocument" className="block text-sm font-medium text-slate-700 mb-1">
                    CPF *
                  </label>
                  <input
                    id="customerDocument"
                    type="text"
                    value={form.customerDocument}
                    onChange={(e) => setForm({ ...form, customerDocument: formatCPF(e.target.value) })}
                    className={errors.customerDocument ? inputStyles.error : inputStyles.base}
                    placeholder="000.000.000-00"
                  />
                  {errors.customerDocument && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerDocument}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customerEmail" className="block text-sm font-medium text-slate-700 mb-1">
                    E-mail
                  </label>
                  <input
                    id="customerEmail"
                    type="email"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    className={inputStyles.base}
                    placeholder="cliente@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="customerPhone" className="block text-sm font-medium text-slate-700 mb-1">
                    Telefone
                  </label>
                  <input
                    id="customerPhone"
                    type="text"
                    value={form.customerPhone}
                    onChange={(e) => setForm({ ...form, customerPhone: formatPhone(e.target.value) })}
                    className={inputStyles.base}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </ContentCard>
          </Section>

          {/* Contrato */}
          <Section>
            <ContentCard title="Dados do Contrato" description="Informações do serviço vendido">
              <div className="space-y-4">
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Descrição do Serviço *
                  </label>
                  <input
                    id="description"
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className={errors.description ? inputStyles.error : inputStyles.base}
                    placeholder="Pacote Depilação Corpo Inteiro - 12x"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="totalAmount" className="block text-sm font-medium text-slate-700 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Valor Total *
                  </label>
                  <input
                    id="totalAmount"
                    type="text"
                    value={form.totalAmount ? formatCurrency(form.totalAmount) : ""}
                    onChange={(e) => setForm({ ...form, totalAmount: e.target.value.replace(/\D/g, "") })}
                    className={errors.totalAmount ? inputStyles.error : inputStyles.base}
                    placeholder="R$ 0,00"
                  />
                  {errors.totalAmount && (
                    <p className="mt-1 text-sm text-red-600">{errors.totalAmount}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="numberOfInstallments" className="block text-sm font-medium text-slate-700 mb-1">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Número de Parcelas *
                  </label>
                  <select
                    id="numberOfInstallments"
                    value={form.numberOfInstallments}
                    onChange={(e) => setForm({ ...form, numberOfInstallments: e.target.value })}
                    className={errors.numberOfInstallments ? inputStyles.error : inputStyles.base}
                  >
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 18, 24].map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                  {errors.numberOfInstallments && (
                    <p className="mt-1 text-sm text-red-600">{errors.numberOfInstallments}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Data de Início *
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className={errors.startDate ? inputStyles.error : inputStyles.base}
                  />
                  {errors.startDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
                  )}
                </div>
              </div>
            </ContentCard>
          </Section>
        </div>

        {/* Preview */}
        {form.totalAmount && form.numberOfInstallments && (
          <Section>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-sm text-slate-600">
                <strong>Resumo:</strong> {form.numberOfInstallments}x de{" "}
                <span className="font-medium text-slate-900">
                  {formatCurrency(
                    String(Math.floor(parseInt(form.totalAmount || "0", 10) / parseInt(form.numberOfInstallments, 10)))
                  )}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-1">
                A 1ª parcela será cobrada via gateway (fora do PL). A partir da 2ª parcela, o cliente usará o Cartão Private Label.
              </p>
            </div>
          </Section>
        )}

        {error && (
          <Section>
            <AlertCard title="Erro ao criar contrato" description={error} variant="danger" />
          </Section>
        )}

        <Section>
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <ActionButton
              type="button"
              variant="secondary"
              onClick={() => router.push("/contratos")}
            >
              Cancelar
            </ActionButton>
            <ActionButton
              type="submit"
              loading={loading}
              loadingText="Criando..."
              icon={<FileText className="w-4 h-4" />}
            >
              Criar Contrato
            </ActionButton>
          </div>
        </Section>
      </form>
    </PageContainer>
  );
}

