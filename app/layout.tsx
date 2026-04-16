import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeal Bench PM Board",
  description: "Tracking Internal Zeal Project Progress",
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
