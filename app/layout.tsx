import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOSS Club KIET // Weekly Edition",
  description: "LWN-style weekly dispatch and technical Linux documentation for FOSS Club KIET.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased min-h-screen text-[15px]">{children}</body>
    </html>
  );
}
