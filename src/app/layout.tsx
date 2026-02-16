import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weight Tracker+ | Daily Weight & Calorie Tracking",
  description:
    "Track your weight loss journey with real scale measurements and calorie-based estimations. Visualize your progress with beautiful charts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
