'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/layout/Header'
import { useToast } from '@/components/ui/Toast'
import { Prestador, ContratoHistorico } from '@/lib/supabase/types'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, Save, Upload, X, Download, History } from 'lucide-react'
import Link from 'next/link'

export default function EditarContratoPage() {
  const params = useParams()
  const router = useRouter()
  const { mostrar, ToastComponent } = useToast()
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [prestadores, setPrestadores] = useState<Pick<Prestador, 'id' | 'nome_empresa'>[]>([])
  const [historico, setHistorico] = useState<ContratoHistorico[]>([])
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arquivoAtual, setArquivoAtual] = useState<{ url: string; nome: string } | null>(null)

  const [form, setForm] = useState({
    prestador_id: '',
    numero: '',
    objeto: '',
    data_inicio: '',
    data_fim: '',
    valor: '',
    status: 'ativo',
    observacoes: '',
  })

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const [{ data: contrato }, { data: prests }, { data: hist }] = await Promise.all([
        supabase.from('contratos').select('*').eq('id', params.id).single(),
        supabase.from('prestadores').select('id, nome_empresa').eq('status', 'ativo').order('nome_empresa'),
        supabase.from('contratos_historico').select('*, usuario:usuarios(nome)').eq('contrato_id', params.id).order('created_at', { ascending: false }).limit(10),
      ])

      if (contrato) {
        setForm({
          prestador_id: contrato.prestador_id,
          numero: contrato.numero ?? '',
          objeto: contrato.objeto ?? '',
          data_inicio: contrato.data_inicio,
          data_fim: contrato.data_fim,
          valor: contrato.valor?.toString() ?? '',
          status: contrato.status,
          observacoes: contrato.observacoes ?? '',
        })
        if (contrato.arquivo_url) {
          setArquivoAtual({ url: contrato.arquivo_url, nome: contrato.arquivo_nome ?? 'contrato.pdf' })
        }
      }
      setPrestadores(prests ?? [])
      setHistorico(hist ?? [])
      setCarregando(false)
    }
    carregar()
  }, [params.id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') setArquivo(file)
    else if (file) mostrar('Apenas arquivos PDF são aceitos.', 'erro')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)

    const supabase = createClient()
    let arquivo_url = arquivoAtual?.url ?? null
    let arquivo_nome = arquivoAtual?.nome ?? null

    if (arquivo) {
      const nomeArquivo = `${Date.now()}-${arquivo.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('contratos').upload(nomeArquivo, arquivo, { contentType: 'application/pdf' })
      if (uploadError) {
        mostrar('Erro ao enviar arquivo.', 'erro')
        setSalvando(false)
        return
      }
      const { data: urlData } = supabase.storage.from('contratos').getPublicUrl(nomeArquivo)
      arquivo_url = urlData.publicUrl
      arquivo_nome = arquivo.name
    }

    const { error } = await supabase.from('contratos').update({
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
    }).eq('id', params.id as string)

    if (error) {
      mostrar('Erro ao salvar alterações.', 'erro')
    } else {
      mostrar('Contrato atualizado!', 'sucesso')
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
        titulo="Editar Contrato"
        acoes={
          <Link href="/contratos" className="btn-secondary">
            <ArrowLeft size={16} /> Voltar
          </Link>
        }
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="card space-y-5">
              <h3 className="font-semibold text-gray-900 border-b border-gray-100 pb-3">Dados do Contrato</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="form-label">Prestador *</label>
                  <select name="prestador_id" value={form.prestador_id} onChange={handleChange} required className="form-select">
                    {prestadores.map((p) => (
                      <option key={p.id} value={p.id}>{p.nome_empresa}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Número do Contrato</label>
                  <input name="numero" value={form.numero} onChange={handleChange} className="form-input" />
                </div>

                <div>
                  <label className="form-label">Status</label>
                  <select name="status" value={form.status} onChange={handleChange} className="form-select">
                    <option value="ativo">Ativo</option>
                    <option value="vencendo">Vencendo</option>
                    <option value="vencido">Vencido</option>
                    <option value="encerrado">Encerrado</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">Objeto do Contrato</label>
                  <input name="objeto" value={form.objeto} onChange={handleChange} className="form-input" />
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
                  <input name="valor" type="number" step="0.01" min="0" value={form.valor} onChange={handleChange} required className="form-input" />
                </div>

                <div>
                  <label className="form-label">Arquivo PDF</label>
                  {arquivo ? (
                    <div className="flex items-center gap-2 p-2.5 border border-green-200 bg-green-50 rounded-lg text-sm text-green-700">
                      <span className="flex-1 truncate">{arquivo.name}</span>
                      <button type="button" onClick={() => setArquivo(null)} className="text-green-600"><X size={16} /></button>
                    </div>
                  ) : arquivoAtual ? (
                    <div className="flex items-center gap-2 p-2.5 border border-blue-200 bg-blue-50 rounded-lg text-sm text-blue-700">
                      <span className="flex-1 truncate">{arquivoAtual.nome}</span>
                      <a href={arquivoAtual.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                        <Download size={16} />
                      </a>
                      <button type="button" onClick={() => setArquivoAtual(null)} className="text-blue-600"><X size={16} /></button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 p-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-500">
                      <Upload size={16} />
                      Selecionar PDF
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
                  <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </form>

          {/* Histórico */}
          {historico.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <History size={16} className="text-indigo-600" /> Histórico de Alterações
              </h3>
              <div className="space-y-2">
                {historico.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-3 text-sm py-2 border-b border-gray-50 last:border-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-700">{h.campo}</span>
                      {' '}<span className="text-gray-400">alterado de</span>{' '}
                      <span className="text-gray-600">{h.valor_anterior ?? '—'}</span>
                      {' '}<span className="text-gray-400">para</span>{' '}
                      <span className="text-gray-900 font-medium">{h.valor_novo ?? '—'}</span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(h.created_at)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {ToastComponent}
    </div>
  )
}
