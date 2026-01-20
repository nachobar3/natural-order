import { createClient } from '@/lib/supabase/server'
import { MapPin, RefreshCcw, Package, Bell } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: locations } = await supabase
    .from('locations')
    .select('*')
    .eq('user_id', user.id)

  const activeLocation = locations?.find((loc: { is_active: boolean }) => loc.is_active)

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">
          ¡Hola, {(profile as { display_name?: string })?.display_name || 'Usuario'}!
        </h1>
        <p className="text-gray-400 mt-1">
          Bienvenido a tu panel de Natural Order
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-mtg-green-600/20">
              <MapPin className="w-6 h-6 text-mtg-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Ubicación activa</p>
              <p className="font-semibold text-gray-100">
                {(activeLocation as { name?: string })?.name || 'Sin configurar'}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Mis cartas</p>
              <p className="font-semibold text-gray-100">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-mtg-gold/20">
              <RefreshCcw className="w-6 h-6 text-mtg-gold" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Trades</p>
              <p className="font-semibold text-gray-100">0</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/20">
              <Bell className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Notificaciones</p>
              <p className="font-semibold text-gray-100">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Setup checklist for new users */}
      {!activeLocation && (
        <div className="card border-l-4 border-l-mtg-green-500">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">
            Completá tu perfil
          </h2>
          <div className="space-y-3">
            <SetupItem
              completed={!!(profile as { display_name?: string })?.display_name && !!activeLocation}
              label="Completar perfil y ubicación"
              href="/dashboard/profile"
            />
            <SetupItem
              completed={false}
              label="Subir tus cartas"
              href="#"
              disabled
            />
          </div>
        </div>
      )}

      {/* Recent activity placeholder */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">
          Actividad reciente
        </h2>
        <div className="text-center py-8 text-gray-400">
          <RefreshCcw className="w-12 h-12 mx-auto mb-3 text-gray-600" />
          <p>No hay actividad reciente</p>
          <p className="text-sm mt-1">
            Cuando realices trades, aparecerán aquí
          </p>
        </div>
      </div>
    </div>
  )
}

function SetupItem({
  completed,
  label,
  href,
  disabled = false,
}: {
  completed: boolean
  label: string
  href: string
  disabled?: boolean
}) {
  const content = (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-mtg-green-900/20'
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        completed ? 'bg-mtg-green-500 text-white' : 'border-2 border-gray-600'
      }`}>
        {completed && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={completed ? 'line-through text-gray-500' : 'text-gray-300'}>
        {label}
      </span>
    </div>
  )

  if (disabled) {
    return content
  }

  return <Link href={href}>{content}</Link>
}
