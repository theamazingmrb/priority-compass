import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import AppShell from "@/components/app-shell";
import { SpotifyProvider } from "@/lib/spotify-context";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ThemeProvider } from "next-themes";
import OnboardingTrigger from "@/components/layout/OnboardingTrigger";
import QuickAddProvider from "@/components/QuickAddProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Priority Compass",
  description: "Stay focused on what matters most.",
  // Enable PWA capabilities for push notifications
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <AuthProvider>
            <SpotifyProvider>
              <SidebarProvider>
                <QuickAddProvider>
                  <OnboardingTrigger>
                    <AppShell>{children}</AppShell>
                    <Toaster position="top-right" richColors closeButton />
                    <ServiceWorkerRegistration />
                  </OnboardingTrigger>
                </QuickAddProvider>
              </SidebarProvider>
            </SpotifyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
