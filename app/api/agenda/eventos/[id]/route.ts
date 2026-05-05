import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarAtualizacaoEvento } from '@/lib/email'

async function autenticar() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { supabase, user: session.user } : null
}

const TIPO_CORES = {
  reuniao:     '#1A3A8A',
  compromisso: '#009B94',
  viagem:      '#4DB848',
  outro:       '#6B7280',
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await autenticar()
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { supabase, user } = auth
  const { id } = await params
  const body = await req.json()
  const {
    titulo, descricao, local, linkReuniao,
    inicio, fim, diaInteiro, tipo, participanteIds,
  } = body

  // Monta apenas os campos enviados
  const updates: Record<string, unknown> = {}
  if (titulo        !== undefined) updates.titulo       = titulo
  if (descricao     !== undefined) updates.descricao    = descricao    || null
  if (local         !== undefined) updates.local        = local        || null
  if (linkReuniao   !== undefined) updates.link_reuniao = linkReuniao  || null
  if (inicio        !== undefined) updates.inicio       = inicio
  if (fim           !== undefined) updates.fim          = fim
  if (diaInteiro    !== undefined) updates.dia_inteiro  = diaInteiro
  if (tipo          !== undefined) {
    updates.tipo = tipo
    updates.cor  = TIPO_CORES[tipo as keyof typeof TIPO_CORES] ?? '#1A3A8A'
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('agenda_eventos')
      .update(updates)
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Atualizar participantes (substituição completa)
  if (Array.isArray(participanteIds)) {
    await supabase.from('agenda_participantes').delete().eq('evento_id', id)
    const todos = [...new Set([user.id, ...participanteIds])] as string[]
    if (todos.length > 0) {
      await supabase.from('agenda_participantes').insert(
        todos.map((uid) => ({
          evento_id:  id,
          usuario_id: uid,
          status:     uid === user.id ? 'aceito' : 'pendente',
        }))
      )
    }

    // Notificar participantes sobre a atualização
    const outrosParticipantes = participanteIds.filter((pid: string) => pid !== user.id)
    if (outrosParticipantes.length > 0 && titulo && inicio && fim) {
      const [{ data: participantes }, { data: criador }] = await Promise.all([
        supabase.from('usuarios').select('email').in('id', outrosParticipantes),
        supabase.from('usuarios').select('nome').eq('id', user.id).single(),
      ])
      const emails = participantes?.map((u) => u.email).filter(Boolean) ?? []
      if (emails.length > 0) {
        await enviarAtualizacaoEvento({
          para:        emails,
          titulo,
          inicio:      new Date(inicio),
          fim:         new Date(fim),
          local:       local || null,
          linkReuniao: linkReuniao || null,
          descricao:   descricao || null,
          criadorNome: criador?.nome ?? 'Sistema',
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await autenticar()
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { supabase } = auth
  const { id } = await params

  const { error } = await supabase.from('agenda_eventos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
