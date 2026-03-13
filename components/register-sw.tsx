"use client"

import { useEffect } from "react"

export function RegisterSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((registration) => {
          // #region agent log
          fetch("http://127.0.0.1:7591/ingest/f7af43cc-7c25-4b2a-8f50-6109c1f1a694", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9a66a7" },
            body: JSON.stringify({
              sessionId: "9a66a7",
              runId: "run-404-1",
              hypothesisId: "H1",
              location: "components/register-sw.tsx:RegisterSW",
              message: "service worker registration success",
              data: {
                scope: registration.scope,
                active: !!registration.active,
                waiting: !!registration.waiting,
                installing: !!registration.installing,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {})
          // #endregion
        })
        .catch(() => {
          // #region agent log
          fetch("http://127.0.0.1:7591/ingest/f7af43cc-7c25-4b2a-8f50-6109c1f1a694", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9a66a7" },
            body: JSON.stringify({
              sessionId: "9a66a7",
              runId: "run-404-1",
              hypothesisId: "H1",
              location: "components/register-sw.tsx:RegisterSW",
              message: "service worker registration failed",
              data: {},
              timestamp: Date.now(),
            }),
          }).catch(() => {})
          // #endregion
        })
    }
  }, [])

  return null
}
