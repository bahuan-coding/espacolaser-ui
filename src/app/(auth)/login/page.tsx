"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { typography, colors } from "@/lib/design-system/tokens";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      setError("Preencha todos os campos");
      return;
    }

    setIsLoading(true);
    
    // Demo mode - simulate login delay then redirect
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    // In demo mode, any credentials work
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <label htmlFor="email" className={typography.label}>E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className={typography.label}>Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>
      <button 
        type="submit"
        disabled={isLoading}
        className={`w-full py-3 ${colors.accent.gradient} text-white font-semibold rounded-xl ${colors.accent.gradientHover} transition-all duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Entrando...
          </>
        ) : (
          "Entrar"
        )}
      </button>
      <p className="text-center text-sm text-slate-500 mt-4">
        Modo demonstração - use qualquer credencial
      </p>
    </form>
  );
}
