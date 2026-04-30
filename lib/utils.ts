import { format, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  try {
    return format(parseISO(date), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return '-'
  }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '')
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )
}

export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function diasParaVencer(dataFim: string): number {
  return differenceInDays(parseISO(dataFim), new Date())
}

export function contratoStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ativo: 'Ativo',
    vencendo: 'Vencendo',
    vencido: 'Vencido',
    encerrado: 'Encerrado',
  }
  return labels[status] ?? status
}

export function contratoStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ativo: 'bg-green-100 text-green-800',
    vencendo: 'bg-yellow-100 text-yellow-800',
    vencido: 'bg-red-100 text-red-800',
    encerrado: 'bg-gray-100 text-gray-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

export function nfStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendente: 'Pendente',
    pago: 'Pago',
    cancelado: 'Cancelado',
  }
  return labels[status] ?? status
}

export function nfStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pendente: 'bg-yellow-100 text-yellow-800',
    pago: 'bg-green-100 text-green-800',
    cancelado: 'bg-red-100 text-red-800',
  }
  return colors[status] ?? 'bg-gray-100 text-gray-800'
}

export function notificacaoIcon(tipo: string): string {
  const icons: Record<string, string> = {
    contrato_vencendo: '📋',
    recesso_proximo: '🏖️',
    nf_pendente: '📄',
    info: 'ℹ️',
    alerta: '⚠️',
  }
  return icons[tipo] ?? '🔔'
}

export function truncate(text: string, length = 40): string {
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}
