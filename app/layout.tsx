import React from "react"
import type { Metadata, Viewport } from 'next'
import { Manrope, Sora } from 'next/font/google'
import { RegisterSW } from '@/components/register-sw'

import './globals.css'

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' })
const sora = Sora({ subsets: ['latin'], variable: '--font-display' })

export const metadata: Metadata = {
  title: 'Checklist Pupitre',
  description: 'Checklist de preparation spectacle - gestion du materiel son, light et actes',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Checklist Pupitre',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f1218',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" className={`${manrope.variable} ${sora.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
