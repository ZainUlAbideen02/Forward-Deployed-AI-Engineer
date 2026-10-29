import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAFE-SQL // ENTERPRISE GATEWAY",
  description: "AST-governed, least-privilege SQL gateway with live schema catalog introspection & sandboxed execution",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-black font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
