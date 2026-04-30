'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  aberto: boolean
  onFechar: () => void
  titulo: string
  children: React.ReactNode
  tamanho?: 'sm' | 'md' | 'lg'
}

export default function Modal({ aberto, onFechar, titulo, children, tamanho = 'md' }: ModalProps) {
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [aberto])

  if (!aberto) return null

  const tamanhos = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onFechar}
      />
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${tamanhos[tamanho]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
          <button
            onClick={onFechar}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
