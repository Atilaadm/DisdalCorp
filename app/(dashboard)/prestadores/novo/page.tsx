'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'
import { maskCNPJ } from '@/lib/utils'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

export default function NovoPrestadorPage() {
  const router = useRouter()
  const { mostrar, ToastComponent } = useToast()
  const [salvando, setSalvando] = useState(false)

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
    const { error } = await supabase.from('prestadores').insert({
      nome_empresa: form.nome_empresa,
      cnpj: form.cnpj.replace(/\D/g, ''),
      responsavel: form.responsavel,
      email: form.email || null,
      telefone: form.telefone || null,
      tipo_servico: form.tipo_servico,
      valor_contrato: form.valor_contrato ? parseFloat(form.valor_contrato.replace(',', '.')) : null,
      valor_bonus: form.valor_bonus ? parseFloat(form.valor_bonus.replace(',', '.')) : null,
      regra_pagamento_bonus: form.regra_pagamento_bonus || null,
      status: form.status,
      observacoes: form.observacoes || null,
    })

    if (error) {
      mostrar(error.message.includes('cnpj') ? 'CNPJ já cadastrado.' : 'Erro ao salvar prestador.', 'erro')
      setSalvando(false)
      return
    }

    mostrar('Prestador cadastrado com sucesso!', 'sucesso')
    setTimeout(() => router.push('/prestadores'), 1200)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Novo Prestador"
        subtitulo="Preencha os dados do prestador de serviço"
        acoes={
          <Link href="/prestadores" className="btn-secondary">
            <ArrowLeft size={16} /> Voltar
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="card space-y-5">
            <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Dados da Empresa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="form-label">Nome da Empresa *</label>
                <input
                  name="nome_empresa"
                  value={form.nome_empresa}
                  onChange={handleChange}
                  required
                  placeholder="Razão social da empresa"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">CNPJ *</label>
                <input
                  name="cnpj"
                  value={form.cnpj}
                  onChange={handleChange}
                  required
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="form-input font-mono"
                />
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
                <input
                  name="responsavel"
                  value={form.responsavel}
                  onChange={handleChange}
                  required
                  placeholder="Nome do responsável"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">E-mail</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="contato@empresa.com"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Telefone</label>
                <input
                  name="telefone"
                  value={form.telefone}
                  onChange={handleChange}
                  placeholder="(00) 00000-0000"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Tipo de Serviço *</label>
                <input
                  name="tipo_servico"
                  value={form.tipo_servico}
                  onChange={handleChange}
                  required
                  placeholder="Ex: Desenvolvimento, Consultoria..."
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Valor do Contrato (R$)</label>
                <input
                  name="valor_contrato"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_contrato}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="form-input"
                />
              </div>

              <div>
                <label className="form-label">Valor do Bônus (R$)</label>
                <input
                  name="valor_bonus"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.valor_bonus}
                  onChange={handleChange}
                  placeholder="0,00"
                  className="form-input"
                />
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
                <textarea
                  name="observacoes"
                  value={form.observacoes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Informações adicionais..."
                  className="form-textarea"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/prestadores" className="btn-secondary">
                Cancelar
              </Link>
              <button type="submit" disabled={salvando} className="btn-primary">
                <Save size={16} />
                {salvando ? 'Salvando...' : 'Cadastrar Prestador'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {ToastComponent}
    </div>
  )
}
