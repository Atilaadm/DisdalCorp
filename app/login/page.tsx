'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Lock, Mail, Eye, EyeOff } from 'lucide-react'
import LogoDisdal from '@/components/ui/LogoDisdal'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

    if (error) {
      setErro('E-mail ou senha incorretos. Tente novamente.')
      setCarregando(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060D2C 0%, #0D1E45 50%, #0B1A38 100%)' }}
    >
      {/* Decorações de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4DB848, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #009B94, transparent 70%)' }} />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #C8D42A, transparent 70%)' }} />
        <div className="absolute top-0 right-1/3 w-px h-full opacity-10"
          style={{ background: 'linear-gradient(to bottom, transparent, #C8D42A, transparent)' }} />
        <div className="absolute top-0 right-1/4 w-px h-full opacity-5"
          style={{ background: 'linear-gradient(to bottom, transparent, #C8D42A, transparent)' }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Barra de cor da marca */}
          <div className="h-1.5 w-full"
            style={{ background: 'linear-gradient(to right, #1A3A8A 0%, #4DB848 40%, #C8D42A 70%, #009B94 100%)' }} />

          {/* Área do logo */}
          <div className="flex flex-col items-center pt-8 pb-5 px-8"
            style={{ background: 'linear-gradient(to bottom, #eef3ff, #ffffff)' }}>
            <LogoDisdal height={56} />
            <div className="mt-5 flex items-center gap-3 w-full">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium px-2 whitespace-nowrap">
                Gestão de Prestadores PJ
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </div>

          {/* Formulário */}
          <div className="px-8 pb-8">
            <h2 className="text-lg font-bold mb-1" style={{ color: '#1A3A8A' }}>
              Acesso ao Sistema
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Entre com seu e-mail e senha corporativos
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="form-label">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@disdal.com.br"
                    className="form-input pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="form-input pl-10 pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={carregando}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white transition-all mt-2"
                style={{ background: carregando ? '#4a6ab5' : '#1A3A8A' }}
              >
                {carregando ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : 'Entrar'}
              </button>
            </form>
          </div>

          {/* Rodapé */}
          <div className="px-8 py-3 border-t border-gray-100 flex items-center justify-between"
            style={{ background: '#f8faff' }}>
            <span className="text-xs text-gray-400">© 2025 DiSDAL</span>
            <span className="text-xs font-medium" style={{ color: '#1A3A8A' }}>Sistema Interno</span>
          </div>
        </div>
      </div>
    </div>
  )
}
