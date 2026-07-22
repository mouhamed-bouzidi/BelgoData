"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import axios from "axios";
import { Bell } from "lucide-react";

interface NotificationItem {
  _id: string;
  message: string;
  read: boolean;
  createdAt: string;
  meta?: { category?: string; postalCode?: string; count?: number; sample?: string[] };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const POLL_INTERVAL_MS = 60000;

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("belgodata_token");
    if (!token) return;
    try {
      const res = await axios.get(`${API_URL}/api/notifications?limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(res.data?.results || []);
      setUnreadCount(res.data?.unreadCount || 0);
    } catch {
      // silencieux : la cloche ne doit pas casser l'UI si le backend est momentanément indisponible
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAllRead() {
    const token = localStorage.getItem("belgodata_token");
    if (!token) return;
    try {
      await axios.patch(`${API_URL}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // silencieux
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg text-white/70 hover:bg-sidebar-hover hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} strokeWidth={2} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white text-center font-semibold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-400 text-center">
              Aucune notification pour l&apos;instant.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <li key={n._id} className={`px-4 py-3 text-sm ${n.read ? "opacity-60" : ""}`}>
                  <p className="text-slate-700">{n.message}</p>
                  {n.meta?.sample && n.meta.sample.length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Ex : {n.meta.sample.slice(0, 3).join(", ")}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("fr-BE")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
