'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { Notificacao } from '@/lib/supabase/types'
import { formatDate, notificacaoIcon } from '@/lib/utils'
import { Bell, CheckCheck, Trash2, RefreshCw, Filter } from 'lucide-react'

export default function NotificacoesPage() {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerandoNotif, setGerandoNotif] = useState(false)
  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas'>('todas')
  const { mostrar, ToastComponent } = useToast()

  const buscarNotificacoes = useCallback(async () => {
    const supabase = createClient()
    let query = supabase.from('notificacoes').select('*').order('created_at', { ascending: false })
    if (filtro === 'nao_lidas') query = query.eq('lida', false)
    const { data } = await query
    setNotificacoes(data ?? [])
    setCarregando(false)
  }, [filtro])

  useEffect(() => {
    buscarNotificacoes()
  }, [buscarNotificacoes])

  async function handleMarcarLida(id: string) {
    const supabase = createClient()
    await supabase.from('notificacoes').update({ lida: true }).eq('id', id)
    setNotificacoes((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
  }

  async function handleMarcarTodasLidas() {
    const supabase = createClient()
    await supabase.from('notificacoes').update({ lida: true }).eq('lida', false)
    mostrar('Todas marcadas como lidas!', 'sucesso')
    buscarNotificacoes()
  }

  async function handleDeletar(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('notificacoes').delete().eq('id', id)
    if (!error) {
      setNotificacoes((prev) => prev.filter((n) => n.id !== id))
    }
  }

  async function handleGerarNotificacoes() {
    setGerandoNotif(true)
    try {
      const res = await fetch('/api/notificacoes/gerar', { method: 'POST' })
      if (res.ok) {
        mostrar('Notificações geradas com sucesso!', 'sucesso')
        buscarNotificacoes()
      } else {
        mostrar('Erro ao gerar notificações.', 'erro')
      }
    } catch {
      mostrar('Erro de conexão.', 'erro')
    }
    setGerandoNotif(false)
  }

  const naoLidas = notificacoes.filter((n) => !n.lida).length
  const visiveis = filtro === 'todas' ? notificacoes : notificacoes.filter((n) => !n.lida)

  const tipoLabel: Record<string, string> = {
    contrato_vencendo: 'Contrato',
    nf_pendente: 'Financeiro',
    recesso_proximo: 'Recesso',
    info: 'Informação',
    alerta: 'Alerta',
  }

  const tipoColor: Record<string, string> = {
    contrato_vencendo: 'bg-yellow-100 text-yellow-700',
    nf_pendente: 'bg-red-100 text-red-700',
    recesso_proximo: 'bg-blue-100 text-blue-700',
    info: 'bg-gray-100 text-gray-700',
    alerta: 'bg-orange-100 text-orange-700',
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Notificações"
        subtitulo={naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia'}
        acoes={
          <div className="flex gap-2">
            {naoLidas > 0 && (
              <button onClick={handleMarcarTodasLidas} className="btn-secondary text-xs py-1.5 px-3">
                <CheckCheck size={14} /> Marcar todas como lidas
              </button>
            )}
            <button
              onClick={handleGerarNotificacoes}
              disabled={gerandoNotif}
              className="btn-primary text-xs py-1.5 px-3"
              title="Verificar e gerar novas notificações automáticas"
            >
              <RefreshCw size={14} className={gerandoNotif ? 'animate-spin' : ''} />
              {gerandoNotif ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Filtro */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setFiltro('todas')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filtro === 'todas'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            Todas ({notificacoes.length})
          </button>
          <button
            onClick={() => setFiltro('nao_lidas')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              filtro === 'nao_lidas'
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            Não lidas ({naoLidas})
          </button>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : visiveis.length === 0 ? (
          <EmptyState
            icone={Bell}
            titulo="Nenhuma notificação"
            descricao="Tudo em dia! Use o botão Verificar para checar novas notificações."
          />
        ) : (
          <div className="space-y-2">
            {visiveis.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${
                  n.lida
                    ? 'bg-white border-gray-100'
                    : 'bg-indigo-50/50 border-indigo-100'
                }`}
              >
                <div className="text-2xl leading-none mt-0.5 flex-shrink-0">
                  {notificacaoIcon(n.tipo)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`badge text-xs ${tipoColor[n.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                      {tipoLabel[n.tipo] ?? n.tipo}
                    </span>
                    {!n.lida && (
                      <span className="badge bg-indigo-600 text-white text-xs">Nova</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{n.titulo}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.mensagem}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.lida && (
                    <button
                      onClick={() => handleMarcarLida(n.id)}
                      className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Marcar como lida"
                    >
                      <CheckCheck size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletar(n.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {ToastComponent}
    </div>
  )
}
