import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FOSS Club KIET — Official Website",
  description: "Official website of FOSS Club KIET — the free and open source software community at KIET.",
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
