import { MainSidebar, MobileSidebar } from "@/components/shared/main-sidebar";
import { MainHeader } from "@/components/shared/main-header";
import { MobileNavProvider } from "@/components/shared/mobile-nav-context";
import { prisma } from "@/lib/prisma";

async function getMerchantData() {
  const merchant = await prisma.merchant.findFirst({
    where: { isActive: true },
    include: {
      users: {
        where: { isActive: true },
        take: 1,
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return merchant;
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const merchant = await getMerchantData();

  return (
    <MobileNavProvider>
      <div className="min-h-screen bg-slate-50 flex">
        <MainSidebar />
        <MobileSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <MainHeader 
            merchantName={merchant?.name}
            merchantDocument={merchant?.document}
            userName={merchant?.users[0]?.name}
            userRole={merchant?.users[0]?.role === "admin" ? "Administrador" : "Operador"}
          />
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </MobileNavProvider>
  );
}






