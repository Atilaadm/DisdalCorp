'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { Prestador } from '@/lib/supabase/types'
import { formatCurrency, formatCNPJ } from '@/lib/utils'
import { Users, Plus, Search, Pencil, Trash2, Eye } from 'lucide-react'
import Link from 'next/link'

export default function PrestadoresPage() {
  const router = useRouter()
  const [prestadores, setPrestadores] = useState<Prestador[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'ativo' | 'inativo'>('todos')
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [confirmAberto, setConfirmAberto] = useState(false)
  const { mostrar, ToastComponent } = useToast()

  const buscarPrestadores = useCallback(async () => {
    const supabase = createClient()
    let query = supabase.from('prestadores').select('*').order('nome_empresa')

    if (statusFiltro !== 'todos') {
      query = query.eq('status', statusFiltro)
    }

    const { data, error } = await query
    if (!error) setPrestadores(data ?? [])
    setCarregando(false)
  }, [statusFiltro])

  useEffect(() => {
    buscarPrestadores()
  }, [buscarPrestadores])

  const prestadoresFiltrados = prestadores.filter((p) =>
    p.nome_empresa.toLowerCase().includes(busca.toLowerCase()) ||
    p.cnpj.includes(busca) ||
    p.responsavel.toLowerCase().includes(busca.toLowerCase())
  )

  async function handleDeletar() {
    if (!deletandoId) return
    const supabase = createClient()
    const { error } = await supabase.from('prestadores').delete().eq('id', deletandoId)
    if (error) {
      mostrar('Erro ao excluir prestador.', 'erro')
    } else {
      mostrar('Prestador excluído com sucesso!', 'sucesso')
      buscarPrestadores()
    }
    setDeletandoId(null)
    setConfirmAberto(false)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Prestadores"
        subtitulo="Gestão de prestadores de serviço PJ"
        acoes={
          <Link href="/prestadores/novo" className="btn-primary">
            <Plus size={16} /> Novo Prestador
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
              placeholder="Buscar por nome, CNPJ ou responsável..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="form-input pl-9 w-full"
            />
          </div>
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value as any)}
            className="form-select w-full sm:w-44"
          >
            <option value="todos">Todos os status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : prestadoresFiltrados.length === 0 ? (
          <EmptyState
            icone={Users}
            titulo="Nenhum prestador encontrado"
            descricao={busca ? 'Tente ajustar os filtros de busca.' : 'Cadastre o primeiro prestador para começar.'}
            acao={
              !busca ? (
                <Link href="/prestadores/novo" className="btn-primary">
                  <Plus size={16} /> Cadastrar Prestador
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Empresa</th>
                    <th className="table-header">CNPJ</th>
                    <th className="table-header">Responsável</th>
                    <th className="table-header">Tipo de Serviço</th>
                    <th className="table-header">Valor Contrato</th>
                    <th className="table-header">Bônus</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {prestadoresFiltrados.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-cell">
                        <div className="font-medium text-gray-900">{p.nome_empresa}</div>
                        {p.email && <div className="text-xs text-gray-400 mt-0.5">{p.email}</div>}
                      </td>
                      <td className="table-cell font-mono text-xs">{formatCNPJ(p.cnpj)}</td>
                      <td className="table-cell">{p.responsavel}</td>
                      <td className="table-cell">{p.tipo_servico}</td>
                      <td className="table-cell font-medium">{formatCurrency(p.valor_contrato)}</td>
                      <td className="table-cell">
                        {p.valor_bonus ? (
                          <div>
                            <div className="font-medium text-gray-900">{formatCurrency(p.valor_bonus)}</div>
                            {p.regra_pagamento_bonus && (
                              <div className="text-xs text-gray-400 mt-0.5 capitalize">{p.regra_pagamento_bonus}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${p.status === 'ativo' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {p.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/prestadores/${p.id}`}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </Link>
                          <button
                            onClick={() => { setDeletandoId(p.id); setConfirmAberto(true) }}
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
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">
                {prestadoresFiltrados.length} prestador{prestadoresFiltrados.length !== 1 ? 'es' : ''} encontrado{prestadoresFiltrados.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        aberto={confirmAberto}
        onFechar={() => { setConfirmAberto(false); setDeletandoId(null) }}
        onConfirmar={handleDeletar}
        titulo="Excluir Prestador"
        mensagem="Tem certeza que deseja excluir este prestador? Todos os contratos e notas fiscais associados também serão excluídos."
        textoBotao="Excluir"
      />

      {ToastComponent}
    </div>
  )
}
