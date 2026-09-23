"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";

const publicRoutes = ["/login", "/signup"];

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { width, toggleMobileSidebar } = useSidebar();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const updateIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    updateIsDesktop();
    window.addEventListener("resize", updateIsDesktop);
    return () => window.removeEventListener("resize", updateIsDesktop);
  }, []);

  const mainMarginLeft = isDesktop ? width : 0;

  return (
    <div className="flex">
      <Sidebar />
      <button
        type="button"
        onClick={toggleMobileSidebar}
        className="lg:hidden fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-900/5 transition hover:bg-slate-50"
        aria-label="Ouvrir le menu"
      >
        <Menu size={20} />
      </button>
      <main
        className="flex-1 min-h-screen bg-gradient-to-br from-violet-50/40 via-white to-slate-50/50 transition-[margin-left] duration-300 ease-in-out"
        style={{ marginLeft: mainMarginLeft }}
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