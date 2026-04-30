import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verificar autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Chama a função SQL que gera as notificações automáticas
    const { error } = await supabase.rpc('gerar_notificacoes')

    if (error) {
      console.error('Erro ao gerar notificações:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Também atualiza status dos contratos vencendo/vencidos
    await supabase.rpc('atualizar_status_contratos')

    return NextResponse.json({ sucesso: true, mensagem: 'Notificações geradas com sucesso' })
  } catch (err) {
    console.error('Erro interno:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// Endpoint GET para ser chamado por cron externo (ex: cron-job.org)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const supabase = await createClient()

  try {
    await supabase.rpc('atualizar_status_contratos')
    await supabase.rpc('gerar_notificacoes')

    return NextResponse.json({ sucesso: true, executado: new Date().toISOString() })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
