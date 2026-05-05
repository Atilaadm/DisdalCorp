'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import type { SlotInfo, Event as RBCEvent } from 'react-big-calendar'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import {
  format, parse, startOfWeek, getDay, addDays,
  startOfMonth, endOfMonth, addHours,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Plus, X, Save, Trash2, MapPin, Link as LinkIcon,
  Users, AlertTriangle, CalendarDays, Clock,
} from 'lucide-react'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────
type TipoEvento = 'reuniao' | 'compromisso' | 'viagem' | 'outro'

interface UsuarioProp {
  id: string
  nome: string
  email: string
  tipo: string
}

interface ParticipanteAPI {
  id: string
  usuario_id: string | null
  email_externo: string | null
  nome_externo: string | null
  status: string
  usuario?: { id: string; nome: string; email: string; tipo: string } | null
}

interface EventoAPI {
  id: string
  titulo: string
  descricao: string | null
  local: string | null
  link_reuniao: string | null
  inicio: string
  fim: string
  dia_inteiro: boolean
  tipo: TipoEvento
  cor: string
  criado_por: string | null
  participantes: ParticipanteAPI[]
}

interface CalEvent extends RBCEvent {
  id: string
  resource: EventoAPI
}

// ──────────────────────────────────────────────
// Configuração do localizer
// ──────────────────────────────────────────────
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { 'pt-BR': ptBR },
})

const MESSAGES = {
  allDay: 'Dia inteiro',
  previous: '‹',
  next: '›',
  today: 'Hoje',
  month: 'Mês',
  week: 'Semana',
  day: 'Dia',
  agenda: 'Lista',
  date: 'Data',
  time: 'Hora',
  event: 'Evento',
  noEventsInRange: 'Nenhum evento neste período.',
  showMore: (n: number) => `+${n} mais`,
}

const TIPO_LABELS: Record<TipoEvento, string> = {
  reuniao:     'Reunião',
  compromisso: 'Compromisso',
  viagem:      'Viagem',
  outro:       'Outro',
}

const TIPO_CORES: Record<TipoEvento, string> = {
  reuniao:     '#1A3A8A',
  compromisso: '#009B94',
  viagem:      '#4DB848',
  outro:       '#6B7280',
}

// ──────────────────────────────────────────────
// Detecção de conflitos
// ──────────────────────────────────────────────
function detectarConflitos(eventos: CalEvent[]): Set<string> {
  const conflitos = new Set<string>()
  for (let i = 0; i < eventos.length; i++) {
    for (let j = i + 1; j < eventos.length; j++) {
      const a = eventos[i]
      const b = eventos[j]
      if (!a.start || !b.start || !a.end || !b.end) continue
      const overlap = a.start < b.end && a.end > b.start
      if (!overlap) continue

      const uidsA = new Set(a.resource.participantes.map((p) => p.usuario_id).filter(Boolean))
      const uidsB = new Set(b.resource.participantes.map((p) => p.usuario_id).filter(Boolean))
      const temMesmoUsuario = [...uidsA].some((uid) => uidsB.has(uid))
      if (temMesmoUsuario) {
        conflitos.add(a.id)
        conflitos.add(b.id)
      }
    }
  }
  return conflitos
}

