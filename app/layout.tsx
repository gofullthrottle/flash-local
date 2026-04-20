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
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0f172a" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className="min-h-screen font-sans antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
