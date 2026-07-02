"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

import {
  MessageSquare,
  LayoutDashboard,
  Building2,
  FileText,
  Upload,
  Users,
  Settings,
  Search,
  Globe,
  LogOut,
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

const toolItems: NavItem[] = [
  { label: "Recherche avancée", href: "/recherche", icon: Search },
  { label: "Scraping OSM", href: "/scraping", icon: Globe },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
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
    <aside className="w-[240px] h-screen bg-sidebar-bg text-white flex flex-col fixed left-0 top-0">
      {/* Logo corrigé (taille carrée standard et comportement d'aspect respecté) */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
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
        <div>
          <div className="font-semibold text-sm">BelgoData</div>
          <div className="text-xs text-white/50">Belgique</div>
        </div>
      </div>

      {/* Navigation principale avec Scrollbar épurée et moderne */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/25">
        <ul className="space-y-1">
          {navItems
            .filter((item) => !item.roles || (mounted && item.roles.includes(user?.role || "")))
            .map((item) => {
              const isActive = item.href === "/" 
                ? pathname === "/" 
                : pathname === item.href || pathname.startsWith(item.href + "/");

              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-accent text-white"
                        : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
          })}
        </ul>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="px-3 text-xs uppercase text-white/40 mb-2">Outils</p>
          <ul className="space-y-1">
            {toolItems
              .filter((item) => !item.roles || (mounted && item.roles.includes(user?.role || "")))
              .map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isActive
                          ? "bg-accent text-white"
                          : "text-white/70 hover:bg-sidebar-hover hover:text-white"
                      }`}
                    >
                      <Icon size={18} strokeWidth={2} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
            })}
          </ul>
        </div>
      </nav>

      {/* Zone Basse : Profil et Déconnexion */}
      <div className="p-3 border-t border-white/5 space-y-2">
        <div className="flex items-center gap-3 px-3 py-3 bg-sidebar-hover rounded-lg">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold flex-shrink-0">
            {mounted && user?.name ? user.name.slice(0, 2).toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">
              {mounted && user?.name ? user.name : "Utilisateur"}
            </div>
            <div className="text-xs text-white/50 truncate">
              {mounted && user?.role ? user.role : ""}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:bg-sidebar-hover hover:text-white rounded-lg transition-colors"
        >
          <LogOut size={18} strokeWidth={2} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}