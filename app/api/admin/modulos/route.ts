import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { data, error } = await supabase
    .from('modulos')
    .select('id, nome, slug, descricao, icone, ativo, ordem')
    .eq('ativo', true)
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
