'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Package, Heart, Bell, User, ArrowLeftRight } from 'lucide-react'
import { useEffect, useState } from 'react'

const navItems = [
  { href: '/dashboard/collection', label: 'Colección', icon: Package },
  { href: '/dashboard/wishlist', label: 'Wishlist', icon: Heart },
  { href: '/dashboard', label: 'Trades', icon: ArrowLeftRight, isCenter: true },
  { href: '/dashboard/notifications', label: 'Alertas', icon: Bell, hasBadge: true },
  { href: '/dashboard/profile', label: 'Perfil', icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)

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
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  // Reset unread count when visiting notifications page
  useEffect(() => {
    if (pathname === '/dashboard/notifications') {
      const timeout = setTimeout(() => setUnreadCount(0), 1500)
      return () => clearTimeout(timeout)
    }
  }, [pathname])

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-mtg-dark/95 border-t border-mtg-green-900/30 backdrop-blur-sm safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                item.isCenter ? 'px-2' : ''
              }`}
            >
              {item.isCenter ? (
                // Center item (Trades) - bigger and highlighted
                <div className={`flex flex-col items-center justify-center p-2 rounded-full transition-colors ${
                  isActive
                    ? 'bg-mtg-green-600 text-white'
                    : 'bg-mtg-green-600/20 text-mtg-green-400'
                }`}>
                  <Icon className="w-6 h-6" />
                </div>
              ) : (
                // Regular items
                <div className="relative">
                  <Icon className={`w-6 h-6 ${
                    isActive ? 'text-mtg-green-400' : 'text-gray-500'
                  }`} />
                  {item.hasBadge && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold bg-mtg-green-500 text-mtg-dark rounded-full">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              )}
              <span className={`text-[10px] mt-1 ${
                isActive ? 'text-mtg-green-400' : 'text-gray-500'
              } ${item.isCenter ? 'font-medium' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
