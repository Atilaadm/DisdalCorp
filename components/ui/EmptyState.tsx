import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icone: LucideIcon
  titulo: string
  descricao?: string
  acao?: React.ReactNode
}

export default function EmptyState({ icone: Icone, titulo, descricao, acao }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex items-center justify-center w-14 h-14 bg-gray-100 rounded-2xl mb-4">
        <Icone className="w-7 h-7 text-gray-400" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 mb-1">{titulo}</h3>
      {descricao && <p className="text-sm text-gray-500 max-w-xs mb-4">{descricao}</p>}
      {acao}
    </div>
  )
}
