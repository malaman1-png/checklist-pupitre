"use client"

import { useEffect, useState } from "react"
import { useSettings, globalMutate } from "@/lib/hooks"
import { adminSetPassword, adminUpdate, setAdminPassword } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Loader2 } from "lucide-react"
import {
  DEFAULT_TOUCH_TAP_SLOP_PX,
  MAX_TOUCH_TAP_SLOP_PX,
  MIN_TOUCH_TAP_SLOP_PX,
  clampTouchTapSlopPx,
  getTouchTapSlopPxFromSettings,
} from "@/lib/ui-settings"

export function AdminSettings({ onBack }: { onBack: () => void }) {
  const { data: settings, isLoading } = useSettings()
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [settingsMsg, setSettingsMsg] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [touchTapSlopPxDraft, setTouchTapSlopPxDraft] = useState<number>(DEFAULT_TOUCH_TAP_SLOP_PX)
  const [savingTouchTapSlop, setSavingTouchTapSlop] = useState(false)

  async function update(field: string, value: string | number | boolean): Promise<boolean> {
    if (!settings) return false
    const res = await adminUpdate("settings", { [field]: value }, { id: settings.id })
    if (res.error) {
      setSettingsMsg(
        res.error === "Unauthorized"
          ? "Session admin expiree. Reouvre la Control Room avec le mot de passe."
          : res.error
      )
      if (res.error === "Unauthorized") {
        setAdminPassword("")
        try { localStorage.removeItem("cr_access_ts") } catch {}
      }
      return false
    }
    setSettingsMsg("")
    globalMutate("settings_singleton")
    return true
  }

  async function handlePasswordChange() {
    const next = newPassword.trim()
    if (next.length < 4) {
      setPasswordMsg("Le mot de passe doit contenir au moins 4 caracteres.")
      return
    }

    setSavingPassword(true)
    setPasswordMsg("")
    const res = await adminSetPassword(next)
    setSavingPassword(false)

    if (res.error) {
      setPasswordMsg(res.error)
      return
    }

    // Keep current session authenticated with the new password
    setAdminPassword(next)
    setNewPassword("")
    setPasswordMsg("Mot de passe mis a jour.")
  }

  useEffect(() => {
    if (!settings) return
    setTouchTapSlopPxDraft(getTouchTapSlopPxFromSettings(settings))
  }, [settings])

  async function commitTapSlop() {
    if (!settings || savingTouchTapSlop) return
    const current = getTouchTapSlopPxFromSettings(settings)
    const next = clampTouchTapSlopPx(touchTapSlopPxDraft)
    if (next === current) return
    setSavingTouchTapSlop(true)
    try {
      const ok = await update("touch_tap_slop_px", next)
      if (!ok) setTouchTapSlopPxDraft(current)
    } finally {
      setSavingTouchTapSlop(false)
    }
  }

  if (isLoading || !settings) {
    return (
      <div className="p-4">
        <AdminHeader title="Reglages" onBack={onBack} />
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <AdminHeader title="Reglages" onBack={onBack} />

      <div className="flex flex-col gap-4">
        {/* Confetti */}
        <label className="flex items-center justify-between rounded-lg border border-border bg-card p-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-foreground">Confettis</p>
            <p className="text-xs text-muted-foreground">Animation quand tout est coche</p>
          </div>
          <input
            type="checkbox"
            checked={settings.confetti_enabled}
            onChange={(e) => update("confetti_enabled", e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
        </label>

        {/* Sound */}
        <label className="flex items-center justify-between rounded-lg border border-border bg-card p-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-foreground">Son</p>
            <p className="text-xs text-muted-foreground">{"\"TINDIIIN\" kitsch a la fin"}</p>
          </div>
          <input
            type="checkbox"
            checked={settings.sound_enabled}
            onChange={(e) => update("sound_enabled", e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
        </label>

        {/* Mobile back button confirmation */}
        <label className="flex items-center justify-between rounded-lg border border-border bg-card p-4 cursor-pointer">
          <div>
            <p className="text-sm font-medium text-foreground">Confirmation retour mobile</p>
            <p className="text-xs text-muted-foreground">Bouton Android Back + auto-restore checklist</p>
          </div>
          <input
            type="checkbox"
            checked={settings.mobile_back_confirm_enabled ?? true}
            onChange={(e) => update("mobile_back_confirm_enabled", e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
        </label>

        {/* Anti miss-clic (global setting) */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-medium text-foreground block mb-1">
            Anti miss-clic
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Tolere un leger glissement du doigt pendant un tap. Ce reglage est global a tous les appareils.
          </p>
          <input
            type="range"
            min={MIN_TOUCH_TAP_SLOP_PX}
            max={MAX_TOUCH_TAP_SLOP_PX}
            step={1}
            value={touchTapSlopPxDraft}
            onChange={(e) => setTouchTapSlopPxDraft(clampTouchTapSlopPx(Number(e.target.value)))}
            onPointerUp={() => { void commitTapSlop() }}
            onMouseUp={() => { void commitTapSlop() }}
            onTouchEnd={() => { void commitTapSlop() }}
            onBlur={() => { void commitTapSlop() }}
            className="w-full accent-primary"
          />
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Strict</span>
            <span className="font-medium text-foreground">
              {touchTapSlopPxDraft === 0 ? "Desactive" : `${touchTapSlopPxDraft}px`}
            </span>
            <span>Tolerant</span>
          </div>
          {savingTouchTapSlop && (
            <p className="mt-2 text-xs text-muted-foreground">Enregistrement...</p>
          )}
        </div>
        {!!settingsMsg && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {settingsMsg}
          </p>
        )}

        {/* Admin password */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-medium text-foreground block mb-1">
            Mot de passe Control Room
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Change le mot de passe de la Control Room pour tous les appareils.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            />
            <button
              onClick={handlePasswordChange}
              disabled={savingPassword}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {savingPassword ? "Enregistrement..." : "Mettre a jour"}
            </button>
          </div>
          {!!passwordMsg && (
            <p className="mt-2 text-xs text-muted-foreground">{passwordMsg}</p>
          )}
        </div>

        {/* Auto delete */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-medium text-foreground block mb-1">
            Auto-suppression des projets
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Nombre de jours avant suppression (0 = desactive)
          </p>
          <input
            type="number"
            min="0"
            value={settings.auto_delete_days}
            onChange={(e) => update("auto_delete_days", parseInt(e.target.value) || 0)}
            className="w-24 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          />
        </div>
      </div>
    </div>
  )
}
