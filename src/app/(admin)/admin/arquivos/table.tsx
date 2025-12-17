"use client";

import { FileText } from "lucide-react";
import { DataTable } from "@/components/shared/ui/data-table";
import { formatDateTime } from "@/lib/utils";
import { FileActions } from "./file-actions";

interface ReturnFileData {
  id: string;
  fileName: string;
  fileType: string;
  totalRecords: number;
  matchedRecords: number;
  unmatchedRecords: number;
  status: string;
  createdAt: Date;
  _count: { payments: number };
}

interface AdminArquivosTableProps {
  files: ReturnFileData[];
}

const statusColors: Record<string, string> = {
  uploaded: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  parsing: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  parsed: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  processing: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  processed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
};

export function AdminArquivosTable({ files }: AdminArquivosTableProps) {
  const columns = [
    {
      key: "fileName",
      header: "Arquivo",
      render: (f: ReturnFileData) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-white font-medium">{f.fileName}</p>
            <p className="text-xs text-slate-500">
              {formatDateTime(f.createdAt)} • {f.fileType.toUpperCase()}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "records",
      header: "Registros",
      className: "text-center",
      render: (f: ReturnFileData) => (
        <span className="text-slate-300">{f.totalRecords}</span>
      ),
    },
    {
      key: "matched",
      header: "Conciliados",
      className: "text-center",
      render: (f: ReturnFileData) => (
        <span className="text-emerald-400">{f.matchedRecords}</span>
      ),
    },
    {
      key: "unmatched",
      header: "Pendentes",
      className: "text-center",
      render: (f: ReturnFileData) => (
        <span className={f.unmatchedRecords > 0 ? "text-amber-400" : "text-slate-500"}>
          {f.unmatchedRecords}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (f: ReturnFileData) => (
        <span className={`text-xs px-2 py-1 rounded border ${statusColors[f.status] || statusColors.uploaded}`}>
          {f.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (f: ReturnFileData) => (
        <FileActions
          fileId={f.id}
          status={f.status}
          fileName={f.fileName}
        />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={files}
      keyExtractor={(f) => f.id}
      emptyMessage="Nenhum arquivo de retorno encontrado"
    />
  );
}

