'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'
import { Prestador, Contrato, NotaFiscal } from '@/lib/supabase/types'
import { maskCNPJ, formatCurrency, formatDate, contratoStatusColor, contratoStatusLabel, nfStatusColor, nfStatusLabel } from '@/lib/utils'
import { ArrowLeft, Save, FileText, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function EditarPrestadorPage() {
  const params = useParams()
  const router = useRouter()
  const { mostrar, ToastComponent } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [nfs, setNfs] = useState<NotaFiscal[]>([])

  const [form, setForm] = useState({
    nome_empresa: '',
    cnpj: '',
    responsavel: '',
    email: '',
    telefone: '',
    tipo_servico: '',
    valor_contrato: '',
    valor_bonus: '',
    regra_pagamento_bonus: '',
    status: 'ativo',
    observacoes: '',
  })

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const [{ data: prestador }, { data: ctrs }, { data: nfss }] = await Promise.all([
        supabase.from('prestadores').select('*').eq('id', params.id).single(),
        supabase.from('contratos').select('*').eq('prestador_id', params.id).order('data_inicio', { ascending: false }),
        supabase.from('notas_fiscais').select('*').eq('prestador_id', params.id).order('data_emissao', { ascending: false }).limit(5),
      ])

      if (prestador) {
        setForm({
          nome_empresa: prestador.nome_empresa,
          cnpj: prestador.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
          responsavel: prestador.responsavel,
          email: prestador.email ?? '',
          telefone: prestador.telefone ?? '',
          tipo_servico: prestador.tipo_servico,
          valor_contrato: prestador.valor_contrato?.toString() ?? '',
          valor_bonus: prestador.valor_bonus?.toString() ?? '',
          regra_pagamento_bonus: prestador.regra_pagamento_bonus ?? '',
          status: prestador.status,
          observacoes: prestador.observacoes ?? '',
        })
      }
      setContratos(ctrs ?? [])
      setNfs(nfss ?? [])
      setCarregando(false)
    }
    carregar()
  }, [params.id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    if (name === 'cnpj') {
      setForm((prev) => ({ ...prev, cnpj: maskCNPJ(value) }))
    } else {
      setForm((prev) => ({ ...prev, [name]: value }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)

    const supabase = createClient()
    const { error } = await supabase.from('prestadores').update({
      nome_empresa: form.nome_empresa,
      cnpj: form.cnpj.replace(/\D/g, ''),
      responsavel: form.responsavel,
      email: form.email || null,
      telefone: form.telefone || null,
      tipo_servico: form.tipo_servico,
      valor_contrato: form.valor_contrato ? parseFloat(form.valor_contrato) : null,
      valor_bonus: form.valor_bonus ? parseFloat(form.valor_bonus) : null,
      regra_pagamento_bonus: form.regra_pagamento_bonus || null,
      status: form.status,
      observacoes: form.observacoes || null,
    }).eq('id', params.id as string)

    if (error) {
      mostrar('Erro ao salvar alterações.', 'erro')
    } else {
      mostrar('Prestador atualizado com sucesso!', 'sucesso')
    }
    setSalvando(false)
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Editar Prestador"
        subtitulo={form.nome_empresa}
        acoes={
          <Link href="/prestadores" className="btn-secondary">
            <ArrowLeft size={16} /> Voltar
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Formulário */}
          <form onSubmit={handleSubmit}>
            <div className="card space-y-5">
              <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Dados da Empresa</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="form-label">Nome da Empresa *</label>
                  <input name="nome_empresa" value={form.nome_empresa} onChange={handleChange} required className="form-input" />
                </div>
                <div>
                  <label className="form-label">CNPJ *</label>
                  <input name="cnpj" value={form.cnpj} onChange={handleChange} required maxLength={18} className="form-input font-mono" />
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="form-select">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Responsável *</label>
                  <input name="responsavel" value={form.responsavel} onChange={handleChange} required className="form-input" />
                </div>
                <div>
                  <label className="form-label">E-mail</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Telefone</label>
                  <input name="telefone" value={form.telefone} onChange={handleChange} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Tipo de Serviço *</label>
                  <input name="tipo_servico" value={form.tipo_servico} onChange={handleChange} required className="form-input" />
                </div>
                <div>
                  <label className="form-label">Valor do Contrato (R$)</label>
                  <input name="valor_contrato" type="number" step="0.01" min="0" value={form.valor_contrato} onChange={handleChange} className="form-input" />
                </div>
                <div>
                  <label className="form-label">Valor do Bônus (R$)</label>
                  <input name="valor_bonus" type="number" step="0.01" min="0" value={form.valor_bonus} onChange={handleChange} placeholder="0,00" className="form-input" />
                </div>
                <div>
                  <label className="form-label">Regra de Pagamento do Bônus</label>
                  <select name="regra_pagamento_bonus" value={form.regra_pagamento_bonus} onChange={handleChange} className="form-select">
                    <option value="">Sem bônus</option>
                    <option value="mensal">Mensal</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Observações</label>
                  <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} className="form-textarea" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/prestadores" className="btn-secondary">Cancelar</Link>
                <button type="submit" disabled={salvando} className="btn-primary">
                  <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </form>

          {/* Contratos do prestador */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={16} className="text-indigo-600" /> Contratos
              </h3>
              <Link href={`/contratos/novo?prestador=${params.id}`} className="btn-primary text-xs py-1.5 px-3">
                + Novo Contrato
              </Link>
            </div>
            {contratos.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum contrato cadastrado</p>
            ) : (
              <div className="space-y-2">
                {contratos.map((c) => (
                  <Link key={c.id} href={`/contratos/${c.id}`}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {c.numero ? `Contrato ${c.numero}` : 'Contrato'} — {formatCurrency(c.valor)}
                      </p>
                      <p className="text-xs text-gray-400">{formatDate(c.data_inicio)} a {formatDate(c.data_fim)}</p>
                    </div>
                    <span className={`badge ${contratoStatusColor(c.status)}`}>{contratoStatusLabel(c.status)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* NFs recentes */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign size={16} className="text-indigo-600" /> Últimas Notas Fiscais
              </h3>
              <Link href={`/financeiro/nova?prestador=${params.id}`} className="btn-primary text-xs py-1.5 px-3">
                + Nova NF
              </Link>
            </div>
            {nfs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma NF registrada</p>
            ) : (
              <div className="space-y-2">
                {nfs.map((nf) => (
                  <div key={nf.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-900">NF {nf.numero} — {formatCurrency(nf.valor)}</p>
                      <p className="text-xs text-gray-400">{formatDate(nf.data_emissao)}</p>
                    </div>
                    <span className={`badge ${nfStatusColor(nf.status)}`}>{nfStatusLabel(nf.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
