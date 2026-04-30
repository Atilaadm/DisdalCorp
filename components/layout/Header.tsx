'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  titulo: string
  subtitulo?: string
  naoLidas?: number
  acoes?: React.ReactNode
}

export default function Header({ titulo, subtitulo, naoLidas = 0, acoes }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold" style={{ color: '#1A3A8A' }}>{titulo}</h1>
        {subtitulo && <p className="text-sm text-gray-400 mt-0.5">{subtitulo}</p>}
      </div>

      <div className="flex items-center gap-3">
        {acoes}
        <Link
          href="/notificacoes"
          className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Bell size={20} />
          {naoLidas > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-xs rounded-full font-bold"
              style={{ backgroundColor: '#C8D42A', color: '#1A3A8A' }}
            >
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}
