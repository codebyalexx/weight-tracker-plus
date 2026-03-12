import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weight Tracker+ | Suivi de poids & calories",
  description:
    "Suivez votre parcours de perte de poids avec des pesées réelles et des estimations basées sur les calories. Visualisez votre progression avec de beaux graphiques.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
