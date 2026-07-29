"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";

const publicRoutes = ["/login", "/signup"];

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { width } = useSidebar();

  return (
    <div className="flex">
      <Sidebar />
      <main
        className="flex-1 min-h-screen bg-content-bg transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: width }}
      >
        {children}
      </main>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicRoutes.includes(pathname);

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppShellContent>{children}</AppShellContent>
    </SidebarProvider>
  );
}