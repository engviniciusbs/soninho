import { QueryProvider } from "@/components/providers/QueryProvider";
import { BabyProvider } from "@/components/providers/BabyProvider";
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
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <MiniTimerBar />
            <main
              id="main-content"
              className="flex-1 overflow-y-auto overscroll-contain pb-24 md:pb-10 px-4 md:px-8 py-5 md:py-7"
            >
              <div className="mx-auto w-full max-w-5xl">{children}</div>
            </main>
            <BottomNav />
          </div>
        </div>
        <Toaster />
      </BabyProvider>
    </QueryProvider>
  );
}
