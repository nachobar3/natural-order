import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Natural Order - Trading de MTG con gente cerca tuyo',
  description: 'Encontrá quien tiene las cartas que buscás, cerca de tu casa.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Natural Order',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Natural Order',
    title: 'Natural Order - Trading de MTG con gente cerca tuyo',
    description: 'Encontrá quien tiene las cartas que buscás, cerca de tu casa.',
  },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
