'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home,
  User,
  LogOut,
  Menu,
  X,
  Package,
  Heart,
  Bell,
  MapPin,
} from 'lucide-react'
import type { User as UserType } from '@/types/database'

const navItems = [
  { href: '/dashboard', label: 'Inicio', icon: Home },
  { href: '/dashboard/collection', label: 'Colección', icon: Package },
  { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/dashboard/profile', label: 'Perfil', icon: User },
]

export function DashboardNav({ user }: { user: UserType | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [locationName, setLocationName] = useState<string | null>(null)

  const supabase = createClient()

  // Fetch user's location
  useEffect(() => {
    async function fetchLocation() {
      if (!user) return
      try {
        const { data } = await supabase
          .from('locations')
          .select('name, address')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()

        if (data) {
          // Use address (shorter) or name
          setLocationName(data.address || data.name)
        }
      } catch (err) {
        console.error('Error fetching location:', err)
      }
    }

    fetchLocation()
  }, [user, supabase])

  // Fetch unread notification count
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/notifications?unread=true&limit=1')
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (err) {
        console.error('Error fetching notifications count:', err)
      }
    }

    fetchUnreadCount()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Reset unread count when visiting notifications page
  useEffect(() => {
    if (pathname === '/dashboard/notifications') {
      // Delay to allow page to mark as read first
      const timeout = setTimeout(() => {
        setUnreadCount(0)
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isNotificationsActive = pathname === '/dashboard/notifications'

  return (
    <nav className="bg-mtg-dark/80 border-b border-mtg-green-900/30 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image
                src="/logo-removebg-preview.png"
                alt="Natural Order"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="logo-text text-xl hidden sm:block">
                Natural Order
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-mtg-green-600/20 text-mtg-green-400'
                      : 'text-gray-400 hover:bg-mtg-green-900/20 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* User menu */}
          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <Link
              href="/dashboard/notifications"
              className={`relative p-2 rounded-lg transition-colors ${
                isNotificationsActive
                  ? 'bg-mtg-green-600/20 text-mtg-green-400'
                  : 'text-gray-400 hover:bg-mtg-green-900/20 hover:text-gray-200'
              }`}
              title="Notificaciones"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-mtg-green-500 text-mtg-dark rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden md:flex items-center gap-3 ml-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-200">
                  {user?.display_name}
                </p>
                {locationName && (
                  <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{locationName}</span>
                  </p>
                )}
              </div>
              <button
                onClick={handleSignOut}
                className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-mtg-green-900/20"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-mtg-green-900/30 bg-mtg-dark/95 backdrop-blur-sm">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-mtg-green-600/20 text-mtg-green-400'
                      : 'text-gray-400 hover:bg-mtg-green-900/20 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              )
            })}
            {/* Notifications in mobile menu */}
            <Link
              href="/dashboard/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                isNotificationsActive
                  ? 'bg-mtg-green-600/20 text-mtg-green-400'
                  : 'text-gray-400 hover:bg-mtg-green-900/20 hover:text-gray-200'
              }`}
            >
              <Bell className="w-5 h-5" />
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-mtg-green-500 text-mtg-dark rounded-full">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
            <hr className="my-2 border-mtg-green-900/30" />
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-gray-200">
                {user?.display_name}
              </p>
              {locationName && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{locationName}</span>
                </p>
              )}
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}
