'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { Recesso } from '@/lib/supabase/types'
type PrestadorOpcao = { id: string; nome_empresa: string }
import { formatDate } from '@/lib/utils'
import { Calendar, Plus, Search, Trash2, Pencil } from 'lucide-react'

type RecessoComPrestador = Omit<Recesso, 'prestador'> & {
  prestador?: { nome_empresa: string }
}

export default function RecessosPage() {
  const [recessos, setRecessos] = useState<RecessoComPrestador[]>([])
  const [prestadores, setPrestadores] = useState<PrestadorOpcao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [confirmAberto, setConfirmAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const { mostrar, ToastComponent } = useToast()

  const [form, setForm] = useState({
    prestador_id: '',
    data_inicio: '',
    data_fim: '',
    descricao: '',
  })

  const buscarRecessos = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('recessos')
      .select('*, prestador:prestadores(nome_empresa)')
      .order('data_inicio', { ascending: false })
    setRecessos(data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    async function inicializar() {
      const supabase = createClient()
      const [{ data: recs }, { data: prests }] = await Promise.all([
        supabase.from('recessos').select('*, prestador:prestadores(nome_empresa)').order('data_inicio', { ascending: false }),
        supabase.from('prestadores').select('id, nome_empresa').eq('status', 'ativo').order('nome_empresa'),
      ])
      setRecessos(recs ?? [])
      setPrestadores(prests ?? [])
      setCarregando(false)
    }
    inicializar()
  }, [])

  const recessosFiltrados = recessos.filter((r) =>
    (r.prestador?.nome_empresa ?? '').toLowerCase().includes(busca.toLowerCase()) ||
    (r.descricao ?? '').toLowerCase().includes(busca.toLowerCase())
  )

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (form.data_fim < form.data_inicio) {
      mostrar('A data de término deve ser posterior à data de início.', 'erro')
      return
    }
    setSalvando(true)
    const supabase = createClient()
    const { error } = await supabase.from('recessos').insert({
      prestador_id: form.prestador_id,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      descricao: form.descricao || null,
    })

    if (error) {
      mostrar('Erro ao registrar recesso.', 'erro')
    } else {
      mostrar('Recesso cadastrado!', 'sucesso')
      setModalAberto(false)
      setForm({ prestador_id: '', data_inicio: '', data_fim: '', descricao: '' })
      buscarRecessos()
    }
    setSalvando(false)
  }

  async function handleDeletar() {
    if (!deletandoId) return
    const supabase = createClient()
    const { error } = await supabase.from('recessos').delete().eq('id', deletandoId)
    if (error) {
      mostrar('Erro ao excluir recesso.', 'erro')
    } else {
      mostrar('Recesso excluído.', 'sucesso')
      buscarRecessos()
    }
    setDeletandoId(null)
    setConfirmAberto(false)
  }

  function isPassado(dataFim: string): boolean {
    return new Date(dataFim) < new Date()
  }

  function isFuturo(dataInicio: string): boolean {
    return new Date(dataInicio) > new Date()
  }

  function getRecessoStatus(r: RecessoComPrestador) {
    if (isPassado(r.data_fim)) return { label: 'Concluído', cls: 'bg-gray-100 text-gray-600' }
    if (isFuturo(r.data_inicio)) return { label: 'Agendado', cls: 'bg-blue-100 text-blue-700' }
    return { label: 'Em andamento', cls: 'bg-green-100 text-green-700' }
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Recessos"
        subtitulo="Gestão de períodos de recesso dos prestadores"
        acoes={
          <button onClick={() => setModalAberto(true)} className="btn-primary">
            <Plus size={16} /> Novo Recesso
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        {/* Busca */}
        <div className="relative mb-5 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por prestador ou descrição..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="form-input pl-9 w-full"
          />
        </div>

        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : recessosFiltrados.length === 0 ? (
          <EmptyState
            icone={Calendar}
            titulo="Nenhum recesso cadastrado"
            descricao="Registre o primeiro período de recesso."
            acao={
              <button onClick={() => setModalAberto(true)} className="btn-primary">
                <Plus size={16} /> Registrar Recesso
              </button>
            }
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-header">Prestador</th>
                  <th className="table-header">Descrição</th>
                  <th className="table-header">Início</th>
                  <th className="table-header">Término</th>
                  <th className="table-header">Dias</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {recessosFiltrados.map((r) => {
                  const status = getRecessoStatus(r)
                  return (
                    <tr key={r.id} className="table-row">
                      <td className="table-cell font-medium">{r.prestador?.nome_empresa ?? '-'}</td>
                      <td className="table-cell text-gray-500">{r.descricao ?? '-'}</td>
                      <td className="table-cell">{formatDate(r.data_inicio)}</td>
                      <td className="table-cell">{formatDate(r.data_fim)}</td>
                      <td className="table-cell">
                        <span className="font-semibold">{r.dias_corridos ?? '-'}</span>
                        <span className="text-gray-400 text-xs ml-1">dias</span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => { setDeletandoId(r.id); setConfirmAberto(true) }}
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
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500">{recessosFiltrados.length} recesso(s) encontrado(s)</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Recesso */}
      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Registrar Recesso">
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="form-label">Prestador *</label>
            <select name="prestador_id" value={form.prestador_id} onChange={handleChange} required className="form-select">
              <option value="">Selecione um prestador</option>
              {prestadores.map((p) => (
                <option key={p.id} value={p.id}>{p.nome_empresa}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Data de Início *</label>
              <input name="data_inicio" type="date" value={form.data_inicio} onChange={handleChange} required className="form-input" />
            </div>
            <div>
              <label className="form-label">Data de Término *</label>
              <input name="data_fim" type="date" value={form.data_fim} onChange={handleChange} required className="form-input" />
            </div>
          </div>

          <div>
            <label className="form-label">Descrição</label>
            <input name="descricao" value={form.descricao} onChange={handleChange} placeholder="Ex: Recesso de fim de ano" className="form-input" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={salvando} className="btn-primary">
              <Plus size={16} /> {salvando ? 'Salvando...' : 'Registrar Recesso'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        aberto={confirmAberto}
        onFechar={() => { setConfirmAberto(false); setDeletandoId(null) }}
        onConfirmar={handleDeletar}
        titulo="Excluir Recesso"
        mensagem="Deseja excluir este período de recesso?"
        textoBotao="Excluir"
      />

      {ToastComponent}
    </div>
  )
}
