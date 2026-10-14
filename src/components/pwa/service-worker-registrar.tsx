"use client";

import { useEffect } from "react";

/**
 * Removes whatever worker and asset cache a production run left on this origin.
 *
 * `next start` and `next dev` both live on localhost, so a worker installed by a
 * production check stays installed in development and answers `/_next/static`
 * from its cache — edits then never showed until a manual refresh.
 */
async function clearLeftoverWorkers(): Promise<void> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));

  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

/**
 * Registers the asset-caching service worker that makes the app installable.
 *
 * In development it does the opposite and clears any worker already there: a
 * cached build artefact is only ever a source of confusion.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void clearLeftoverWorkers().catch(() => {
        // Nothing to clear is the usual case; a failure leaves development as it was.
      });
      return;
    }

    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // An unavailable service worker costs installability, never correctness.
    });
  }, []);

  return null;
}
