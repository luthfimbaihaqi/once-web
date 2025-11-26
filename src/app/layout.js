import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

// KONFIGURASI METADATA (SEO & JUDUL)
export const metadata = {
  title: "ONCE.",
  description: "Share your truth, just once a day. No filters, no followers, just moments.",
  manifest: "/manifest.json", // Link ke file manifest (kita buat di langkah 2)
  themeColor: "#000000",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1, // Mencegah zoom in di HP biar kerasa kayak app native
    userScalable: false,
  },
  icons: {
    icon: "/icon.png",       // Ikon utama di Tab Browser
    shortcut: "/icon.png",   // Ikon untuk shortcut desktop
    apple: "/icon.png",      // Ikon untuk iPhone/iPad (Home Screen)
  },
};

export const viewport = {
  themeColor: "#050505",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="bg-[#050505]">
      <head>
        {/* Mencegah iOS zoom saat tap input form */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}