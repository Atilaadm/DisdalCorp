import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        naoLidas={naoLidas ?? 0}
        nomeUsuario={usuario?.nome ?? user.email ?? ''}
        tipoUsuario={usuario?.tipo ?? 'analista_financeiro'}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {children}
      </main>
    </div>
  )
}
