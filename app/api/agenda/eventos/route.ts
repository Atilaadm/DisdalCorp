import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enviarConviteEvento } from '@/lib/email'

async function autenticar() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { supabase, user: session.user } : null
}

export async function GET(req: NextRequest) {
  const auth = await autenticar()
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { supabase } = auth
  const url = new URL(req.url)
  const inicio     = url.searchParams.get('inicio')
  const fim        = url.searchParams.get('fim')
  const usuarioId  = url.searchParams.get('usuarioId')

  // Se filtro por usuário, busca IDs dos eventos em que ele participa
  let eventoIdsFiltro: string[] | null = null
  if (usuarioId && usuarioId !== 'todos') {
    const { data } = await supabase
      .from('agenda_participantes')
      .select('evento_id')
      .eq('usuario_id', usuarioId)
    eventoIdsFiltro = data?.map((p) => p.evento_id) ?? []
    if (eventoIdsFiltro.length === 0) return NextResponse.json([])
  }

  let query = supabase
    .from('agenda_eventos')
    .select(`
      id, titulo, descricao, local, link_reuniao,
      inicio, fim, dia_inteiro, tipo, cor, criado_por, created_at,
      criador:usuarios!criado_por(id, nome),
      participantes:agenda_participantes(
        id, usuario_id, email_externo, nome_externo, status,
        usuario:usuarios(id, nome, email, tipo)
      )
    `)
    .order('inicio')

  if (inicio) query = query.gte('inicio', inicio)
  if (fim)    query = query.lte('inicio', fim)
  if (eventoIdsFiltro) query = query.in('id', eventoIdsFiltro)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await autenticar()
  if (!auth) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { supabase, user } = auth
  const body = await req.json()
  const {
    titulo, descricao, local, linkReuniao,
    inicio, fim, diaInteiro, tipo, participanteIds = [],
  } = body

  if (!titulo || !inicio || !fim) {
    return NextResponse.json({ error: 'Título, início e fim são obrigatórios.' }, { status: 400 })
  }

  const cor = TIPO_CORES[tipo as keyof typeof TIPO_CORES] ?? '#1A3A8A'

  const { data: evento, error } = await supabase
    .from('agenda_eventos')
    .insert({
      titulo,
      descricao:    descricao    || null,
      local:        local        || null,
      link_reuniao: linkReuniao  || null,
      inicio,
      fim,
      dia_inteiro:  diaInteiro ?? false,
      tipo:         tipo ?? 'reuniao',
      cor,
      criado_por:   user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Participantes: criador sempre incluído como aceito
  const todos = [...new Set([user.id, ...participanteIds])] as string[]
  await supabase.from('agenda_participantes').insert(
    todos.map((uid) => ({
      evento_id:  evento.id,
      usuario_id: uid,
      status:     uid === user.id ? 'aceito' : 'pendente',
    }))
  )

  // Enviar convite por e-mail aos participantes (exceto o criador)
  const outrosParticipantes = participanteIds.filter((id: string) => id !== user.id)
  if (outrosParticipantes.length > 0) {
    const [{ data: participantes }, { data: criador }] = await Promise.all([
      supabase.from('usuarios').select('email').in('id', outrosParticipantes),
      supabase.from('usuarios').select('nome').eq('id', user.id).single(),
    ])
    const emails = participantes?.map((u) => u.email).filter(Boolean) ?? []
    if (emails.length > 0) {
      await enviarConviteEvento({
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

  return NextResponse.json({ id: evento.id }, { status: 201 })
}

const TIPO_CORES = {
  reuniao:     '#1A3A8A',
  compromisso: '#009B94',
  viagem:      '#4DB848',
  outro:       '#6B7280',
}
