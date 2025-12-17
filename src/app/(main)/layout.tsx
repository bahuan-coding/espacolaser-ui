import { MainSidebar } from "@/components/shared/main-sidebar";
import { MainHeader } from "@/components/shared/main-header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex">
      <MainSidebar />
      <div className="flex-1 flex flex-col">
        <MainHeader />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}




