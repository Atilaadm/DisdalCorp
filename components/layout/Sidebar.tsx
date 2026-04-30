'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Users, FileText, DollarSign,
  Calendar, Bell, LogOut, ChevronRight, Shield,
} from 'lucide-react'
import { useState } from 'react'
import LogoDisdal from '@/components/ui/LogoDisdal'

const navItems = [
  { href: '/',             label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/prestadores',  label: 'Prestadores',  icon: Users },
  { href: '/contratos',    label: 'Contratos',    icon: FileText },
  { href: '/financeiro',   label: 'Financeiro',   icon: DollarSign },
  { href: '/recessos',     label: 'Recessos',     icon: Calendar },
  { href: '/notificacoes', label: 'Notificações', icon: Bell },
]

const adminItems = [
  { href: '/admin', label: 'Administração', icon: Shield },
]

interface SidebarProps {
  naoLidas?: number
  nomeUsuario?: string
  tipoUsuario?: string
}

export default function Sidebar({ naoLidas = 0, nomeUsuario = '', tipoUsuario = '' }: SidebarProps) {
  const pathname = usePathname()
  const [saindo, setSaindo] = useState(false)

  async function handleLogout() {
    setSaindo(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-white border-r border-gray-100 shadow-sm">
      {/* Logo */}
      <div
        className="flex items-center justify-center px-5 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(to bottom, #eef3ff, #ffffff)', minHeight: 72 }}
      >
        <LogoDisdal height={40} />
      </div>

      {/* Barra de cores da marca */}
      <div className="h-0.5 w-full"
        style={{ background: 'linear-gradient(to right, #1A3A8A, #4DB848, #C8D42A, #009B94)' }} />

      {/* Label */}
      <div className="px-4 pt-4 pb-1">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
          Menu Principal
        </span>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          const hasNotification = href === '/notificacoes' && naoLidas > 0

          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                active ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-gray-900'
              }`}
              style={active ? { backgroundColor: '#1A3A8A' } : {}}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 transition-colors ${
                  active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                }`}
              />
              <span className="flex-1">{label}</span>
              {hasNotification && (
                <span
                  className="flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold"
                  style={{ backgroundColor: '#C8D42A', color: '#1A3A8A' }}
                >
                  {naoLidas > 9 ? '9+' : naoLidas}
                </span>
              )}
              {active && <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
            </Link>
          )
        })}

        {/* Seção Admin — visível apenas para administradores */}
        {tipoUsuario === 'administrador' && (
          <>
            <div className="pt-3 pb-1">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 px-3">
                Sistema
              </span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => {
              const active = isActive(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    active ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-blue-50 hover:text-gray-900'
                  }`}
                  style={active ? { backgroundColor: '#1A3A8A' } : {}}
                >
                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-colors ${
                      active ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'
                    }`}
                  />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* Usuário + Sair */}
      <div className="px-3 py-4 border-t border-gray-100">
        {nomeUsuario && (
          <div className="px-3 py-2.5 mb-1 rounded-lg" style={{ background: '#eef3ff' }}>
            <p className="text-xs font-semibold truncate" style={{ color: '#1A3A8A' }}>
              {nomeUsuario}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {{
                administrador:       '⚡ Administrador',
                analista_financeiro: '📊 Analista Financeiro',
                coordenador:         '📋 Coordenador',
                gerente:             '📌 Gerente',
                supervisor:          '🔍 Supervisor',
                diretor:             '🏆 Diretor',
              }[tipoUsuario] ?? tipoUsuario}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={saindo}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
        >
          <LogOut size={16} />
          {saindo ? 'Saindo...' : 'Sair do sistema'}
        </button>
      </div>
    </aside>
  )
}
