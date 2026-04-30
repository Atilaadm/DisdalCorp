'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface ToastProps {
  mensagem: string
  tipo: 'sucesso' | 'erro'
  onFechar: () => void
}

export default function Toast({ mensagem, tipo, onFechar }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onFechar, 4000)
    return () => clearTimeout(timer)
  }, [onFechar])

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border max-w-sm animate-in slide-in-from-bottom-2 ${
        tipo === 'sucesso'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
      }`}
    >
      {tipo === 'sucesso' ? (
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
      )}
      <span className="text-sm font-medium flex-1">{mensagem}</span>
      <button onClick={onFechar} className="text-current opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ mensagem: string; tipo: 'sucesso' | 'erro' } | null>(null)

  const mostrar = (mensagem: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ mensagem, tipo })
  }

  const fechar = () => setToast(null)

  const ToastComponent = toast ? (
    <Toast mensagem={toast.mensagem} tipo={toast.tipo} onFechar={fechar} />
  ) : null

  return { mostrar, ToastComponent }
}
