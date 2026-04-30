import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShellClient from '@/components/layout/ShellClient'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, tipo')
    .eq('id', user.id)
    .single()

  const { count: naoLidas } = await supabase
    .from('notificacoes')
    .select('*', { count: 'exact', head: true })
    .eq('lida', false)

  return (
    <ShellClient
      naoLidas={naoLidas ?? 0}
      nomeUsuario={usuario?.nome ?? user.email ?? ''}
      tipoUsuario={usuario?.tipo ?? 'analista_financeiro'}
    >
      {children}
    </ShellClient>
  )
}
