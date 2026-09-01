import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted via next/font — no external font-CDN request at runtime
// (technical-architecture.md §3.3, ui-spec.md §1.3).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Aviation Incident Investigation Assistant",
  description:
    "A self-contained, keyless portfolio application for guiding aviation incident investigations using simulated, fictional data. Not affiliated with any aviation authority.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
