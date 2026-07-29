"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "../../context/SidebarContext";
import NotificationBell from "@/components/layout/NotificationBell";

import {
  MessageSquare,
  LayoutDashboard,
  Building2,
  FileText,
  Upload,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: string[]; // Rôles autorisés (si absent = visible par tous)
}

const navItems: NavItem[] = [
  { label: "Agent IA", href: "/", icon: MessageSquare },
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Prospects", href: "/prospects", icon: Building2 },
  { label: "Rapports & Bilans", href: "/rapports", icon: FileText },
  { label: "Exports", href: "/exports", icon: Upload },
  { label: "Utilisateurs", href: "/users", icon: Users, roles: ["Administrateur"] },
  { label: "Paramètres", href: "/parametres", icon: Settings, roles: ["Administrateur"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { collapsed, toggleSidebar, width } = useSidebar();
  const avatarUrl = (user as { avatarUrl?: string } | undefined)?.avatarUrl;

  // État pour bloquer le rendu dynamique pendant l'hydratation SSR
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside
      className="h-screen bg-sidebar-bg text-white flex flex-col fixed left-0 top-0 z-40 overflow-visible transition-[width] duration-300 ease-in-out"
      style={{ width }}
    >
      {/* En-tête / Logo */}
      <div
        className={`relative flex items-center border-b border-white/10 transition-all duration-300 ${
          collapsed ? "justify-center px-2 py-5" : "gap-3 px-5 py-5"
        }`}
      >
        <div className="w-12 h-12 relative overflow-hidden flex-shrink-0">
          <Image
            src="/logo1.png"
            alt="BelgoData Logo"
            fill
            sizes="48px"
            className="object-contain"
            priority
          />
        </div>

        {!collapsed && (
          <>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">BelgoData</div>
              <div className="text-xs text-white/50 truncate">Belgique</div>
            </div>
            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
              <NotificationBell />
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label="Réduire la barre latérale"
                title="Réduire la barre latérale"
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
            </div>
          </>
        )}

        {/* Bouton pour ré-ouvrir la sidebar en mode compact */}
        {collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Agrandir la barre latérale"
            title="Agrandir la barre latérale"
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-sidebar-bg border border-white/15 text-white/70 hover:bg-white/10 hover:text-white shadow-md transition-colors"
          >
            <ChevronRight size={13} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto overflow-x-visible [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/25">
        <ul className="space-y-1">
          {navItems
            .filter((item) => !item.roles || (mounted && item.roles.includes(user?.role || "")))
            .map((item) => {
              const isActive = item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href + "/");

              const Icon = item.icon;
              return (
                <li key={item.href} className="relative group/item">
                  <Link
                    href={item.href}
                    className={`group flex items-center rounded-lg text-sm transition-all duration-200 ${
                      collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                    } ${
                      isActive
                        ? "bg-accent text-white shadow-lg shadow-accent/30 font-medium"
                        : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                    }`}
                  >
                    <Icon
                      size={18}
                      strokeWidth={2}
                      className={`flex-shrink-0 transition-transform duration-300 ease-out ${
                        isActive
                          ? "scale-110 -translate-y-0.5 text-white"
                          : "group-hover:scale-110 group-hover:text-white"
                      }`}
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>

                  {/* Tooltip affichée uniquement en mode compact */}
                  {collapsed && (
                    <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-[#1a1d29] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg border border-white/10 transition-opacity duration-150 group-hover/item:opacity-100 z-50">
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
        </ul>
      </nav>

      {/* Zone Basse : Profil et Déconnexion */}
      <div className="p-3 border-t border-white/5 space-y-2">
        <Link
          href="/profil"
          className={`relative group/item flex items-center bg-sidebar-hover rounded-lg hover:bg-white/10 transition-colors group cursor-pointer ${
            collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden shadow-inner relative">
            {mounted && avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Avatar"
                fill
                sizes="36px"
                className="object-cover"
              />
            ) : (
              <span>{mounted && user?.name ? user.name.slice(0, 2).toUpperCase() : "?"}</span>
            )}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate group-hover:text-[#8b5cf6] transition-colors">
                  {mounted && user?.name ? user.name : "Utilisateur"}
                </div>
                <div className="text-xs text-white/50 truncate">
                  {mounted && user?.role ? user.role : ""}
                </div>
              </div>
              <ChevronRight size={16} className="text-white/30 flex-shrink-0 group-hover:text-white/60 transition-colors" />
            </>
          )}

          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-[#1a1d29] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg border border-white/10 transition-opacity duration-150 group-hover/item:opacity-100 z-50">
              {mounted && user?.name ? user.name : "Utilisateur"}
            </span>
          )}
        </Link>

        <button
          onClick={handleLogout}
          className={`relative group/item w-full flex items-center text-sm text-white/70 hover:bg-sidebar-hover hover:text-white rounded-lg transition-colors ${
            collapsed ? "justify-center px-0 py-2.5" : "gap-2 px-3 py-2.5"
          }`}
        >
          <LogOut size={18} strokeWidth={2} className="flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}

          {collapsed && (
            <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded-md bg-[#1a1d29] px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg border border-white/10 transition-opacity duration-150 group-hover/item:opacity-100 z-50">
              Déconnexion
            </span>
          )}
        </button>
      </div>
    </aside>
  );
}