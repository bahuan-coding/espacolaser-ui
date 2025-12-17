"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Wallet,
  FileCheck,
  AlertTriangle,
  Users,
  Settings,
  Play,
  UserCheck,
  CreditCard,
  FileStack,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/contratos", label: "Contratos", icon: FileStack },
  { href: "/admin/parcelas", label: "Parcelas", icon: CalendarDays },
  { href: "/admin/fundos", label: "Fundos FIDC", icon: Building2 },
  { href: "/admin/escrow", label: "Contas Escrow", icon: Wallet },
  { href: "/admin/ledger", label: "Ledger Escrow", icon: BookOpen },
  { href: "/admin/conciliacao", label: "Conciliação", icon: FileCheck },
  { href: "/admin/drawdowns", label: "Drawdowns", icon: AlertTriangle },
  { href: "/admin/merchants", label: "Lojistas", icon: Users },
  { href: "/admin/clientes", label: "Clientes Finais", icon: UserCheck },
  { href: "/admin/transacoes", label: "Transações", icon: CreditCard },
  { href: "/admin/simulador", label: "Simulador", icon: Play },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div>
            <h2 className="font-semibold text-white">A55 Admin</h2>
            <p className="text-xs text-slate-500">Backoffice</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-400 border border-violet-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← Portal do Lojista
        </Link>
      </div>
    </aside>
  );
}

