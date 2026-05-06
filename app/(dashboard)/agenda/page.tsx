import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CalendarioClient from './CalendarioClient'

export default async function AgendaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: usuarios }, { data: contaOAuth }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome, email, tipo')
      .eq('ativo', true)
      .order('nome'),
    supabase
      .from('agenda_contas_oauth')
      .select('provedor, email_conta, nome_conta, sincronizado_em, ativo')
      .eq('usuario_id', user.id)
      .eq('provedor', 'microsoft')
      .eq('ativo', true)
      .maybeSingle(),
  ])

  return (
    <CalendarioClient
      usuarios={usuarios ?? []}
      usuarioAtualId={user.id}
      contaMicrosoftConectada={contaOAuth ?? null}
    />
  )
}
