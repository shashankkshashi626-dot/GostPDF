import * as React from "react"
import { X, CheckCircle, AlertCircle, Info } from "lucide-react"

export interface Toast {
  id: string
  title?: string
  description: string
  variant?: 'default' | 'success' | 'destructive'
}

type ToastContextType = {
  toasts: Toast[]
  toast: (options: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback(({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, title, description, variant }])
    
    // Auto dismiss after 4 seconds
    setTimeout(() => {
      dismiss(id)
    }, 4000)
  }, [])

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[], dismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg pointer-events-auto transition-all duration-300 ${
            t.variant === 'destructive'
              ? 'bg-red-950/95 text-red-200 border-red-800/50'
              : t.variant === 'success'
              ? 'bg-zinc-900/95 text-zinc-100 border-emerald-500/20'
              : 'bg-zinc-900/95 text-zinc-100 border-zinc-800'
          }`}
        >
          {t.variant === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
          {t.variant === 'destructive' && <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
          {t.variant === 'default' && <Info className="h-5 w-5 text-zinc-400 shrink-0 mt-0.5" />}
          
          <div className="flex-1 flex flex-col gap-0.5">
            {t.title && <div className="font-semibold text-sm">{t.title}</div>}
            <div className="text-xs opacity-90">{t.description}</div>
          </div>

          <button
            onClick={() => dismiss(t.id)}
            className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
