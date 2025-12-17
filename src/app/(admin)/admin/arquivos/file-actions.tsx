"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Trash2, Eye, Loader2 } from "lucide-react";

interface FileActionsProps {
  fileId: string;
  status: string;
  fileName: string;
}

export function FileActions({ fileId, status, fileName }: FileActionsProps) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canProcess = status === "uploaded" || status === "parsed";
  const canDelete = status !== "processed";

  const handleProcess = async () => {
    if (!canProcess) return;
    setProcessing(true);

    try {
      const res = await fetch(`/api/admin/return-files/${fileId}/process`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao processar arquivo");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao processar arquivo");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!confirm(`Deseja remover o arquivo "${fileName}"?`)) return;

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/return-files/${fileId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Erro ao remover arquivo");
        return;
      }

      router.refresh();
    } catch {
      alert("Erro ao remover arquivo");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      {canProcess && (
        <button
          onClick={handleProcess}
          disabled={processing}
          title="Processar arquivo"
          className="p-2 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 transition-colors disabled:opacity-50"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
      )}

      {canDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Remover arquivo"
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

