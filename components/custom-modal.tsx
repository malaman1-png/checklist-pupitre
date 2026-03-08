"use client"

interface CustomModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function CustomModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  onCancel,
}: CustomModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 pb-safe">
      <div 
        className="mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 mb-24 sm:mb-0"
        style={{ marginBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
      >
        <h2 className="text-base font-semibold text-foreground mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground mb-5">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-secondary py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
