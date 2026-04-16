import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Zeal Bench — Build with Precision",
  description:
    "A high-tech editorial workspace. Kinetic project management for the structural thinker.",
  manifest: "/favicon_io/site.webmanifest",
  icons: {
    icon: [{ url: "/zeal-logo.png", type: "image/png" }],
    apple: "/zeal-logo.png",
    shortcut: "/zeal-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
