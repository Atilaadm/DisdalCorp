export type UserTipo = 'administrador' | 'analista_financeiro' | 'coordenador' | 'gerente' | 'supervisor' | 'diretor'
export type PrestadorStatus = 'ativo' | 'inativo'
export type RegraBonus = 'mensal' | 'trimestral' | 'semestral' | 'anual'
export type ContratoStatus = 'ativo' | 'vencendo' | 'vencido' | 'encerrado'
export type NFStatus = 'pendente' | 'pago' | 'cancelado'
export type NotificacaoTipo = 'contrato_vencendo' | 'recesso_proximo' | 'nf_pendente' | 'info' | 'alerta'

export interface Usuario {
  id: string
  nome: string
  email: string
  tipo: UserTipo
  ativo: boolean
  celular: string | null
  created_at: string
  updated_at: string
}

export interface Prestador {
  id: string
  nome_empresa: string
  cnpj: string
  responsavel: string
  email: string | null
  telefone: string | null
  tipo_servico: string
  valor_contrato: number | null
  valor_bonus: number | null
  regra_pagamento_bonus: RegraBonus | null
  status: PrestadorStatus
  observacoes: string | null
  created_at: string
  updated_at: string
}

export interface Contrato {
  id: string
  prestador_id: string
  numero: string | null
  objeto: string | null
  data_inicio: string
  data_fim: string
  valor: number
  status: ContratoStatus
  arquivo_url: string | null
  arquivo_nome: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  prestador?: Prestador
}

export interface ContratoHistorico {
  id: string
  contrato_id: string
  usuario_id: string | null
  campo: string
  valor_anterior: string | null
  valor_novo: string | null
  created_at: string
  usuario?: Usuario
}

export interface NotaFiscal {
  id: string
  prestador_id: string
  contrato_id: string | null
  numero: string
  data_emissao: string
  mes_referencia: string | null
  valor: number
  status: NFStatus
  data_pagamento: string | null
  arquivo_url: string | null
  arquivo_nome: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  prestador?: Prestador
  contrato?: Contrato
}

export interface Recesso {
  id: string
  prestador_id: string
  data_inicio: string
  data_fim: string
  descricao: string | null
  dias_corridos: number | null
  created_at: string
  prestador?: Prestador
}

export interface Notificacao {
  id: string
  tipo: NotificacaoTipo
  titulo: string
  mensagem: string
  lida: boolean
  referencia_id: string | null
  referencia_tipo: string | null
  created_at: string
}

export interface DashboardStats {
  totalPrestadores: number
  prestadoresAtivos: number
  contratosAtivos: number
  contratosVencendo: number
  contratosVencidos: number
  nfsPendentes: number
  nfsPagas: number
  valorNfsPendentes: number
  notificacoesNaoLidas: number
}
