'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'

interface Props {
  naoLidas: number
  nomeUsuario: string
  tipoUsuario: string
  moduloSlugs: string[]
  children: React.ReactNode
}

export default function ShellClient({ naoLidas, nomeUsuario, tipoUsuario, moduloSlugs, children }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Backdrop mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar wrapper */}
      <div
        style={{ transition: 'transform 0.3s ease' }}
        className={
          open
            ? 'fixed inset-y-0 left-0 z-50 translate-x-0 md:relative md:z-auto md:translate-x-0'
            : 'fixed inset-y-0 left-0 z-50 -translate-x-full md:relative md:z-auto md:translate-x-0'
        }
      >
        <Sidebar
          naoLidas={naoLidas}
          nomeUsuario={nomeUsuario}
          tipoUsuario={tipoUsuario}
          moduloSlugs={moduloSlugs}
        />
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra topo mobile */}
        <div className="flex items-center h-12 px-3 bg-white border-b border-gray-100 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <span className="ml-2 text-sm font-bold" style={{ color: '#1A3A8A' }}>
            DISDAL CORP
          </span>
        </div>

        {children}
      </main>
    </div>
  )
}
