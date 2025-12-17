import { typography, colors } from "@/lib/design-system/tokens";

export default function LoginPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className={typography.label}>E-mail</label>
        <input
          type="email"
          placeholder="seu@email.com"
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
        />
      </div>
      <div className="space-y-2">
        <label className={typography.label}>Senha</label>
        <input
          type="password"
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
        />
      </div>
      <button className={`w-full py-3 ${colors.accent.gradient} text-white font-semibold rounded-xl ${colors.accent.gradientHover} transition-all duration-200 mt-6`}>
        Entrar
      </button>
      <p className={`text-center ${typography.muted} mt-4`}>
        Esqueceu sua senha?{" "}
        <a href="#" className="text-emerald-400 hover:text-emerald-300">
          Recuperar acesso
        </a>
      </p>
    </div>
  );
}
