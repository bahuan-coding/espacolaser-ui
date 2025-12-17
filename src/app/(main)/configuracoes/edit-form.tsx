"use client";

import { useState } from "react";
import { updateMerchant, MerchantUpdateData } from "./actions";
import { inputStyles, buttonStyles } from "@/lib/design-system/tokens";
import { Pencil, X, Save, Loader2 } from "lucide-react";

interface EditFormProps {
  merchantId: string;
  initialData: {
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
}

export function MerchantEditForm({ merchantId, initialData }: EditFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState<MerchantUpdateData>({
    email: initialData.email,
    phone: initialData.phone || "",
    address: initialData.address || "",
    city: initialData.city || "",
    state: initialData.state || "",
    zipCode: initialData.zipCode || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setIsLoading(true);

    try {
      const result = await updateMerchant(merchantId, formData);
      
      if (result.success) {
        setSuccess(true);
        setIsEditing(false);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Erro ao salvar");
      }
    } catch {
      setError("Erro ao salvar alterações");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      email: initialData.email,
      phone: initialData.phone || "",
      address: initialData.address || "",
      city: initialData.city || "",
      state: initialData.state || "",
      zipCode: initialData.zipCode || "",
    });
    setIsEditing(false);
    setError("");
  };

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between">
        {success && (
          <span className="text-sm text-emerald-600 font-medium">Salvo com sucesso!</span>
        )}
        <button
          onClick={() => setIsEditing(true)}
          className={`${buttonStyles.secondary} flex items-center gap-2 ml-auto`}
        >
          <Pencil className="w-4 h-4" />
          Editar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-slate-700">
            Email *
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={inputStyles.base}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-slate-700">
            Telefone
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(11) 99999-9999"
            className={inputStyles.base}
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label htmlFor="address" className="text-sm font-medium text-slate-700">
            Endereço
          </label>
          <input
            id="address"
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            placeholder="Rua, número, complemento"
            className={inputStyles.base}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="city" className="text-sm font-medium text-slate-700">
            Cidade
          </label>
          <input
            id="city"
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className={inputStyles.base}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="state" className="text-sm font-medium text-slate-700">
              UF
            </label>
            <input
              id="state"
              type="text"
              maxLength={2}
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
              placeholder="SP"
              className={inputStyles.base}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="zipCode" className="text-sm font-medium text-slate-700">
              CEP
            </label>
            <input
              id="zipCode"
              type="text"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              placeholder="00000-000"
              className={inputStyles.base}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isLoading}
          className={`${buttonStyles.ghost} flex items-center gap-2`}
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`${buttonStyles.primary} flex items-center gap-2`}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isLoading ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}

