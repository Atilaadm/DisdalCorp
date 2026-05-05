import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarioClient from './CalendarioClient'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, email, tipo')
    .eq('ativo', true)
    .order('nome')

  return (
    <CalendarioClient
      usuarios={usuarios ?? []}
      usuarioAtualId={user.id}
    />
  )
}
