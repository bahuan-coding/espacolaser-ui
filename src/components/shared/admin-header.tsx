"use client";

import { Bell, User } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm flex items-center justify-between px-6">
      <div>
        <h1 className="text-sm font-medium text-slate-400">Backoffice A55</h1>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">Admin</p>
            <p className="text-xs text-slate-500">Operador</p>
          </div>
        </div>
      </div>
    </header>
  );
}

