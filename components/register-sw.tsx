"use client"

import { useEffect } from "react"

export function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    // Stabilite: desactive le SW localement pour eviter les ecrans vides
    // causes par des chunks mis en cache apres changements frequents.
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch(() => {})

    if ("caches" in window) {
      caches.keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("pupitre-"))
              .map((key) => caches.delete(key))
          )
        )
        .catch(() => {})
    }
  }, [])

  return null
}
