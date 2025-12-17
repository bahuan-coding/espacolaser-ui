export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent" />
      <div className="relative w-full max-w-md">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 rounded-3xl blur-xl" />
        <div className="relative bg-white border border-slate-200 rounded-2xl p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 mb-4 shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-2xl">F</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Portal do Lojista</h1>
            <p className="text-slate-500 mt-2 text-sm">Acesse sua conta para continuar</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}






