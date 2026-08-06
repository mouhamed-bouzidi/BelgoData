"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const STORAGE_KEY = "belgodata_sidebar_collapsed";

export const SIDEBAR_WIDTH_NORMAL = 280;
export const SIDEBAR_WIDTH_COMPACT = 72;

interface SidebarContextType {
  collapsed: boolean;
  mobileOpen: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setCollapsed: (value: boolean) => void;
  width: number;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // false = état normal (280px), true = état compact (72px)
  const [collapsed, setCollapsedState] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Lecture de la préférence utilisateur au montage (persistance locale)
  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setCollapsedState(stored === "true");
    }
    setMounted(true);
  }, []);

  function setCollapsed(value: boolean) {
    setCollapsedState(value);
    window.localStorage.setItem(STORAGE_KEY, String(value));
  }

  function toggleSidebar() {
    setCollapsed(!collapsed);
  }

  function toggleMobileSidebar() {
    setMobileOpen((prev) => !prev);
  }

  function closeMobileSidebar() {
    setMobileOpen(false);
  }

  const width = collapsed ? SIDEBAR_WIDTH_COMPACT : SIDEBAR_WIDTH_NORMAL;

  return (
    <SidebarContext.Provider
      value={{
        collapsed: mounted ? collapsed : false,
        mobileOpen,
        toggleSidebar,
        toggleMobileSidebar,
        closeMobileSidebar,
        setCollapsed,
        width: mounted ? width : SIDEBAR_WIDTH_NORMAL,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar doit être utilisé à l'intérieur d'un SidebarProvider");
  }
  return ctx;
}