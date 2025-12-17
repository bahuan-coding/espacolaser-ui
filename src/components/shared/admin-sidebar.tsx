"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
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
  FileUp,
  Receipt,
  CheckCircle,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileNav } from "./mobile-nav-context";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, description: "Visão geral do sistema" },
  { href: "/admin/contratos", label: "Contratos", icon: FileStack, description: "Gestão de contratos de serviço" },
  { href: "/admin/parcelas", label: "Parcelas", icon: CalendarDays, description: "Acompanhamento de parcelas" },
  { href: "/admin/arquivos", label: "Arquivos Retorno", icon: FileUp, description: "Upload de arquivos bancários" },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: Receipt, description: "Processamento de pagamentos" },
  { href: "/admin/baixas", label: "Baixa Manual", icon: CheckCircle, description: "Baixa manual de parcelas" },
  { href: "/admin/fundos", label: "Fundos FIDC", icon: Building2, description: "Gestão dos fundos de investimento" },
  { href: "/admin/escrow", label: "Contas Escrow", icon: Wallet, description: "Saldos de garantia por lojista" },
  { href: "/admin/ledger", label: "Extrato Escrow", icon: BookOpen, description: "Movimentações de entrada e saída" },
  { href: "/admin/conciliacao", label: "Conciliação", icon: FileCheck, description: "Arquivos de retorno bancário" },
  { href: "/admin/drawdowns", label: "Saques Escrow", icon: AlertTriangle, description: "Saques para cobrir inadimplência" },
  { href: "/admin/merchants", label: "Lojistas", icon: Users, description: "Cadastro de lojistas" },
  { href: "/admin/clientes", label: "Clientes Finais", icon: UserCheck, description: "Clientes dos lojistas" },
  { href: "/admin/transacoes", label: "Transações", icon: CreditCard, description: "Transações de cartão PL" },
  { href: "/admin/simulador", label: "Simulador", icon: Play, description: "Simular antecipação" },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings, description: "Configurações do sistema" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">A55 Admin</h2>
            <p className="text-xs text-slate-500 dark:text-slate-500">Backoffice</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== "/admin" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={item.description}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          ← Portal do Lojista
        </Link>
      </div>
    </>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col">
      <SidebarContent />
    </aside>
  );
}

export function AdminMobileSidebar() {
  const { isOpen, close } = useMobileNav();
  const pathname = usePathname();

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-950 shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
        <div className="absolute right-4 top-4">
          <button
            onClick={close}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <SidebarContent onNavigate={close} />
      </aside>
    </div>
  );
}

export function AdminMobileMenuButton() {
  const { toggle } = useMobileNav();
  
  return (
    <button
      onClick={toggle}
      className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      aria-label="Abrir menu"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

