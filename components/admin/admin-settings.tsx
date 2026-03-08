"use client"

import { useSettings, globalMutate } from "@/lib/hooks"
import { adminUpdate } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Loader2 } from "lucide-react"

export function AdminSettings({ onBack }: { onBack: () => void }) {
  const { data: settings, isLoading } = useSettings()

  async function update(field: string, value: string | number | boolean) {
    if (!settings) return
    await adminUpdate("settings", { [field]: value }, { id: settings.id })
    globalMutate("settings_singleton")
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

        {/* Admin password info */}
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm font-medium text-foreground block mb-1">
            Mot de passe Control Room
          </label>
          <p className="text-xs text-muted-foreground">
            {"Gere via la variable d'environnement ADMIN_PASSWORD sur le serveur. Non modifiable ici."}
          </p>
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
