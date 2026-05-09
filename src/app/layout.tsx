import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Gordhamer Family Hub",
  description: "Family hub for jobs, events, calendar, contacts, and more.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
