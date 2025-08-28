import type { Metadata } from 'next'
// import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

// Initialize configuration system on server-side
import '@/lib/config/init'

// const inter = Inter({ subsets: ['latin'] })

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
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StreamVault',
    startupImage: [
      '/icons/apple-splash-2048-2732.jpg',
      '/icons/apple-splash-1668-2224.jpg',
      '/icons/apple-splash-1536-2048.jpg',
      '/icons/apple-splash-1125-2436.jpg',
      '/icons/apple-splash-1242-2208.jpg',
      '/icons/apple-splash-750-1334.jpg',
      '/icons/apple-splash-828-1792.jpg',
    ],
  },
  openGraph: {
    title: 'StreamVault - Professional Live Streaming Platform',
    description:
      'Modern, aesthetic live streaming platform with subscription-based monetization and enterprise-grade features.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    siteName: 'StreamVault',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: 'StreamVault Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreamVault - Professional Live Streaming Platform',
    description:
      'Modern, aesthetic live streaming platform with subscription-based monetization and enterprise-grade features.',
    creator: '@streamvault',
    images: ['/icons/icon-512x512.png'],
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
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      {
        url: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/safari-pinned-tab.svg',
        color: '#3b82f6',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="theme-color" content="#3b82f6" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="StreamVault" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="msapplication-TileColor" content="#3b82f6" />
          <meta name="msapplication-config" content="/browserconfig.xml" />
          <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
          <link
            rel="mask-icon"
            href="/icons/safari-pinned-tab.svg"
            color="#3b82f6"
          />
        </head>
        <body className="font-sans antialiased">
          <div id="root">{children}</div>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js')
                      .then(function(registration) {
                        console.log('SW registered: ', registration);
                      })
                      .catch(function(registrationError) {
                        console.log('SW registration failed: ', registrationError);
                      });
                  });
                }
              `,
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
