import { createClient } from '@/lib/supabase/server'
import Header from '@/components/layout/Header'
import Link from 'next/link'
import {
  Users, FileText, DollarSign, AlertTriangle,
  CheckCircle, Clock, TrendingUp, Bell, ArrowRight
} from 'lucide-react'
import { formatCurrency, formatDate, contratoStatusColor, contratoStatusLabel } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalPrestadores },
    { count: prestadoresAtivos },
    { count: contratosAtivos },
    { count: contratosVencendo },
    { count: contratosVencidos },
    { data: nfsPendentes },
    { count: nfsCount },
    { count: naoLidas },
    { data: contratosRecentes },
    { data: notificacoesRecentes },
  ] = await Promise.all([
    supabase.from('prestadores').select('*', { count: 'exact', head: true }),
    supabase.from('prestadores').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('contratos').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('contratos').select('*', { count: 'exact', head: true }).eq('status', 'vencendo'),
    supabase.from('contratos').select('*', { count: 'exact', head: true }).eq('status', 'vencido'),
    supabase.from('notas_fiscais').select('valor').eq('status', 'pendente'),
    supabase.from('notas_fiscais').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    supabase.from('notificacoes').select('*', { count: 'exact', head: true }).eq('lida', false),
    supabase.from('contratos')
      .select('*, prestador:prestadores(nome_empresa)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('notificacoes')
      .select('*')
      .eq('lida', false)
      .order('created_at', { ascending: false })
      .limit(4),
  ])

  const valorPendente = nfsPendentes?.reduce((sum, nf) => sum + (nf.valor || 0), 0) ?? 0

  const cards = [
    {
      titulo: 'Prestadores Ativos',
      valor: prestadoresAtivos ?? 0,
      total: `de ${totalPrestadores ?? 0} cadastrados`,
      icone: Users,
      cor: 'bg-blue-50 text-blue-600',
      href: '/prestadores',
    },
    {
      titulo: 'Contratos Ativos',
      valor: contratosAtivos ?? 0,
      total: null,
      icone: FileText,
      cor: 'bg-green-50 text-green-600',
      href: '/contratos',
    },
    {
      titulo: 'Contratos Vencendo',
      valor: contratosVencendo ?? 0,
      total: `${contratosVencidos ?? 0} já vencidos`,
      icone: AlertTriangle,
      cor: 'bg-yellow-50 text-yellow-600',
      href: '/contratos?status=vencendo',
    },
    {
      titulo: 'NFs Pendentes',
      valor: nfsCount ?? 0,
      total: formatCurrency(valorPendente),
      icone: DollarSign,
      cor: 'bg-red-50 text-red-600',
      href: '/financeiro?status=pendente',
    },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Dashboard"
        subtitulo="Visão geral do sistema"
        naoLidas={naoLidas ?? 0}
      />

      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((card) => (
            <Link key={card.titulo} href={card.href} className="card hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-500 font-medium">{card.titulo}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.valor}</p>
                  {card.total && (
                    <p className="text-xs text-gray-400 mt-1">{card.total}</p>
                  )}
                </div>
                <div className={`flex items-center justify-center w-11 h-11 rounded-xl ${card.cor}`}>
                  <card.icone size={22} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-indigo-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Ver detalhes <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Contratos recentes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Contratos Recentes</h2>
              <Link href="/contratos" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                Ver todos <ArrowRight size={12} />
              </Link>
            </div>

            {contratosRecentes && contratosRecentes.length > 0 ? (
              <div className="space-y-3">
                {contratosRecentes.map((contrato: any) => (
                  <Link
                    key={contrato.id}
                    href={`/contratos/${contrato.id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {contrato.prestador?.nome_empresa ?? 'Prestador'}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Vence em {formatDate(contrato.data_fim)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3">
                      <span className={`badge ${contratoStatusColor(contrato.status)}`}>
                        {contratoStatusLabel(contrato.status)}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        {formatCurrency(contrato.valor)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText className="mx-auto mb-2" size={28} />
                <p className="text-sm">Nenhum contrato cadastrado</p>
              </div>
            )}
          </div>

          {/* Notificações recentes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Notificações
                {(naoLidas ?? 0) > 0 && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                    {naoLidas} nova{(naoLidas ?? 0) > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
              <Link href="/notificacoes" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                Ver todas <ArrowRight size={12} />
              </Link>
            </div>

            {notificacoesRecentes && notificacoesRecentes.length > 0 ? (
              <div className="space-y-2">
                {notificacoesRecentes.map((notif: any) => (
                  <div
                    key={notif.id}
                    className="flex items-start gap-3 py-2.5 px-3 rounded-lg bg-indigo-50/50"
                  >
                    <div className="flex-shrink-0 text-lg leading-none mt-0.5">
                      {notif.tipo === 'contrato_vencendo' && '📋'}
                      {notif.tipo === 'nf_pendente' && '📄'}
                      {notif.tipo === 'recesso_proximo' && '🏖️'}
                      {notif.tipo === 'alerta' && '⚠️'}
                      {notif.tipo === 'info' && 'ℹ️'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{notif.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.mensagem}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Bell className="mx-auto mb-2" size={28} />
                <p className="text-sm">Nenhuma notificação pendente</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
