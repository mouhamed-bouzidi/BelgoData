import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes accessibles sans être connecté
const publicRoutes = ["/login", "/signup"];

// Détection des fichiers statiques et assets pour éviter de bloquer l'application
function isPublicAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/logo1.png" ||
    /\.(png|jpe?g|svg|webp|gif|ico|css|js|map|json|txt)$/i.test(pathname)
  );
}

export function middleware(req: NextRequest) {
  const token = req.cookies.get("belgodata_token")?.value;
  const { pathname } = req.nextUrl;

  // 1. Laisser passer les fichiers statiques librement
  if (isPublicAsset(pathname)) {
    return NextResponse.next();
  }

  // 2. Gestion des routes publiques (Login / Signup)
  if (publicRoutes.includes(pathname)) {
    // Si l'utilisateur est déjà connecté, on le redirige vers l'accueil ou le dashboard
    if (token) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // 3. Protection des routes privées (Dashboard, Prospects, Utilisateurs, etc.)
  if (!token) {
    // Si pas de token, redirection immédiate vers le Login sur le port 3000
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

// Configuration du matcher pour exclure les dossiers système de Next.js et l'API backend
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};