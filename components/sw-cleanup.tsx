"use client";

import { useEffect } from "react";

/**
 * Component to clean up stale service workers in development mode.
 * This prevents production service workers from precaching stale assets
 * or causing 404/hydration errors during development.
 */
export function SwCleanup() {
    useEffect(() => {
        if (process.env.NODE_ENV === "development" && "serviceWorker" in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    console.log("[PWA] Unregistering service worker in development:", registration);
                    registration.unregister();
                }
            });
        }
    }, []);

    return null;
}
