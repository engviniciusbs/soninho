import { QueryProvider } from "@/components/providers/QueryProvider";
import { BabyProvider } from "@/components/providers/BabyProvider";
import { UserProfileProvider } from "@/components/providers/UserProfileProvider";
import { NannyRouteGuard } from "@/components/layout/NannyRouteGuard";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MiniTimerBar } from "@/components/layout/MiniTimerBar";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <BabyProvider>
        <UserProfileProvider>
          <div className="flex h-dvh overflow-hidden">
            <Sidebar />
            <main
              id="main-content"
              className="flex-1 overflow-y-auto overscroll-contain"
            >
              {/* Coluna de uso: ~480px, centralizada também no desktop (spec §8.2). */}
              <div className="mx-auto w-full max-w-[480px] px-4 pb-32 md:pb-12">
                {/* Seletor de bebê e sono em andamento ficam presos no topo ao rolar. */}
                <div className="sticky top-0 z-30 -mx-4 bg-sn-bg px-4 pb-3">
                  <TopBar />
                  <MiniTimerBar />
                </div>
                <NannyRouteGuard>{children}</NannyRouteGuard>
              </div>
            </main>
            <BottomNav />
          </div>
          <Toaster />
        </UserProfileProvider>
      </BabyProvider>
    </QueryProvider>
  );
}
