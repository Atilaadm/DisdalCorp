'use client'

import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

interface ConfirmDialogProps {
  aberto: boolean
  onFechar: () => void
  onConfirmar: () => void
  titulo: string
  mensagem: string
  textoBotao?: string
  carregando?: boolean
}

export default function ConfirmDialog({
  aberto,
  onFechar,
  onConfirmar,
  titulo,
  mensagem,
  textoBotao = 'Confirmar',
  carregando = false,
}: ConfirmDialogProps) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={titulo} tamanho="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <p className="text-sm text-gray-600">{mensagem}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onFechar} className="btn-secondary flex-1 justify-center">
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={carregando} className="btn-danger flex-1 justify-center">
            {carregando ? 'Aguarde...' : textoBotao}
          </button>
        </div>
      </div>
    </Modal>
  )
}