// ──────────────────────────────────────────────
// Helpers de data
// ──────────────────────────────────────────────
function isoParaDatetimeLocal(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

function datetimeLocalParaISO(dtl: string): string {
  return dtl ? new Date(dtl).toISOString() : ''
}

// ──────────────────────────────────────────────
// Componente principal
// ──────────────────────────────────────────────
interface Props {
  usuarios: UsuarioProp[]
  usuarioAtualId: string
}

const FORM_VAZIO = (usuarioAtualId: string) => ({
  titulo: '',
  tipo: 'reuniao' as TipoEvento,
  inicio: '',
  fim: '',
  diaInteiro: false,
  local: '',
  linkReuniao: '',
  descricao: '',
  participanteIds: [usuarioAtualId],
})

export default function CalendarioClient({ usuarios, usuarioAtualId }: Props) {
  const { mostrar, ToastComponent } = useToast()

  // Calendário
  const [view, setView]   = useState<View>('month')
  const [date, setDate]   = useState(new Date())
  const [eventos, setEventos] = useState<CalEvent[]>([])
  const [carregando, setCarregando] = useState(false)

  // Filtros
  const [filtroUsuarioId, setFiltroUsuarioId] = useState('todos')
  const [filtroTipo, setFiltroTipo]           = useState('todos')

  // Modal
  const [modalAberto, setModalAberto]           = useState(false)
  const [eventoEditando, setEventoEditando]     = useState<CalEvent | null>(null)
  const [salvando, setSalvando]                 = useState(false)
  const [deletando, setDeletando]               = useState(false)
  const [form, setForm]                         = useState(FORM_VAZIO(usuarioAtualId))

  // ── Range de datas para busca ──────────────────
  const { rangeInicio, rangeFim } = useMemo(() => {
    let ini: Date, fim: Date
    if (view === 'month') {
      ini = addDays(startOfWeek(startOfMonth(date), { weekStartsOn: 0 }), -7)
      fim = addDays(endOfMonth(date), 14)
    } else if (view === 'week') {
      ini = startOfWeek(date, { weekStartsOn: 0 })
      fim = addDays(ini, 7)
    } else {
      ini = date
      fim = addDays(date, 1)
    }
    return { rangeInicio: ini.toISOString(), rangeFim: fim.toISOString() }
  }, [view, date])

  // ── Carregar eventos ──────────────────────────
  const carregarEventos = useCallback(async () => {
    setCarregando(true)
    const qs = new URLSearchParams({ inicio: rangeInicio, fim: rangeFim })
    if (filtroUsuarioId !== 'todos') qs.set('usuarioId', filtroUsuarioId)

    const res = await fetch(`/api/agenda/eventos?${qs}`)
    if (res.ok) {
      const data: EventoAPI[] = await res.json()
      const mapped: CalEvent[] = data
        .filter((e) => filtroTipo === 'todos' || e.tipo === filtroTipo)
        .map((e) => ({
          id:       e.id,
          title:    e.titulo,
          start:    new Date(e.inicio),
          end:      new Date(e.fim),
          allDay:   e.dia_inteiro,
          resource: e,
        }))
      setEventos(mapped)
    }
    setCarregando(false)
  }, [rangeInicio, rangeFim, filtroUsuarioId, filtroTipo])

  useEffect(() => { carregarEventos() }, [carregarEventos])

  // ── Conflitos ─────────────────────────────────
  const conflitos = useMemo(() => detectarConflitos(eventos), [eventos])

  // ── Estilo dos eventos ────────────────────────
  const eventPropGetter = useCallback((event: CalEvent) => {
    const temConflito = conflitos.has(event.id)
    const bg = event.resource.cor || TIPO_CORES[event.resource.tipo] || '#1A3A8A'
    return {
      style: {
        backgroundColor: bg,
        border: temConflito ? '2px solid #EF4444' : '1px solid rgba(255,255,255,.2)',
        borderRadius: '4px',
        color: '#fff',
        fontSize: '12px',
        padding: '1px 4px',
      },
    }
  }, [conflitos])

  // ── Handlers de modal ─────────────────────────
  function abrirParaCriar(slot?: SlotInfo) {
    const inicio = slot?.start ?? new Date()
    const fim    = slot?.end   ?? addHours(inicio, 1)
    setEventoEditando(null)
    setForm({
      ...FORM_VAZIO(usuarioAtualId),
      inicio: isoParaDatetimeLocal(inicio.toISOString()),
      fim:    isoParaDatetimeLocal((view === 'month' ? addHours(inicio, 1) : fim).toISOString()),
    })
    setModalAberto(true)
  }

  function abrirParaEditar(event: CalEvent) {
    setEventoEditando(event)
    setForm({
      titulo:          event.resource.titulo,
      tipo:            event.resource.tipo,
      inicio:          isoParaDatetimeLocal(event.resource.inicio),
      fim:             isoParaDatetimeLocal(event.resource.fim),
      diaInteiro:      event.resource.dia_inteiro,
      local:           event.resource.local ?? '',
      linkReuniao:     event.resource.link_reuniao ?? '',
      descricao:       event.resource.descricao ?? '',
      participanteIds: event.resource.participantes
        .filter((p) => p.usuario_id)
        .map((p) => p.usuario_id as string),
    })
    setModalAberto(true)
  }

  // ── Salvar evento ─────────────────────────────
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (new Date(form.fim) <= new Date(form.inicio)) {
      mostrar('O horário de fim deve ser após o início.', 'erro')
      return
    }
    setSalvando(true)

    const body = {
      titulo:          form.titulo,
      descricao:       form.descricao   || null,
      local:           form.local       || null,
      linkReuniao:     form.linkReuniao || null,
      inicio:          datetimeLocalParaISO(form.inicio),
      fim:             datetimeLocalParaISO(form.fim),
      diaInteiro:      form.diaInteiro,
      tipo:            form.tipo,
      participanteIds: form.participanteIds,
    }

    const url    = eventoEditando ? `/api/agenda/eventos/${eventoEditando.id}` : '/api/agenda/eventos'
    const method = eventoEditando ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      mostrar(eventoEditando ? 'Evento atualizado!' : 'Evento criado!', 'sucesso')
      setModalAberto(false)
      carregarEventos()
    } else {
      const data = await res.json()
      mostrar(data.error ?? 'Erro ao salvar evento.', 'erro')
    }
    setSalvando(false)
  }

  // ── Deletar evento ────────────────────────────
  async function handleDeletar() {
    if (!eventoEditando) return
    if (!confirm('Excluir este evento? Esta ação não pode ser desfeita.')) return
    setDeletando(true)
    const res = await fetch(`/api/agenda/eventos/${eventoEditando.id}`, { method: 'DELETE' })
    if (res.ok) {
      mostrar('Evento excluído.', 'sucesso')
      setModalAberto(false)
      carregarEventos()
    } else {
      mostrar('Erro ao excluir evento.', 'erro')
    }
    setDeletando(false)
  }

  // ── Toggle participante ───────────────────────
  function toggleParticipante(userId: string) {
    if (userId === usuarioAtualId) return // criador sempre incluído
    setForm((p) => ({
      ...p,
      participanteIds: p.participanteIds.includes(userId)
        ? p.participanteIds.filter((id) => id !== userId)
        : [...p.participanteIds, userId],
    }))
  }

  // ── Render ────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Agenda Corporativa"
        subtitulo="Visualização unificada das agendas da equipe gestora"
        acoes={
          <button onClick={() => abrirParaCriar()} className="btn-primary">
            <Plus size={16} /> Novo Evento
          </button>
        }
      />

      <div className="flex-1 flex flex-col gap-3 p-4 overflow-hidden">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
          <CalendarDays size={16} className="text-gray-400 flex-shrink-0" />
          <select
            value={filtroUsuarioId}
            onChange={(e) => setFiltroUsuarioId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="todos">Todos os participantes</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="todos">Todos os tipos</option>
            {(Object.entries(TIPO_LABELS) as [TipoEvento, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>

          {conflitos.size > 0 && (
            <div className="flex items-center gap-1.5 ml-auto px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={14} />
              {conflitos.size} conflito(s) de agenda
            </div>
          )}

          {carregando && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
              <div className="w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
              Carregando...
            </div>
          )}
        </div>

        {/* Legenda de tipos */}
        <div className="flex flex-wrap gap-3 px-1">
          {(Object.entries(TIPO_CORES) as [TipoEvento, string][]).map(([tipo, cor]) => (
            <div key={tipo} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: cor }} />
              {TIPO_LABELS[tipo]}
            </div>
          ))}
          <div className="flex items-center gap-1.5 text-xs text-red-500">
            <span className="inline-block w-3 h-3 rounded-sm border-2 border-red-500 bg-transparent" />
            Conflito
          </div>
        </div>

        {/* Calendário */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-0">
          <div className="h-full p-1">
            <Calendar
              localizer={localizer}
              events={eventos}
              view={view}
              date={date}
              onView={setView}
              onNavigate={setDate}
              onSelectSlot={abrirParaCriar}
              onSelectEvent={abrirParaEditar}
              selectable
              messages={MESSAGES}
              culture="pt-BR"
              eventPropGetter={eventPropGetter}
              style={{ height: '100%' }}
              popup
            />
          </div>
        </div>
      </div>

      {/* ── Modal: Criar / Editar Evento ───────── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: TIPO_CORES[form.tipo] }} />
                <h2 className="text-base font-semibold text-gray-900">
                  {eventoEditando ? 'Editar Evento' : 'Novo Evento'}
                </h2>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvar} className="overflow-y-auto px-6 py-5 space-y-4">
              {/* Título */}
              <div>
                <label className="form-label">Título *</label>
                <input
                  value={form.titulo}
                  onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
                  required
                  placeholder="Ex: Reunião de diretoria"
                  className="form-input"
                />
              </div>

              {/* Tipo */}
              <div>
                <label className="form-label">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as TipoEvento }))}
                  className="form-select"
                >
                  {(Object.entries(TIPO_LABELS) as [TipoEvento, string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Data/hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label flex items-center gap-1"><Clock size={12} /> Início *</label>
                  <input
                    type="datetime-local"
                    value={form.inicio}
                    onChange={(e) => setForm((p) => ({ ...p, inicio: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label flex items-center gap-1"><Clock size={12} /> Fim *</label>
                  <input
                    type="datetime-local"
                    value={form.fim}
                    onChange={(e) => setForm((p) => ({ ...p, fim: e.target.value }))}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              {/* Dia inteiro */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.diaInteiro}
                  onChange={(e) => setForm((p) => ({ ...p, diaInteiro: e.target.checked }))}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700">Dia inteiro</span>
              </label>

              {/* Local */}
              <div>
                <label className="form-label flex items-center gap-1"><MapPin size={12} /> Local</label>
                <input
                  value={form.local}
                  onChange={(e) => setForm((p) => ({ ...p, local: e.target.value }))}
                  placeholder="Ex: Sala de reuniões 2"
                  className="form-input"
                />
              </div>

              {/* Link */}
              <div>
                <label className="form-label flex items-center gap-1"><LinkIcon size={12} /> Link da reunião</label>
                <input
                  type="url"
                  value={form.linkReuniao}
                  onChange={(e) => setForm((p) => ({ ...p, linkReuniao: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="form-input"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="form-label">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                  rows={2}
                  placeholder="Pauta, observações..."
                  className="form-input resize-none"
                />
              </div>

              {/* Participantes */}
              <div>
                <label className="form-label flex items-center gap-1"><Users size={12} /> Participantes</label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  {usuarios.map((u) => {
                    const selecionado  = form.participanteIds.includes(u.id)
                    const ehCriador    = u.id === usuarioAtualId
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          selecionado ? 'bg-indigo-50' : 'hover:bg-gray-50'
                        } ${ehCriador ? 'opacity-70' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selecionado}
                          onChange={() => toggleParticipante(u.id)}
                          disabled={ehCriador}
                          className="w-3.5 h-3.5 accent-indigo-600"
                        />
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: '#1A3A8A' }}
                        >
                          {u.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {u.nome}
                            {ehCriador && <span className="ml-1 text-[10px] text-indigo-500">(você)</span>}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {form.participanteIds.length} participante(s) — convites enviados por e-mail
                </p>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-between pt-1">
                {eventoEditando ? (
                  <button
                    type="button"
                    onClick={handleDeletar}
                    disabled={deletando}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} /> {deletando ? 'Excluindo...' : 'Excluir'}
                  </button>
                ) : <div />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">
                    Cancelar
                  </button>
                  <button type="submit" disabled={salvando} className="btn-primary">
                    <Save size={15} /> {salvando ? 'Salvando...' : eventoEditando ? 'Salvar' : 'Criar'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
