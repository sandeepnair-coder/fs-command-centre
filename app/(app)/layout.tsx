import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppTopbar } from "@/components/layout/app-topbar";
import { getCurrentMember } from "@/lib/auth/getCurrentMember";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen overflow-hidden bg-card">
        <AppSidebar role={member?.role || "member"} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppTopbar />
          <main className="flex-1 overflow-hidden p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
