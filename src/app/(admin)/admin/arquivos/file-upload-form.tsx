"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2 } from "lucide-react";

export function FileUploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState("generic");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("fileType", fileType);

      const res = await fetch("/api/admin/return-files", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao fazer upload");
      }

      setSuccess(`Arquivo enviado: ${data.preview.totalRecords} registros encontrados`);
      setSelectedFile(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
      <h3 className="text-lg font-semibold text-white mb-4">Upload de Arquivo</h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drop zone */}
        <div
          className={`col-span-2 border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? "border-violet-500 bg-violet-500/10"
              : "border-slate-700 hover:border-slate-600"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <FileText className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-medium">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => setSelectedFile(null)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">
                Arraste um arquivo ou{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-violet-400 hover:text-violet-300"
                >
                  clique para selecionar
                </button>
              </p>
              <p className="text-xs text-slate-500">CSV, TXT ou CNAB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.ret"
            onChange={handleChange}
            className="hidden"
          />
        </div>

        {/* Options */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Tipo de Arquivo</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="generic">Auto-detectar</option>
              <option value="gateway">Gateway (Cartão)</option>
              <option value="biz">BIZ (Boleto)</option>
              <option value="bank">Banco (CNAB)</option>
            </select>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-500 text-white rounded-lg font-medium hover:bg-violet-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Fazer Upload
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

