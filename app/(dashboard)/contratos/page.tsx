'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { Contrato } from '@/lib/supabase/types'
import { formatCurrency, formatDate, contratoStatusColor, contratoStatusLabel, diasParaVencer } from '@/lib/utils'
import { FileText, Plus, Search, Pencil, Trash2, Download } from 'lucide-react'
import Link from 'next/link'

export default function ContratosPage() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')
  const [contratos, setContratos] = useState<(Contrato & { prestador?: { nome_empresa: string } })[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState(statusParam ?? 'todos')
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [confirmAberto, setConfirmAberto] = useState(false)
  const { mostrar, ToastComponent } = useToast()

  const buscarContratos = useCallback(async () => {
    const supabase = createClient()
    let query = supabase
      .from('contratos')
      .select('*, prestador:prestadores(nome_empresa)')
      .order('data_fim', { ascending: true })

    if (statusFiltro !== 'todos') {
      query = query.eq('status', statusFiltro)
    }

    const { data, error } = await query
    if (!error) setContratos(data ?? [])
    setCarregando(false)
  }, [statusFiltro])

  useEffect(() => {
    buscarContratos()
  }, [buscarContratos])

  const contratosFiltrados = contratos.filter((c) => {
    const termo = busca.toLowerCase()
    return (
      (c.prestador?.nome_empresa ?? '').toLowerCase().includes(termo) ||
      (c.numero ?? '').toLowerCase().includes(termo) ||
      (c.objeto ?? '').toLowerCase().includes(termo)
    )
  })

  async function handleDeletar() {
    if (!deletandoId) return
    const supabase = createClient()
    const { error } = await supabase.from('contratos').delete().eq('id', deletandoId)
    if (error) {
      mostrar('Erro ao excluir contrato.', 'erro')
    } else {
      mostrar('Contrato excluído.', 'sucesso')
      buscarContratos()
    }
    setDeletandoId(null)
    setConfirmAberto(false)
  }

  const statusOpcoes = [
    { value: 'todos', label: 'Todos' },
    { value: 'ativo', label: 'Ativos' },
    { value: 'vencendo', label: 'Vencendo' },
    { value: 'vencido', label: 'Vencidos' },
    { value: 'encerrado', label: 'Encerrados' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Contratos"
        subtitulo="Gestão de contratos dos prestadores"
        acoes={
          <Link href="/contratos/novo" className="btn-primary">
            <Plus size={16} /> Novo Contrato
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por empresa, número ou objeto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="form-input pl-9 w-full"
            />
          </div>
          <div className="flex gap-2">
            {statusOpcoes.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFiltro(opt.value)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  statusFiltro === opt.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : contratosFiltrados.length === 0 ? (
          <EmptyState
            icone={FileText}
            titulo="Nenhum contrato encontrado"
            descricao="Cadastre o primeiro contrato para começar."
            acao={
              <Link href="/contratos/novo" className="btn-primary">
                <Plus size={16} /> Cadastrar Contrato
              </Link>
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Prestador</th>
                    <th className="table-header">Número</th>
                    <th className="table-header">Período</th>
                    <th className="table-header">Vencimento</th>
                    <th className="table-header">Valor</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {contratosFiltrados.map((c) => {
                    const dias = diasParaVencer(c.data_fim)
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="table-cell">
                          <div className="font-medium text-gray-900">{c.prestador?.nome_empresa ?? '-'}</div>
                          {c.objeto && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{c.objeto}</div>}
                        </td>
                        <td className="table-cell font-mono text-xs">{c.numero ?? '-'}</td>
                        <td className="table-cell text-xs">
                          {formatDate(c.data_inicio)} a {formatDate(c.data_fim)}
                        </td>
                        <td className="table-cell">
                          <div className="text-sm">
                            {dias < 0 ? (
                              <span className="text-red-600 font-medium">Vencido há {Math.abs(dias)}d</span>
                            ) : dias === 0 ? (
                              <span className="text-red-600 font-medium">Vence hoje</span>
                            ) : dias <= 30 ? (
                              <span className="text-yellow-600 font-medium">Em {dias} dias</span>
                            ) : (
                              <span className="text-gray-500">Em {dias} dias</span>
                            )}
                          </div>
                        </td>
                        <td className="table-cell font-semibold">{formatCurrency(c.valor)}</td>
                        <td className="table-cell">
                          <span className={`badge ${contratoStatusColor(c.status)}`}>
                            {contratoStatusLabel(c.status)}
                          </span>
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center justify-end gap-1">
                            {c.arquivo_url && (
                              <a
                                href={c.arquivo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Baixar PDF"
                              >
                                <Download size={15} />
                              </a>
                            )}
                            <Link
                              href={`/contratos/${c.id}`}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil size={15} />
                            </Link>
                            <button
                              onClick={() => { setDeletandoId(c.id); setConfirmAberto(true) }}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">{contratosFiltrados.length} contrato(s) encontrado(s)</p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        aberto={confirmAberto}
        onFechar={() => { setConfirmAberto(false); setDeletandoId(null) }}
        onConfirmar={handleDeletar}
        titulo="Excluir Contrato"
        mensagem="Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita."
        textoBotao="Excluir"
      />

      {ToastComponent}
    </div>
  )
}
