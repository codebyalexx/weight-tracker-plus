import type { Metadata, Viewport } from "next";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kcalm | Ton aventure calorique",
  description: "Deviens le maître de ton alimentation. Un tracking fun et motivant jour après jour !",
  manifest: "/manifest.json",
  appleWebApp: {
    title: "Kcalm",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-white text-gray-800 font-sans antialiased min-h-screen flex flex-col pb-20 selection:bg-main-blue selection:text-white">
        <Navigation />
        <main className="flex-1 w-full max-w-md mx-auto pt-4 px-4 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
