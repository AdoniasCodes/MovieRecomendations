import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Amore Movies — what should we watch?",
  description: "A discovery hub built for two. Mood-based picks, swipe, match, watch together.",
  applicationName: "Amore Movies",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Amore" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-aurora" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
