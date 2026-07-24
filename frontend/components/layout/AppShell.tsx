"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

const publicRoutes = ["/login", "/signup"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicRoutes.includes(pathname);

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-[240px] min-h-screen bg-content-bg">
        {children}
      </main>
    </div>
  );
}
