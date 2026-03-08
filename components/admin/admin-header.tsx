"use client"

import { ArrowLeft } from "lucide-react"

interface AdminHeaderProps {
  title: string
  onBack: () => void
}

export function AdminHeader({ title, onBack }: AdminHeaderProps) {
  return (
    <header className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        aria-label="Retour"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
    </header>
  )
}
