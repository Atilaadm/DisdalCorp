'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { NotaFiscal } from '@/lib/supabase/types'
import { formatCurrency, formatDate, nfStatusColor, nfStatusLabel } from '@/lib/utils'
import { DollarSign, Plus, Search, CheckCircle, Trash2, Pencil, X, Paperclip } from 'lucide-react'
import Link from 'next/link'

type PrestadorOpcao = { id: string; nome_empresa: string }

const MESES = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

const anoAtual = new Date().getFullYear()
const ANOS = Array.from({ length: 5 }, (_, i) => String(anoAtual - i))

export default function FinanceiroPage() {
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')

  const [notas, setNotas] = useState<(NotaFiscal & { prestador?: { nome_empresa: string } })[]>([])
  const [prestadores, setPrestadores] = useState<PrestadorOpcao[]>([])
  const [carregando, setCarregando] = useState(true)

  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState(statusParam ?? 'todos')
  const [prestadorFiltro, setPrestadorFiltro] = useState('todos')
  const [anoFiltro, setAnoFiltro] = useState('')
  const [mesFiltro, setMesFiltro] = useState('')

  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [confirmAberto, setConfirmAberto] = useState(false)
  const { mostrar, ToastComponent } = useToast()

  // Carrega lista de prestadores para o filtro
  useEffect(() => {
    async function carregarPrestadores() {
      const supabase = createClient()
      const { data } = await supabase
        .from('prestadores')
        .select('id, nome_empresa')
        .order('nome_empresa')
      setPrestadores(data ?? [])
    }
    carregarPrestadores()
  }, [])

  const buscarNotas = useCallback(async () => {
    setCarregando(true)
    const supabase = createClient()
    let query = supabase
      .from('notas_fiscais')
      .select('*, prestador:prestadores(nome_empresa)')
      .order('data_emissao', { ascending: false })

    if (statusFiltro !== 'todos') {
      query = query.eq('status', statusFiltro)
    }

    if (prestadorFiltro !== 'todos') {
      query = query.eq('prestador_id', prestadorFiltro)
    }

    // Filtro por ano e mês sobre data_emissao
    if (anoFiltro && mesFiltro) {
      const inicio = `${anoFiltro}-${mesFiltro}-01`
      const ultimoDia = new Date(Number(anoFiltro), Number(mesFiltro), 0).getDate()
      const fim = `${anoFiltro}-${mesFiltro}-${String(ultimoDia).padStart(2, '0')}`
      query = query.gte('data_emissao', inicio).lte('data_emissao', fim)
    } else if (anoFiltro) {
      query = query.gte('data_emissao', `${anoFiltro}-01-01`).lte('data_emissao', `${anoFiltro}-12-31`)
    } else if (mesFiltro) {
      // Só mês sem ano: filtra nos últimos anos com esse mês
      query = query.like('data_emissao', `%-${mesFiltro}-%`)
    }

    const { data, error } = await query
    if (!error) setNotas(data ?? [])
    setCarregando(false)
  }, [statusFiltro, prestadorFiltro, anoFiltro, mesFiltro])

  useEffect(() => {
    buscarNotas()
  }, [buscarNotas])

  const notasFiltradas = notas.filter((n) => {
    if (!busca) return true
    const termo = busca.toLowerCase()
    return (
      (n.prestador?.nome_empresa ?? '').toLowerCase().includes(termo) ||
      n.numero.toLowerCase().includes(termo)
    )
  })

  const totalPendente = notasFiltradas
    .filter((n) => n.status === 'pendente')
    .reduce((sum, n) => sum + n.valor, 0)

  const totalPago = notasFiltradas
    .filter((n) => n.status === 'pago')
    .reduce((sum, n) => sum + n.valor, 0)

  const totalGeral = notasFiltradas.reduce((sum, n) => sum + n.valor, 0)

  const filtrosAtivos = prestadorFiltro !== 'todos' || anoFiltro || mesFiltro || statusFiltro !== 'todos'

  function limparFiltros() {
    setPrestadorFiltro('todos')
    setAnoFiltro('')
    setMesFiltro('')
    setStatusFiltro('todos')
    setBusca('')
  }

  async function handleMarcarPago(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('notas_fiscais').update({
      status: 'pago',
      data_pagamento: new Date().toISOString().split('T')[0],
    }).eq('id', id)

    if (error) {
      mostrar('Erro ao atualizar NF.', 'erro')
    } else {
      mostrar('NF marcada como paga!', 'sucesso')
      buscarNotas()
    }
  }

  async function handleDeletar() {
    if (!deletandoId) return
    const supabase = createClient()
    const { error } = await supabase.from('notas_fiscais').delete().eq('id', deletandoId)
    if (error) {
      mostrar('Erro ao excluir NF.', 'erro')
    } else {
      mostrar('NF excluída.', 'sucesso')
      buscarNotas()
    }
    setDeletandoId(null)
    setConfirmAberto(false)
  }

  const statusOpcoes = [
    { value: 'todos', label: 'Todas' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'pago', label: 'Pagas' },
    { value: 'cancelado', label: 'Canceladas' },
  ]

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Financeiro"
        subtitulo="Controle de notas fiscais"
        acoes={
          <Link href="/financeiro/nova" className="btn-primary">
            <Plus size={16} /> Nova NF
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Totalizadores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="card flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 bg-yellow-50 text-yellow-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pendente</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPendente)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 bg-green-50 text-green-600 rounded-xl">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pago</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPago)}</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl" style={{ background: '#eef3ff' }}>
              <DollarSign size={20} style={{ color: '#1A3A8A' }} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total no filtro</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalGeral)}</p>
            </div>
          </div>
        </div>

        {/* Bloco de filtros */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5 space-y-3">
          {/* Linha 1: busca + empresa + ano + mês */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                type="text"
                placeholder="Buscar por nº NF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="form-input pl-9 w-full text-sm"
              />
            </div>

            <select
              value={prestadorFiltro}
              onChange={(e) => setPrestadorFiltro(e.target.value)}
              className="form-select text-sm"
            >
              <option value="todos">Todas as empresas</option>
              {prestadores.map((p) => (
                <option key={p.id} value={p.id}>{p.nome_empresa}</option>
              ))}
            </select>

            <select
              value={anoFiltro}
              onChange={(e) => setAnoFiltro(e.target.value)}
              className="form-select text-sm"
            >
              <option value="">Todos os anos</option>
              {ANOS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <select
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              className="form-select text-sm"
            >
              <option value="">Todos os meses</option>
              {MESES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Linha 2: status + limpar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {statusOpcoes.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFiltro(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    statusFiltro === opt.value
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                  }`}
                  style={statusFiltro === opt.value ? { backgroundColor: '#1A3A8A', borderColor: '#1A3A8A' } : {}}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {filtrosAtivos && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
              >
                <X size={13} /> Limpar filtros
              </button>
            )}
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : notasFiltradas.length === 0 ? (
          <EmptyState
            icone={DollarSign}
            titulo="Nenhuma nota fiscal encontrada"
            descricao={filtrosAtivos ? 'Tente ajustar os filtros.' : 'Registre a primeira nota fiscal para começar.'}
            acao={
              !filtrosAtivos ? (
                <Link href="/financeiro/nova" className="btn-primary">
                  <Plus size={16} /> Registrar NF
                </Link>
              ) : (
                <button onClick={limparFiltros} className="btn-secondary">
                  <X size={16} /> Limpar filtros
                </button>
              )
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Prestador</th>
                    <th className="table-header">Nº NF</th>
                    <th className="table-header">Emissão</th>
                    <th className="table-header">Mês Ref.</th>
                    <th className="table-header">Valor</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Pagamento</th>
                    <th className="table-header text-center">Anexo</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {notasFiltradas.map((n) => (
                    <tr key={n.id} className="table-row">
                      <td className="table-cell font-medium">{n.prestador?.nome_empresa ?? '-'}</td>
                      <td className="table-cell font-mono text-xs">{n.numero}</td>
                      <td className="table-cell">{formatDate(n.data_emissao)}</td>
                      <td className="table-cell">{n.mes_referencia ?? '-'}</td>
                      <td className="table-cell font-semibold">{formatCurrency(n.valor)}</td>
                      <td className="table-cell">
                        <span className={`badge ${nfStatusColor(n.status)}`}>{nfStatusLabel(n.status)}</span>
                      </td>
                      <td className="table-cell text-sm text-gray-500">{formatDate(n.data_pagamento)}</td>
                      <td className="table-cell text-center">
                        {n.arquivo_url ? (
                          <a
                            href={n.arquivo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center p-1 text-indigo-500 hover:text-indigo-700 transition-colors"
                            title={n.arquivo_nome ?? 'Ver anexo'}
                          >
                            <Paperclip size={15} />
                          </a>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          {n.status === 'pendente' && (
                            <button
                              onClick={() => handleMarcarPago(n.id)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Marcar como pago"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          <Link
                            href={`/financeiro/${n.id}`}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            onClick={() => { setDeletandoId(n.id); setConfirmAberto(true) }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500">{notasFiltradas.length} nota(s) fiscal(is)</p>
              {(anoFiltro || mesFiltro) && (
                <p className="text-xs text-gray-400">
                  {mesFiltro ? MESES.find(m => m.value === mesFiltro)?.label : ''}{mesFiltro && anoFiltro ? '/' : ''}{anoFiltro}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        aberto={confirmAberto}
        onFechar={() => { setConfirmAberto(false); setDeletandoId(null) }}
        onConfirmar={handleDeletar}
        titulo="Excluir Nota Fiscal"
        mensagem="Tem certeza que deseja excluir esta nota fiscal?"
        textoBotao="Excluir"
      />

      {ToastComponent}
    </div>
  )
}
