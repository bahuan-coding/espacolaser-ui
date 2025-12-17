"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Trash2, Loader2 } from "lucide-react";

interface PaymentActionsProps {
  paymentId: string;
  matchStatus: string;
  hasInstallment: boolean;
}

export function PaymentActions({ paymentId, matchStatus, hasInstallment }: PaymentActionsProps) {
  const router = useRouter();
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canMatch = matchStatus === "pending" || matchStatus === "unmatched";
  const canDelete = matchStatus !== "manual_matched" && matchStatus !== "auto_matched";

  const handleDelete = async () => {
    if (!confirm("Deseja remover este pagamento?")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao remover");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao remover pagamento");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {canMatch && (
        <button
          onClick={() => router.push(`/admin/baixas?paymentId=${paymentId}`)}
          title="Vincular a parcela"
          className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
        >
          <Link2 className="w-4 h-4" />
        </button>
      )}

      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Remover pagamento"
          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}

