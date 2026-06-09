"use client";

import { useEffect } from "react";

/** Registra el service worker (PWA instalable + offline). No renderiza nada. */
export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
