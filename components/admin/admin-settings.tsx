"use client"

import { useState } from "react"
import { useSettings, globalMutate } from "@/lib/hooks"
import { adminSetPassword, adminUpdate, setAdminPassword } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Loader2 } from "lucide-react"

export function AdminSettings({ onBack }: { onBack: () => void }) {
  const { data: settings, isLoading } = useSettings()
  const [newPassword, setNewPassword] = useState("")
  const [passwordMsg, setPasswordMsg] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  async function update(field: string, value: string | number | boolean) {
    if (!settings) return
    await adminUpdate("settings", { [field]: value }, { id: settings.id })
    globalMutate("settings_singleton")
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
