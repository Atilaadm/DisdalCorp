// Sincronização manual de eventos do Outlook
// POST /api/agenda/sync/microsoft

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getMicrosoftCalendarEvents,
  refreshAccessToken,
  calcularExpiresAt,
  stripHtml,
} from '@/lib/microsoft-graph'
import { addMonths, subMonths } from 'date-fns'

export async function POST() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const userId = session.user.id
  const admin  = createAdminClient()

  // Busca conta OAuth conectada
  const { data: conta, error: contaError } = await admin
    .from('agenda_contas_oauth')
    .select('*')
    .eq('usuario_id', userId)
    .eq('provedor', 'microsoft')
    .eq('ativo', true)
    .single()

  if (contaError || !conta) {
    return NextResponse.json({ error: 'Conta Microsoft não conectada.' }, { status: 400 })
  }

  let accessToken = conta.access_token

  // Renova token se expirado ou próximo de expirar
  const expiresAt = conta.token_expires_at ? new Date(conta.token_expires_at) : new Date(0)
  if (expiresAt <= new Date() && conta.refresh_token) {
    try {
      const novosTokens = await refreshAccessToken(conta.refresh_token)
      accessToken = novosTokens.access_token

      await admin
        .from('agenda_contas_oauth')
        .update({
          access_token:     novosTokens.access_token,
          refresh_token:    novosTokens.refresh_token ?? conta.refresh_token,
          token_expires_at: calcularExpiresAt(novosTokens.expires_in).toISOString(),
        })
        .eq('id', conta.id)
    } catch {
      return NextResponse.json({ error: 'Token expirado. Reconecte sua conta Microsoft.' }, { status: 401 })
    }
  }

  // Busca eventos: 1 mês atrás até 3 meses à frente
  const inicio = subMonths(new Date(), 1)
  const fim    = addMonths(new Date(), 3)

  try {
    const eventos = await getMicrosoftCalendarEvents(accessToken, inicio, fim)

    if (eventos.length > 0) {
      const eventosParaInserir = eventos.map((e) => ({
        titulo:       e.subject || '(Sem título)',
        descricao:    e.body?.content ? stripHtml(e.body.content) : null,
        local:        e.location?.displayName || null,
        link_reuniao: e.onlineMeeting?.joinUrl || null,
        inicio:       new Date(`${e.start.dateTime}${e.start.timeZone === 'UTC' ? 'Z' : ''}`).toISOString(),
        fim:          new Date(`${e.end.dateTime}${e.end.timeZone === 'UTC' ? 'Z' : ''}`).toISOString(),
        dia_inteiro:  e.isAllDay,
        tipo:         'reuniao',
        cor:          '#0078D4',
        source:       'microsoft',
        source_id:    e.id,
        source_owner: userId,
        criado_por:   userId,
      }))

      await admin
        .from('agenda_eventos')
        .upsert(eventosParaInserir, { onConflict: 'source,source_id', ignoreDuplicates: false })
    }

    // Remove eventos do Outlook que não vieram mais (deletados no Outlook)
    const idsAtuais = eventos.map((e) => e.id)
    if (idsAtuais.length > 0) {
      await admin
        .from('agenda_eventos')
        .delete()
        .eq('source', 'microsoft')
        .eq('source_owner', userId)
        .not('source_id', 'in', `(${idsAtuais.map((id) => `"${id}"`).join(',')})`)
    }

    // Atualiza timestamp
    await admin
      .from('agenda_contas_oauth')
      .update({ sincronizado_em: new Date().toISOString() })
      .eq('id', conta.id)

    return NextResponse.json({ ok: true, eventos: eventos.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro na sincronização'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
