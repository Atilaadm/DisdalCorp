'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'
import { Shield, Plus, X, Save, Trash2, UserCheck, UserX, Mail, Layers } from 'lucide-react'
import type { Modulo } from '@/lib/supabase/types'

type Usuario = {
  id: string
  nome: string
  email: string
  tipo: string
  ativo: boolean
  celular: string | null
  created_at: string
  moduloIds: string[]
}

const PERFIS = [
  { value: 'analista_financeiro', label: 'Analista Financeiro' },
  { value: 'coordenador',         label: 'Coordenador' },
  { value: 'gerente',             label: 'Gerente' },
  { value: 'supervisor',          label: 'Supervisor' },
  { value: 'diretor',             label: 'Diretor' },
  { value: 'administrador',       label: 'Administrador' },
]

function tipoLabel(t: string) {
  return PERFIS.find((p) => p.value === t)?.label ?? t
}

function maskCelular(value: string) {
  const nums = value.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 10) return nums.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return nums.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

export default function AdminPage() {
  const { mostrar, ToastComponent } = useToast()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [modulos, setModulos] = useState<Modulo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [meuId, setMeuId] = useState<string>('')

  // Modal: novo usuário
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [form, setForm] = useState({
    nome: '',
    email: '',
    celular: '',
    tipo: 'analista_financeiro',
    moduloIds: [] as string[],
  })

  // Modal: editar módulos de usuário existente
  const [modalModulos, setModalModulos] = useState<Usuario | null>(null)
  const [modulosEditando, setModulosEditando] = useState<string[]>([])
  const [salvandoModulos, setSalvandoModulos] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMeuId(data.user.id)
    })
  }, [])

  const carregar = useCallback(async () => {
    const [resUsuarios, resModulos] = await Promise.all([
      fetch('/api/admin/usuarios'),
      fetch('/api/admin/modulos'),
    ])
    if (resUsuarios.ok) setUsuarios(await resUsuarios.json())
    if (resModulos.ok)  setModulos(await resModulos.json())
    setCarregando(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // ── Criar usuário ──────────────────────────────────────────
  function abrirModalNovo() {
    setForm({ nome: '', email: '', celular: '', tipo: 'analista_financeiro', moduloIds: [] })
    setModalAberto(true)
  }

  function toggleModuloForm(moduloId: string) {
    setForm((p) => ({
      ...p,
      moduloIds: p.moduloIds.includes(moduloId)
        ? p.moduloIds.filter((id) => id !== moduloId)
        : [...p.moduloIds, moduloId],
    }))
  }

  async function handleCriarUsuario(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)

    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        celular: form.celular || null,
        moduloIds: form.tipo === 'administrador' ? [] : form.moduloIds,
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      mostrar(data.error ?? 'Erro ao criar usuário.', 'erro')
    } else {
      mostrar('Usuário criado! E-mail de convite enviado.', 'sucesso')
      setModalAberto(false)
      carregar()
    }
    setSalvando(false)
  }

  // ── Toggle ativo / perfil ─────────────────────────────────
  async function handleToggleAtivo(u: Usuario) {
    if (u.id === meuId) { mostrar('Não é possível desativar seu próprio usuário.', 'erro'); return }
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !u.ativo }),
    })
    if (res.ok) { mostrar(u.ativo ? 'Usuário desativado.' : 'Usuário reativado!', 'sucesso'); carregar() }
    else mostrar('Erro ao atualizar usuário.', 'erro')
  }

  async function handleChangeTipo(u: Usuario, novoTipo: string) {
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: novoTipo }),
    })
    if (res.ok) { mostrar('Perfil atualizado!', 'sucesso'); carregar() }
    else mostrar('Erro ao atualizar perfil.', 'erro')
  }

  async function handleDeletar(u: Usuario) {
    if (u.id === meuId) { mostrar('Não é possível excluir seu próprio usuário.', 'erro'); return }
    if (!confirm(`Excluir o usuário "${u.nome}"? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) { mostrar('Usuário excluído.', 'sucesso'); carregar() }
    else mostrar(data.error ?? 'Erro ao excluir usuário.', 'erro')
  }

  // ── Editar módulos ────────────────────────────────────────
  function abrirModalModulos(u: Usuario) {
    setModalModulos(u)
    setModulosEditando([...u.moduloIds])
  }

  function toggleModuloEditando(moduloId: string) {
    setModulosEditando((prev) =>
      prev.includes(moduloId) ? prev.filter((id) => id !== moduloId) : [...prev, moduloId]
    )
  }

  async function handleSalvarModulos(e: React.FormEvent) {
    e.preventDefault()
    if (!modalModulos) return
    setSalvandoModulos(true)

    const res = await fetch(`/api/admin/usuarios/${modalModulos.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moduloIds: modulosEditando }),
    })

    if (res.ok) {
      mostrar('Módulos atualizados!', 'sucesso')
      setModalModulos(null)
      carregar()
    } else {
      mostrar('Erro ao salvar módulos.', 'erro')
    }
    setSalvandoModulos(false)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Administração"
        subtitulo="Gerenciamento de usuários e módulos do sistema"
        acoes={
          <button onClick={abrirModalNovo} className="btn-primary">
            <Plus size={16} /> Novo Usuário
          </button>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg" style={{ background: '#eef3ff' }}>
              <Shield size={18} style={{ color: '#1A3A8A' }} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Usuários do Sistema</h3>
              <p className="text-xs text-gray-400">{usuarios.length} usuário(s) cadastrado(s)</p>
            </div>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header">Nome</th>
                    <th className="table-header">E-mail</th>
                    <th className="table-header">Celular</th>
                    <th className="table-header">Perfil</th>
                    <th className="table-header">Módulos</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className={`table-row ${!u.ativo ? 'opacity-50' : ''}`}>
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white flex-shrink-0"
                            style={{ background: '#1A3A8A' }}
                          >
                            {u.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            {u.nome}
                            {u.id === meuId && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#eef3ff', color: '#1A3A8A' }}>
                                você
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell text-sm text-gray-500">{u.email}</td>
                      <td className="table-cell text-sm text-gray-500">{u.celular ?? '—'}</td>
                      <td className="table-cell">
                        {u.id === meuId ? (
                          <span className="text-sm text-gray-700">{tipoLabel(u.tipo)}</span>
                        ) : (
                          <select
                            value={u.tipo}
                            onChange={(e) => handleChangeTipo(u, e.target.value)}
                            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          >
                            {PERFIS.map((p) => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="table-cell">
                        {u.tipo === 'administrador' ? (
                          <span className="badge bg-blue-100 text-blue-800">Acesso total</span>
                        ) : (
                          <button
                            onClick={() => abrirModalModulos(u)}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                            title="Gerenciar módulos"
                          >
                            <Layers size={13} />
                            {u.moduloIds.length === 0
                              ? 'Nenhum'
                              : `${u.moduloIds.length} módulo${u.moduloIds.length > 1 ? 's' : ''}`
                            }
                          </button>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          {u.id !== meuId && (
                            <>
                              <button
                                onClick={() => handleToggleAtivo(u)}
                                className={`p-1.5 rounded-lg transition-colors ${u.ativo ? 'text-gray-400 hover:text-orange-600 hover:bg-orange-50' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                                title={u.ativo ? 'Desativar' : 'Reativar'}
                              >
                                {u.ativo ? <UserX size={15} /> : <UserCheck size={15} />}
                              </button>
                              <button
                                onClick={() => handleDeletar(u)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal: Novo Usuário ──────────────────────────── */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Novo Usuário</h2>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCriarUsuario} className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="form-label">Nome completo *</label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  required
                  placeholder="Nome do usuário"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">E-mail *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  placeholder="usuario@disdal.com.br"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Celular</label>
                <input
                  type="tel"
                  value={form.celular}
                  onChange={(e) => setForm((p) => ({ ...p, celular: maskCelular(e.target.value) }))}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Perfil *</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value, moduloIds: [] }))}
                  className="form-select"
                >
                  {PERFIS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Módulos de acesso */}
              <div>
                <label className="form-label flex items-center gap-1.5">
                  <Layers size={14} /> Módulos de acesso
                </label>
                {form.tipo === 'administrador' ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
                    <Shield size={14} className="flex-shrink-0" />
                    Administradores têm acesso a todos os módulos automaticamente.
                  </div>
                ) : modulos.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Nenhum módulo disponível.</p>
                ) : (
                  <div className="space-y-2 mt-1">
                    {modulos.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={form.moduloIds.includes(m.id)}
                          onChange={() => toggleModuloForm(m.id)}
                          className="w-4 h-4 rounded accent-indigo-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{m.nome}</p>
                          {m.descricao && <p className="text-xs text-gray-400">{m.descricao}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
                <Mail size={15} className="flex-shrink-0 mt-0.5" />
                <span>Um e-mail de convite será enviado para o usuário definir sua própria senha.</span>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setModalAberto(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvando} className="btn-primary">
                  <Save size={15} /> {salvando ? 'Enviando...' : 'Criar e Convidar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Editar Módulos ────────────────────────── */}
      {modalModulos && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Módulos de Acesso</h2>
                <p className="text-xs text-gray-400 mt-0.5">{modalModulos.nome}</p>
              </div>
              <button onClick={() => setModalModulos(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSalvarModulos} className="px-6 py-5 space-y-3">
              {modulos.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">Nenhum módulo cadastrado.</p>
              ) : (
                modulos.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={modulosEditando.includes(m.id)}
                      onChange={() => toggleModuloEditando(m.id)}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.nome}</p>
                      {m.descricao && <p className="text-xs text-gray-400">{m.descricao}</p>}
                    </div>
                  </label>
                ))
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalModulos(null)} className="btn-secondary">
                  Cancelar
                </button>
                <button type="submit" disabled={salvandoModulos} className="btn-primary">
                  <Save size={15} /> {salvandoModulos ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
