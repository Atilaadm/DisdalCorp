// Inicia o fluxo OAuth com Microsoft
// GET /api/agenda/oauth/microsoft → redireciona para tela de login Microsoft

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMicrosoftAuthUrl } from '@/lib/microsoft-graph'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // State carrega o user ID para recuperar no callback
  const state = Buffer.from(JSON.stringify({ userId: session.user.id })).toString('base64')
  const authUrl = getMicrosoftAuthUrl(state)

  return NextResponse.redirect(authUrl)
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const { error } = await supabase
    .from('agenda_contas_oauth')
    .delete()
    .eq('usuario_id', session.user.id)
    .eq('provedor', 'microsoft')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Remove eventos sincronizados do Outlook deste usuário
  await supabase
    .from('agenda_eventos')
    .delete()
    .eq('source', 'microsoft')
    .eq('source_owner', session.user.id)

  return NextResponse.json({ ok: true })
}
