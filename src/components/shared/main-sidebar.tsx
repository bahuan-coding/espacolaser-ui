"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  FileStack,
  Users,
  Receipt,
  FileText,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileNav } from "./mobile-nav-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contratos", label: "Contratos", icon: FileStack },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/boletos", label: "Boletos", icon: Receipt },
  { href: "/extrato", label: "Extrato", icon: FileText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">FinTech</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Portal do Lojista</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <div className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">Versão</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">1.0.0</p>
        </div>
      </div>
    </>
  );
}

export function MainSidebar() {
  return (
    <aside className="hidden lg:flex w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex-col">
      <SidebarContent />
    </aside>
  );
}

export function MobileSidebar() {
  const { isOpen, close } = useMobileNav();
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Prevent body scroll when open
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
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <aside className="absolute left-0 top-0 h-full w-72 bg-white dark:bg-slate-950 shadow-xl flex flex-col animate-in slide-in-from-left duration-200">
        <div className="absolute right-4 top-4">
          <button
            onClick={close}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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







