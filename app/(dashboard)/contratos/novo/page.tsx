'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'
type PrestadorOpcao = { id: string; nome_empresa: string }
import { ArrowLeft, Save, Upload, X } from 'lucide-react'
import Link from 'next/link'

export default function NovoContratoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prestadorParam = searchParams.get('prestador')
  const { mostrar, ToastComponent } = useToast()

  const [salvando, setSalvando] = useState(false)
  const [prestadores, setPrestadores] = useState<PrestadorOpcao[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)

  const [form, setForm] = useState({
    prestador_id: prestadorParam ?? '',
    numero: '',
    objeto: '',
    data_inicio: '',
    data_fim: '',
    valor: '',
    status: 'ativo',
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setArquivo(file)
    } else if (file) {
      mostrar('Apenas arquivos PDF são aceitos.', 'erro')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)

    const supabase = createClient()
    let arquivo_url = null
    let arquivo_nome = null

    if (arquivo) {
      const nomeArquivo = `${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('contratos')
        .upload(nomeArquivo, arquivo, { contentType: 'application/pdf' })

      if (uploadError) {
        mostrar('Erro ao enviar arquivo PDF.', 'erro')
        setSalvando(false)
        return
      }

      const { data: urlData } = supabase.storage.from('contratos').getPublicUrl(nomeArquivo)
      arquivo_url = urlData.publicUrl
      arquivo_nome = arquivo.name
    }

    const { error } = await supabase.from('contratos').insert({
      prestador_id: form.prestador_id,
      numero: form.numero || null,
      objeto: form.objeto || null,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      valor: parseFloat(form.valor),
      status: form.status,
      observacoes: form.observacoes || null,
      arquivo_url,
      arquivo_nome,
    })

    if (error) {
      mostrar('Erro ao salvar contrato.', 'erro')
      setSalvando(false)
      return
    }

    mostrar('Contrato cadastrado com sucesso!', 'sucesso')
    setTimeout(() => router.push('/contratos'), 1200)
  }

  return (
    <div className="flex flex-col h-full">
      <Header
        titulo="Novo Contrato"
        subtitulo="Preencha os dados do contrato"
        acoes={
          <Link href="/contratos" className="btn-secondary">
            <ArrowLeft size={16} /> Voltar
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="card space-y-5">
            <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Dados do Contrato</h3>

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

              <div>
                <label className="form-label">Número do Contrato</label>
                <input name="numero" value={form.numero} onChange={handleChange} placeholder="Ex: 001/2025" className="form-input" />
              </div>

              <div>
                <label className="form-label">Status</label>
                <select name="status" value={form.status} onChange={handleChange} className="form-select">
                  <option value="ativo">Ativo</option>
                  <option value="encerrado">Encerrado</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="form-label">Objeto do Contrato</label>
                <input name="objeto" value={form.objeto} onChange={handleChange} placeholder="Descrição do serviço contratado" className="form-input" />
              </div>

              <div>
                <label className="form-label">Data de Início *</label>
                <input name="data_inicio" type="date" value={form.data_inicio} onChange={handleChange} required className="form-input" />
              </div>

              <div>
                <label className="form-label">Data de Término *</label>
                <input name="data_fim" type="date" value={form.data_fim} onChange={handleChange} required className="form-input" />
              </div>

              <div>
                <label className="form-label">Valor (R$) *</label>
                <input name="valor" type="number" step="0.01" min="0" value={form.valor} onChange={handleChange} required placeholder="0,00" className="form-input" />
              </div>

              {/* Upload PDF */}
              <div>
                <label className="form-label">Arquivo do Contrato (PDF)</label>
                {arquivo ? (
                  <div className="flex items-center gap-2 p-2.5 border border-green-200 bg-green-50 rounded-lg text-sm text-green-700">
                    <span className="flex-1 truncate">{arquivo.name}</span>
                    <button type="button" onClick={() => setArquivo(null)} className="text-green-600 hover:text-green-800">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 p-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-500">
                    <Upload size={16} />
                    Clique para selecionar PDF
                    <input type="file" accept=".pdf" onChange={handleArquivo} className="hidden" />
                  </label>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="form-label">Observações</label>
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} rows={3} className="form-textarea" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/contratos" className="btn-secondary">Cancelar</Link>
              <button type="submit" disabled={salvando} className="btn-primary">
                <Save size={16} /> {salvando ? 'Salvando...' : 'Cadastrar Contrato'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {ToastComponent}
    </div>
  )
}
