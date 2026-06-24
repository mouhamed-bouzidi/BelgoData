import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "BelgoData",
  description: "Plateforme de prospection intelligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-[240px] min-h-screen">{children}</main>
        </div>
      </body>
    </html>
  );
}