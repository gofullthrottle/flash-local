import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlashLocal — Launch Your Local Service Business Tonight",
  description:
    "Turn your seasonal hustle into a bookable business in 10 minutes. Website, payments, booking, reviews — all set up instantly.",
  keywords: [
    "local service",
    "holiday lights",
    "seasonal business",
    "booking",
    "microsite",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
