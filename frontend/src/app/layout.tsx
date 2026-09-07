import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { AuthProvider } from "@/components/auth/AuthProvider";
import Footer from "@/components/navigation/Footer";
import Navbar from "@/components/navigation/Navbar";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Bangladesh Crime Monitor",
    template: "%s · Bangladesh Crime Monitor",
  },
  description:
    "Continuous open-source crime tracking for Bangladesh. Incidents are compiled from public news reporting and public official channels, geolocated to police thana, and published with a link back to the original source.",
  keywords: [
    "Bangladesh",
    "Dhaka",
    "crime data",
    "OSINT",
    "public safety",
    "open data",
  ],
  openGraph: {
    title: "Bangladesh Crime Monitor",
    description:
      "Open-source crime intelligence for Bangladesh, updated every six hours.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark`}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
