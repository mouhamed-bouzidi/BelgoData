"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Agent IA", href: "/agent", icon: "💬" },
  { label: "Dashboard", href: "/dashboard", icon: "📊" },
  { label: "Prospects", href: "/prospects", icon: "🏢" },
  { label: "Rapports & Bilans", href: "/rapports", icon: "📄" },
  { label: "Exports", href: "/exports", icon: "⬆️" },
  { label: "Utilisateurs", href: "/utilisateurs", icon: "👥" },
  { label: "Paramètres", href: "/parametres", icon: "⚙️" },
];

const toolItems = [
  { label: "Recherche avancée", href: "/recherche", icon: "🔍" },
  { label: "Scraping OSM", href: "/scraping", icon: "🌍" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] h-screen bg-sidebar-bg text-white flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-blue flex items-center justify-center text-lg">
          🏢
        </div>
        <div>
          <div className="font-semibold text-sm">BelgoData IA</div>
          <div className="text-xs text-white/50">Belgique</div>
        </div>
      </div>

      {/* Navigation principale */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="px-3 text-xs uppercase text-white/40 mb-2">Outils</p>
          <ul className="space-y-1">
            {toolItems.map((item) => {
              const isActive = pathname === item.href;
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
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Profil utilisateur en bas */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-3 px-3 py-3 bg-sidebar-hover rounded-lg">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-semibold">
            MA
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">Mohamed Ali</div>
            <div className="text-xs text-white/50 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green inline-block" />
              En ligne
            </div>
          </div>
        </div>
        <button className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 text-sm text-white/70 hover:bg-sidebar-hover rounded-lg transition-colors">
          <span>🚪</span>
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
}