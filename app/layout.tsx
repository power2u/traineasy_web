import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppShell } from "@/components/layout/app-shell";
import ErrorBoundary from "@/components/error-boundary";
import { TimezoneSync } from "@/components/auth/timezone-sync";
import { FCMForegroundHandler } from "@/components/notifications/fcm-foreground-handler";
import { NotificationPermissionPrompt } from "@/components/notifications/notification-permission-prompt";
import { FCMTokenManager } from "@/components/auth/fcm-token-manager";
import { initializeApp } from "@/lib/startup/initialize";

export const metadata: Metadata = {
  title: "Fitness Tracker",
  description: "Track your water intake, meals, and weight",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Fitness Tracker",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

import { MaintenanceBanner } from "@/components/ui/maintenance-banner";

// Initialize the application on startup
initializeApp();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ErrorBoundary>
          <Providers>
            <FCMForegroundHandler />
            <FCMTokenManager />
            <MaintenanceBanner />
            <TimezoneSync />
            <AppShell>{children}</AppShell>
            <NotificationPermissionPrompt />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
