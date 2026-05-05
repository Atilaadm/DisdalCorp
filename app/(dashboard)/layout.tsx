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

  const tipoUsuario = usuario?.tipo ?? 'analista_financeiro'
  const isAdmin = tipoUsuario === 'administrador'

  // Buscar módulos acessíveis
  let moduloSlugs: string[] = []
  if (isAdmin) {
    const { data: todosModulos } = await supabase
      .from('modulos')
      .select('slug')
      .eq('ativo', true)
      .order('ordem')
    moduloSlugs = todosModulos?.map((m: { slug: string }) => m.slug) ?? []
  } else {
    const { data: userModulos } = await supabase
      .from('usuario_modulos')
      .select('modulo_id, modulos(slug, ativo)')
      .eq('usuario_id', user.id)
    moduloSlugs = (userModulos ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => row.modulos)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m?.ativo)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => m?.slug)
      .filter(Boolean)
  }

  const { count: naoLidas } = await supabase
    .from('notificacoes')
    .select('*', { count: 'exact', head: true })
    .eq('lida', false)

  return (
    <ShellClient
      naoLidas={naoLidas ?? 0}
      nomeUsuario={usuario?.nome ?? user.email ?? ''}
      tipoUsuario={tipoUsuario}
      moduloSlugs={moduloSlugs}
    >
      {children}
    </ShellClient>
  )
}
