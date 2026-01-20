import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Natural Order - Trading de MTG con gente cerca tuyo',
  description: 'Encontrá quien tiene las cartas que buscás, cerca de tu casa.',
  icons: {
    icon: '/logo-removebg-preview.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="min-h-screen scrollbar-custom">
        {/* Global gradient background */}
        <div className="gradient-bg" />
        {children}
      </body>
    </html>
  )
}
