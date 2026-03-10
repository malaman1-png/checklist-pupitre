"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { SWRConfig } from "swr"
import { loadSWRCache, saveSWREntry } from "@/lib/swr-offline-cache"
import { ProjectList } from "@/components/project-list"
import { ProjectConfig } from "@/components/project-config"
import { ChecklistView } from "@/components/checklist-view"

import { AdminPanel } from "@/components/admin-panel"
import { CustomModal } from "@/components/custom-modal"
import { useSettings, supabase, globalMutate } from "@/lib/hooks"
import { setAdminPassword } from "@/lib/admin-api"
import { ClipboardList, Settings, Lock, X, Type } from "lucide-react"

type View =
  | { type: "projects" }
  | { type: "config"; projectId: string }
  | { type: "checklist"; projectId: string }

const HOME: View = { type: "projects" }

function HomeInner() {
  const [view, setView] = useState<View>(HOME)
  const [tab, setTab] = useState<"projets" | "base">("projets")
  const [hydrated, setHydrated] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")
  const [passwordError, setPasswordError] = useState(false)
  const [passwordErrorMsg, setPasswordErrorMsg] = useState("")
  const [showExitPopup, setShowExitPopup] = useState(false)
  const [fontLevel, setFontLevel] = useState<1 | 2 | 3>(() => {
    if (typeof window === "undefined") return 1
    try {
      const stored = localStorage.getItem("chk_font_level")
      return stored === "2" ? 2 : stored === "3" ? 3 : 1
    } catch { return 1 }
  })

  // Keep a simple history stack for internal back navigation
  const historyStack = useRef<View[]>([])

  // Refs for popstate handler (avoids re-creating listener)
  const viewRef = useRef(view)
  const tabRef = useRef(tab)
  const showPasswordModalRef = useRef(showPasswordModal)
  viewRef.current = view
  tabRef.current = tab
  showPasswordModalRef.current = showPasswordModal

  const { data: settings } = useSettings()
  const mobileBackConfirmEnabled = ((settings as any)?.mobile_back_confirm_enabled ?? true) as boolean

  // ---- Hydration ----
  useEffect(() => { setHydrated(true) }, [])

  // ---- Auto-delete old checklists ----
  useEffect(() => {
    if (!settings) return
    const days = (settings as any).auto_delete_days
    if (!days || days <= 0) return

    const runAutoDelete = async () => {
      // Use server date when possible to avoid client clock skew deleting too much.
      let now = new Date()
      try {
        const res = await fetch("/", { method: "HEAD", cache: "no-store" })
        const serverDate = res.headers.get("date")
        if (serverDate) {
          const parsed = new Date(serverDate)
          if (!Number.isNaN(parsed.getTime())) now = parsed
        }
      } catch {
        // Fallback to local clock if server date is unavailable
      }

      const cutoff = new Date(now)
      cutoff.setDate(cutoff.getDate() - days)

      const { error } = await supabase
        .from("projects")
        .delete()
        .lt("created_at", cutoff.toISOString())

      if (!error) globalMutate("projects|created_at|desc")
    }

    void runAutoDelete()
  }, [settings])

  // ---- Android back button (history guard + popstate) ----
  useEffect(() => {
    if (!mobileBackConfirmEnabled) return

    // Push a guard entry so pressing back doesn't leave the app
    window.history.pushState({ guard: true }, "")

    const handlePopstate = () => {
      // Always re-push the guard to keep intercepting
      window.history.pushState({ guard: true }, "")

      // 1. Password modal open → close it
      if (showPasswordModalRef.current) {
        setShowPasswordModal(false)
        return
      }

      // 2. On Control Room tab → go back to projets
      if (tabRef.current === "base") {
        setTab("projets")
        return
      }

      // 3. On config or checklist → internal goBack
      if (viewRef.current.type === "config" || viewRef.current.type === "checklist") {
        const prev = historyStack.current.pop()
        if (prev) {
          setView(prev)
        } else {
          setView(HOME)
        }
        return
      }

      // 4. On home screen → show exit popup
      setShowExitPopup(true)
    }

    window.addEventListener("popstate", handlePopstate)
    return () => window.removeEventListener("popstate", handlePopstate)
  }, [mobileBackConfirmEnabled])

  // ---- Auto-restore last checklist on mount ----
  useEffect(() => {
    if (!hydrated) return
    const restore = async () => {
      try {
        const saved = localStorage.getItem("last_open_checklist")
        if (!saved) return
        const { projectId, timestamp } = JSON.parse(saved)
        if (Date.now() - timestamp >= 24 * 60 * 60 * 1000) {
          localStorage.removeItem("last_open_checklist")
          return
        }
        // Verify project still exists in DB before opening
        const { data } = await supabase
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .single()
        if (data) {
          historyStack.current = [HOME]
          setView({ type: "checklist", projectId })
        } else {
          localStorage.removeItem("last_open_checklist")
        }
      } catch {
        localStorage.removeItem("last_open_checklist")
      }
    }
    restore()
  }, [hydrated])

  // ---- Save checklist id when viewing one ----
  useEffect(() => {
    if (view.type === "checklist") {
      localStorage.setItem(
        "last_open_checklist",
        JSON.stringify({ projectId: view.projectId, timestamp: Date.now() })
      )
    }
  }, [view])

  // ---- Navigation helpers ----
  const navigateTo = useCallback((newView: View) => {
    setShowExitPopup(false)
    setView(prev => {
      historyStack.current.push(prev)
      return newView
    })
  }, [])

  const goBack = useCallback(() => {
    const prev = historyStack.current.pop()
    if (prev) {
      setView(prev)
    } else {
      setView(HOME)
    }
  }, [])

  const goHome = useCallback(() => {
    localStorage.removeItem("last_open_checklist")
    historyStack.current = []
    setView(HOME)
    setTab("projets")
  }, [])

  // ---- Font size ----
  function cycleFontLevel() {
    const next: 1 | 2 | 3 = fontLevel === 1 ? 2 : fontLevel === 2 ? 3 : 1
    setFontLevel(next)
    try { localStorage.setItem("chk_font_level", String(next)) } catch {}
  }

  // ---- Admin session ----
  const SESSION_KEY = "cr_access_ts"
  const ONE_HOUR = 60 * 60 * 1000

  const isSessionValid = useCallback(() => {
    try {
      const ts = localStorage.getItem(SESSION_KEY)
      if (!ts) return false
      return Date.now() - Number(ts) < ONE_HOUR
    } catch { return false }
  }, [])

  function openProject(projectId: string, generated: boolean) {
    if (generated) {
      navigateTo({ type: "checklist", projectId })
    } else {
      navigateTo({ type: "config", projectId })
    }
  }

  function handleControlRoomClick() {
    if (tab === "base") return
    if (isSessionValid()) {
      setTab("base")
      return
    }
    setShowPasswordModal(true)
    setPasswordInput("")
    setPasswordError(false)
  }

  async function handlePasswordSubmit() {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": passwordInput,
        },
        body: JSON.stringify({ action: "ping", table: "settings" }),
      })
      if (res.status === 401) {
        setPasswordError(true)
        setPasswordErrorMsg("Mot de passe incorrect.")
        return
      }
      if (!res.ok) {
        setPasswordError(true)
        setPasswordErrorMsg("Erreur serveur. Reessaie plus tard.")
        return
      }
    } catch {
      setPasswordError(true)
      setPasswordErrorMsg("Impossible de contacter le serveur. Verifie ta connexion.")
      return
    }
    setAdminPassword(passwordInput)
    try { localStorage.setItem(SESSION_KEY, String(Date.now())) } catch {}
    setShowPasswordModal(false)
    setTab("base")
    setPasswordError(false)
    setPasswordErrorMsg("")
  }

  // ---- Loading ----
  if (!hydrated) {
    return (
      <div className="flex flex-col h-dvh items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-dvh">
      <div className={`flex-1 overflow-y-auto ${view.type === "checklist" || tab === "base" ? "pb-16" : ""}`}>
        {tab === "projets" && (
          <>
            {view.type === "projects" && (
              <ProjectList
                onOpen={openProject}
                onEdit={(id) => navigateTo({ type: "config", projectId: id })}
                onNew={(id) => navigateTo({ type: "config", projectId: id })}
                onControlRoom={handleControlRoomClick}
              />
            )}
            {view.type === "config" && (
              <ProjectConfig
                projectId={view.projectId}
                onBack={async () => {
                  // Delete non-generated project when user goes back
                  const { data: project } = await supabase
                    .from("projects")
                    .select("generated")
                    .eq("id", view.projectId)
                    .single()
                  
                  if (project && !project.generated) {
                    await supabase.from("projects").delete().eq("id", view.projectId)
                  }
                  
                  goBack()
                }}
                onGenerated={() =>
                  navigateTo({ type: "checklist", projectId: view.projectId })
                }
              />
            )}
            {view.type === "checklist" && (
              <ChecklistView
                projectId={view.projectId}
                onBack={goBack}
                onEdit={() => navigateTo({ type: "config", projectId: view.projectId })}
                fontLevel={fontLevel}
              />
            )}

          </>
        )}
        {tab === "base" && <AdminPanel />}
      </div>

      {/* Password modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">Control Room</h2>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Entrez le mot de passe pour acceder a la Control Room.</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value)
                setPasswordError(false)
              }}
              onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit() }}
              placeholder="Mot de passe"
              className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
              {passwordError && (
                <p className="text-xs text-destructive mt-2">{passwordErrorMsg || "Mot de passe incorrect."}</p>
              )}
            <button
              onClick={handlePasswordSubmit}
              className="mt-4 w-full rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Valider
            </button>
          </div>
        </div>
      )}

      {/* Exit confirmation popup */}
      {showExitPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground mb-2">Quitter l{"'"}application ?</h2>
            <p className="text-sm text-muted-foreground mb-5">Tu es sur le point de quitter Checklist Pupitre.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitPopup(false)}
                className="flex-1 rounded-lg border border-border bg-secondary py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowExitPopup(false)
                  // Pop the guard entry + actually leave
                  window.history.go(-2)
                }}
                className="flex-1 rounded-lg bg-destructive py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar only when a checklist is open or admin panel */}
      {((view.type === "checklist" && tab === "projets") || tab === "base") && (
        <nav
          className="fixed bottom-0 inset-x-0 flex border-t border-border bg-card z-50"
          role="tablist"
        >
          <button
            role="tab"
            aria-selected={false}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={goHome}
          >
            <ClipboardList className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button
            role="tab"
            aria-selected={false}
            className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={cycleFontLevel}
          >
            <Type className="h-5 w-5" />
            <span>Gros doigts</span>
          </button>
        </nav>
      )}
    </div>
  )
}

export default function Home() {
  const [fallback] = useState(() => loadSWRCache())

  return (
    <SWRConfig value={{
      fallback,
      onSuccess: (data: any, key: string) => {
        saveSWREntry(key, data)
      },
    }}>
      <HomeInner />
    </SWRConfig>
  )
}
