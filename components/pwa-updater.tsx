"use client";

import { useEffect } from "react";
import { toast } from "sonner";

declare global {
    interface Window {
        workbox: any;
    }
}

export function PwaUpdater() {
    useEffect(() => {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            window.workbox !== undefined
        ) {
            const wb = window.workbox;

            // Add event listeners for PWA lifecycle events
            wb.addEventListener("waiting", () => {
                // A new service worker has installed but is waiting to activate
                showUpdateToast(wb);
            });

            wb.addEventListener("controlling", () => {
                // This fires when the new service worker takes control
                window.location.reload();
            });

            // Register the service worker
            wb.register();
        }
    }, []);

    const showUpdateToast = (wb: any) => {
        toast("New version available!", {
            description: "Click to update and see the latest changes.",
            duration: Infinity,
            action: {
                label: "Update",
                onClick: () => {
                    // Send message to skip waiting and activate the new SW
                    wb.messageSkipWaiting();
                },
            },
            cancel: {
                label: "Dismiss",
                onClick: () => {
                    // Dismissal does nothing, user stays on old version until restart
                }
            }
        });
    };

    return null; // Logic-only component
}
