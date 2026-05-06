// Callback OAuth Microsoft
// GET /api/agenda/oauth/microsoft/callback?code=...&state=...

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  exchangeCodeForTokens,
  getMicrosoftUserProfile,
  getMicrosoftCalendarEvents,
  calcularExpiresAt,
  stripHtml,
} from '@/lib/microsoft-graph'
import { addMonths, subMonths } from 'date-fns'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://disdal-corp.vercel.app'

export async function GET(req: NextRequest) {
  const url    = new URL(req.url)
  const code   = url.searchParams.get('code')
  const state  = url.searchParams.get('state')
  const erro   = url.searchParams.get('error')

  if (erro) {
    return NextResponse.redirect(`${APP_URL}/agenda?oauth_erro=${encodeURIComponent(erro)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/agenda?oauth_erro=parametros_invalidos`)
  }

  // Recupera userId do state
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64').toString())
    userId = decoded.userId
  } catch {
    return NextResponse.redirect(`${APP_URL}/agenda?oauth_erro=state_invalido`)
  }

  try {
    // Troca code por tokens
    const tokens = await exchangeCodeForTokens(code)
    const expiresAt = calcularExpiresAt(tokens.expires_in)

    // Busca perfil do usuário Microsoft
    const perfil = await getMicrosoftUserProfile(tokens.access_token)
    const emailConta = perfil.mail ?? perfil.userPrincipalName

    // Salva tokens no Supabase (usando admin client para bypass RLS)
    const admin = createAdminClient()
    await admin
      .from('agenda_contas_oauth')
      .upsert({
        usuario_id:      userId,
        provedor:        'microsoft',
        access_token:    tokens.access_token,
        refresh_token:   tokens.refresh_token ?? null,
        token_expires_at: expiresAt.toISOString(),
        email_conta:     emailConta,
        nome_conta:      perfil.displayName,
        sincronizado_em: null,
        ativo:           true,
      }, { onConflict: 'usuario_id,provedor' })

    // Sincronização inicial: 1 mês atrás até 3 meses à frente
    const inicio = subMonths(new Date(), 1)
    const fim    = addMonths(new Date(), 3)

    const eventos = await getMicrosoftCalendarEvents(tokens.access_token, inicio, fim)

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
        cor:          '#0078D4', // azul Outlook
        source:       'microsoft',
        source_id:    e.id,
        source_owner: userId,
        criado_por:   userId,
      }))

      // Upsert para não duplicar em re-sincronizações
      await admin
        .from('agenda_eventos')
        .upsert(eventosParaInserir, { onConflict: 'source,source_id', ignoreDuplicates: false })
    }

    // Atualiza timestamp de sincronização
    await admin
      .from('agenda_contas_oauth')
      .update({ sincronizado_em: new Date().toISOString() })
      .eq('usuario_id', userId)
      .eq('provedor', 'microsoft')

    return NextResponse.redirect(`${APP_URL}/agenda?oauth_sucesso=microsoft`)
  } catch (err) {
    console.error('[oauth/microsoft/callback]', err)
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.redirect(`${APP_URL}/agenda?oauth_erro=${encodeURIComponent(msg)}`)
  }
}
