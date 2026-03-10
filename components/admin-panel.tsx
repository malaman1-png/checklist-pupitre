"use client"

import { useState } from "react"
import { AdminTypes } from "@/components/admin/admin-types"
import { AdminMateriel } from "@/components/admin/admin-materiel"
import { AdminSettings } from "@/components/admin/admin-settings"
import { AdminArtists } from "@/components/admin/admin-artists"
import { AdminAlwaysItems } from "@/components/admin/admin-always-items"
import { AdminTransport } from "@/components/admin/admin-transport"
import { AdminKitchen } from "@/components/admin/admin-kitchen"
import { AdminEtincelle } from "@/components/admin/admin-etincelle"
import {
  Palette,
  Package,
  SlidersHorizontal,
  Users,
  PackageCheck,
  Train,
  ChefHat,
  Sparkles,
} from "lucide-react"

type AdminSection =
  | "menu"
  | "kitchen"
  | "types"
  | "materiel"
  | "son"
  | "light"
  | "fixed"
  | "modular"
  | "artists"
  | "always"
  | "transport"
  | "etincelle"
  | "display_order"
  | "settings"

const sections = [
  { key: "kitchen" as const, label: "La cuisine", icon: ChefHat, desc: "SON/LIGHT + Actes + ordre d'affichage" },
  { key: "types" as const, label: "Types", icon: Palette, desc: "Categories et couleurs" },
  { key: "materiel" as const, label: "Materiel", icon: Package, desc: "Objets et equipements" },
  { key: "artists" as const, label: "Artistes", icon: Users, desc: "Profils et objets personnalises" },
  { key: "etincelle" as const, label: "Etincelle", icon: Sparkles, desc: "Versions + Sound system + artistes specifiques" },
  { key: "always" as const, label: "Materiel pris d'office", icon: PackageCheck, desc: "Inclus dans toutes les checklists" },
  { key: "transport" as const, label: "Transport TRAIN", icon: Train, desc: "Exclusions, remplacements, ajouts en mode train" },
  { key: "settings" as const, label: "Reglages", icon: SlidersHorizontal, desc: "Preferences de l'app" },
]

export function AdminPanel() {
  const [section, setSection] = useState<AdminSection>("menu")

  if (section === "menu") {
    return (
      <div className="p-4">
        <header className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Base / Admin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configuration du materiel et des actes
          </p>
        </header>
        <div className="flex flex-col gap-2">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-secondary"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const onBack = () => setSection("menu")

  // Redirect old routes to kitchen
  if (["son", "light", "fixed", "modular", "display_order"].includes(section)) {
    return <AdminKitchen onBack={onBack} />
  }

  return (
    <>
      {section === "kitchen" && <AdminKitchen onBack={onBack} />}
      {section === "types" && <AdminTypes onBack={onBack} />}
      {section === "materiel" && <AdminMateriel onBack={onBack} />}
      {section === "artists" && <AdminArtists onBack={onBack} />}
      {section === "etincelle" && <AdminEtincelle onBack={onBack} />}
      {section === "always" && <AdminAlwaysItems onBack={onBack} />}
      {section === "transport" && <AdminTransport onBack={onBack} />}
      {section === "settings" && <AdminSettings onBack={onBack} />}
    </>
  )
}
