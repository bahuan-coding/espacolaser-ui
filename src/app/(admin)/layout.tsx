import { AdminSidebar, AdminMobileSidebar } from "@/components/shared/admin-sidebar";
import { AdminHeader } from "@/components/shared/admin-header";
import { MobileNavProvider } from "@/components/shared/mobile-nav-context";
import { ThemeProvider } from "@/hooks/use-theme";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <MobileNavProvider>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
          <AdminSidebar />
          <AdminMobileSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AdminHeader />
            <main className="flex-1 p-4 lg:p-6 overflow-auto">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </MobileNavProvider>
    </ThemeProvider>
  );
}

