import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function verificarAdmin() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('tipo')
    .eq('id', session.user.id)
    .single()

  if (data?.tipo !== 'administrador') return null
  return session.user
}

export async function GET() {
  const user = await verificarAdmin()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const supabase = await createClient()

  const [{ data: usuarios, error }, { data: userModulos }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome, email, tipo, ativo, celular, created_at')
      .order('nome'),
    supabase
      .from('usuario_modulos')
      .select('usuario_id, modulo_id'),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const modulosPorUsuario = (userModulos ?? []).reduce<Record<string, string[]>>((acc, um) => {
    if (!acc[um.usuario_id]) acc[um.usuario_id] = []
    acc[um.usuario_id].push(um.modulo_id)
    return acc
  }, {})

  const result = (usuarios ?? []).map((u) => ({
    ...u,
    moduloIds: modulosPorUsuario[u.id] ?? [],
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const admin = await verificarAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { nome, email, tipo, celular, moduloIds } = await req.json()

  if (!nome || !email || !tipo) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { nome, tipo, celular: celular || null },
  })

  if (authError) {
    const msg = authError.message.includes('already registered')
      ? 'Este e-mail já está cadastrado.'
      : authError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  await adminClient
    .from('usuarios')
    .update({ nome, tipo, celular: celular || null })
    .eq('id', authData.user.id)

  // Vincular módulos selecionados (admins têm acesso total, não precisa de vínculos)
  if (tipo !== 'administrador' && Array.isArray(moduloIds) && moduloIds.length > 0) {
    await adminClient
      .from('usuario_modulos')
      .insert(moduloIds.map((moduloId: string) => ({ usuario_id: authData.user.id, modulo_id: moduloId })))
  }

  return NextResponse.json({ id: authData.user.id }, { status: 201 })
}
