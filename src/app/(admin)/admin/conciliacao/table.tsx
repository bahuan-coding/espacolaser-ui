"use client";

import { DataTable } from "@/components/shared/ui/data-table";
import { StatusBadge } from "@/components/shared/ui/status-badge";
import { formatDate, formatDateTime } from "@/lib/utils";

interface ReconciliationFileData {
  id: string;
  fileName: string;
  source: string;
  periodStart: Date;
  periodEnd: Date;
  totalRecords: number;
  matchedCount: number;
  mismatchedCount: number;
  status: string;
  createdAt: Date;
  _count: { items: number };
}

interface AdminConciliacaoTableProps {
  files: ReconciliationFileData[];
}

export function AdminConciliacaoTable({ files }: AdminConciliacaoTableProps) {
  const columns = [
    {
      key: "fileName",
      header: "Arquivo",
      render: (f: ReconciliationFileData) => (
        <div>
          <p className="text-white font-medium">{f.fileName}</p>
          <p className="text-xs text-slate-500">{formatDateTime(f.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "source",
      header: "Fonte",
      render: (f: ReconciliationFileData) => (
        <span className="text-slate-300 uppercase text-xs">{f.source}</span>
      ),
    },
    {
      key: "period",
      header: "Período",
      render: (f: ReconciliationFileData) => (
        <span className="text-slate-300">
          {formatDate(f.periodStart)} - {formatDate(f.periodEnd)}
        </span>
      ),
    },
    {
      key: "totalRecords",
      header: "Registros",
      className: "text-center",
      render: (f: ReconciliationFileData) => (
        <span className="text-slate-300">{f.totalRecords}</span>
      ),
    },
    {
      key: "matched",
      header: "Conciliados",
      className: "text-center",
      render: (f: ReconciliationFileData) => (
        <span className="text-emerald-400">{f.matchedCount}</span>
      ),
    },
    {
      key: "mismatched",
      header: "Divergentes",
      className: "text-center",
      render: (f: ReconciliationFileData) => (
        <span className={f.mismatchedCount > 0 ? "text-red-400" : "text-slate-500"}>
          {f.mismatchedCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (f: ReconciliationFileData) => (
        <StatusBadge status={f.status} type="disbursement" />
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={files}
      keyExtractor={(f) => f.id}
      emptyMessage="Nenhum arquivo de conciliação encontrado"
    />
  );
}

