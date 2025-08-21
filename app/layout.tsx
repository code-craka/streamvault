import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

// Initialize configuration system on server-side
import '@/lib/config/init'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StreamVault - Professional Live Streaming Platform',
  description:
    'Modern, aesthetic live streaming platform with subscription-based monetization and enterprise-grade features.',
  keywords: [
    'streaming',
    'live',
    'video',
    'content',
    'creator',
    'monetization',
  ],
  authors: [{ name: 'StreamVault Team' }],
  creator: 'StreamVault',
  publisher: 'StreamVault',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  ),
  openGraph: {
    title: 'StreamVault - Professional Live Streaming Platform',
    description:
      'Modern, aesthetic live streaming platform with subscription-based monetization and enterprise-grade features.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'StreamVault',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreamVault - Professional Live Streaming Platform',
    description:
      'Modern, aesthetic live streaming platform with subscription-based monetization and enterprise-grade features.',
    creator: '@streamvault',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <div id="root">{children}</div>
      </body>
    </html>
  )
}
