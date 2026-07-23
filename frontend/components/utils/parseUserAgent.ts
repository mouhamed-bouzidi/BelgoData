/**
 * Extrait un libellé simple "Navigateur · OS" à partir d'un user-agent brut,
 * sans dépendance externe. Partagé entre la page dashboard utilisateur
 * et la page "Voir tout" des logs (historique de connexion).
 */
export function parseUserAgent(ua: string | null): string {
  if (!ua) return "Inconnu";

  const browser =
    /Edg\//.test(ua) ? "Edge" :
    /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" :
    /Safari\//.test(ua) ? "Safari" :
    "Navigateur";

  const os =
    /Windows/.test(ua) ? "Windows" :
    /Mac OS/.test(ua) ? "macOS" :
    /Android/.test(ua) ? "Android" :
    /iPhone|iPad/.test(ua) ? "iOS" :
    /Linux/.test(ua) ? "Linux" :
    "OS inconnu";

  return `${browser} · ${os}`;
}
