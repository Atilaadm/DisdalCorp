'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'
type PrestadorOpcao = { id: string; nome_empresa: string }
type ContratoOpcao = { id: string; numero: string | null; objeto: string | null; valor: number }
import { ArrowLeft, Save, Upload, X, Paperclip } from 'lucide-react'
import Link from 'next/link'

export default function NovaNotaFiscalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prestadorParam = searchParams.get('prestador')
  const { mostrar, ToastComponent } = useToast()

  const [salvando, setSalvando] = useState(false)
  const [prestadores, setPrestadores] = useState<PrestadorOpcao[]>([])
  const [contratos, setContratos] = useState<ContratoOpcao[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)

  const mesAtual = new Date().toISOString().slice(0, 7)

  const [form, setForm] = useState({
    prestador_id: prestadorParam ?? '',
    contrato_id: '',
    numero: '',
    data_emissao: new Date().toISOString().split('T')[0],
    mes_referencia: mesAtual,
    valor: '',
    status: 'pendente',
    observacoes: '',
  })

  useEffect(() => {
    async function carregarPrestadores() {
      const supabase = createClient()
      const { data } = await supabase
        .from('prestadores')
        .select('id, nome_empresa')
        .eq('status', 'ativo')
        .order('nome_empresa')
      setPrestadores(data ?? [])
    }
    carregarPrestadores()
  }, [])

  useEffect(() => {
    if (!form.prestador_id) { setContratos([]); return }
    async function carregarContratos() {
      const supabase = createClient()
      const { data } = await supabase
        .from('contratos')
        .select('id, numero, objeto, valor')
        .eq('prestador_id', form.prestador_id)
        .in('status', ['ativo', 'vencendo'])
        .order('data_inicio', { ascending: false })
      setContratos(data ?? [])
    }
    carregarContratos()
  }, [form.prestador_id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!tiposPermitidos.includes(file.type)) {
      mostrar('Apenas PDF, JPG ou PNG são aceitos.', 'erro')
      return
    }
    setArquivo(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)

    const supabase = createClient()
    let arquivo_url = null
    let arquivo_nome = null

    if (arquivo) {
      const ext = arquivo.name.split('.').pop()
      const nomeArquivo = `nf-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('notas-fiscais')
        .upload(nomeArquivo, arquivo, { contentType: arquivo.type })

      if (uploadError) {
        mostrar('Erro ao enviar arquivo.', 'erro')
        setSalvando(false)
        return
      }
      const { data: urlData } = supabase.storage.from('notas-fiscais').getPublicUrl(nomeArquivo)
      arquivo_url = urlData.publicUrl
      arquivo_nome = arquivo.name
    }

    const { error } = await supabase.from('notas_fiscais').insert({
      prestador_id: form.prestador_id,
      contrato_id: form.contrato_id || null,
      numero: form.numero,
      data_emissao: form.data_emissao,
      mes_referencia: form.mes_referencia || null,
      valor: parseFloat(form.valor),
      status: form.status,
      data_pagamento: form.status === 'pago' ? new Date().toISOString().split('T')[0] : null,
      arquivo_url,
      arquivo_nome,
      observacoes: form.observacoes || null,
    })

    if (error) {
      mostrar('Erro ao registrar NF.', 'erro')
      setSalvando(false)
      return
    }

    mostrar('Nota fiscal registrada com sucesso!', 'sucesso')
    setTimeout(() => router.push('/financeiro'), 1200)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Nova Nota Fiscal"
        subtitulo="Registre uma nota fiscal recebida"
        acoes={
          <Link href="/financeiro" className="btn-secondary">
            <ArrowLeft size={16} /> Voltar
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto">
          <div className="card space-y-5">
            <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Dados da Nota Fiscal</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="form-label">Prestador *</label>
                <select name="prestador_id" value={form.prestador_id} onChange={handleChange} required className="form-select">
                  <option value="">Selecione um prestador</option>
                  {prestadores.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome_empresa}</option>
                  ))}
                </select>
              </div>

              {contratos.length > 0 && (
                <div className="sm:col-span-2">
                  <label className="form-label">Contrato (opcional)</label>
                  <select name="contrato_id" value={form.contrato_id} onChange={handleChange} className="form-select">
                    <option value="">Sem vínculo com contrato</option>
                    {contratos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.numero ? `Contrato ${c.numero}` : 'Contrato'} — {c.objeto ?? 'Sem descrição'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label">Número da NF *</label>
                <input name="numero" value={form.numero} onChange={handleChange} required placeholder="Ex: 00123" className="form-input font-mono" />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="form-select">
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="form-label">Data de Emissão *</label>
                <input name="data_emissao" type="date" value={form.data_emissao} onChange={handleChange} required className="form-input" />
              </div>

              <div>
                <label className="form-label">Mês de Referência</label>
                <input name="mes_referencia" type="month" value={form.mes_referencia} onChange={handleChange} className="form-input" />
              </div>

              <div>
                <label className="form-label">Valor (R$) *</label>
                <input name="valor" type="number" step="0.01" min="0" value={form.valor} onChange={handleChange} required placeholder="0,00" className="form-input" />
              </div>

              {/* Anexo */}
              <div className="sm:col-span-2">
                <label className="form-label flex items-center gap-1.5">
                  <Paperclip size={13} /> Anexo da NF
                </label>

                {arquivo ? (
                  <div className="flex items-center gap-2 p-2.5 border border-green-200 bg-green-50 rounded-lg text-sm text-green-700">
                    <Paperclip size={14} className="flex-shrink-0" />
                    <span className="flex-1 truncate">{arquivo.name}</span>
                    <button type="button" onClick={() => setArquivo(null)} className="text-green-600 hover:text-green-800 flex-shrink-0">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 p-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-500">
                    <Upload size={15} />
                    Clique para anexar PDF, JPG ou PNG (máx. 10 MB)
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={handleArquivo} className="hidden" />
                  </label>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="form-label">Observações</label>
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} className="form-textarea" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/financeiro" className="btn-secondary">Cancelar</Link>
              <button type="submit" disabled={salvando} className="btn-primary">
                <Save size={16} /> {salvando ? 'Salvando...' : 'Registrar NF'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {ToastComponent}
    </div>
  )
}
