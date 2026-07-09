"use client";

import { useEffect } from "react";

export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    let refreshing = false;
    // Only reload when an UPDATE takes over (a controller already existed), not
    // on the first-ever install. Guard against reload loops with `refreshing`.
    const hadController = !!navigator.serviceWorker.controller;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload(); // pick up fresh HTML + chunks, never strand on old code
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let reg: ServiceWorkerRegistration | undefined;
    const onVisible = () => {
      if (document.visibilityState === "visible") reg?.update().catch(() => {});
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => {
        reg = r;
        r.update().catch(() => {}); // check for a newer worker on load
        document.addEventListener("visibilitychange", onVisible); // and on foreground
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
