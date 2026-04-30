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
  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome, email, tipo, ativo, celular, created_at')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const admin = await verificarAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { nome, email, tipo, celular } = await req.json()

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

  return NextResponse.json({ id: authData.user.id }, { status: 201 })
}
