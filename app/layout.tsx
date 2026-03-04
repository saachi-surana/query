import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Queue — Smarter Q&A for live events',
  description: 'A smart live Q&A platform with AI-powered clustering',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-white text-gray-900 min-h-screen">
        {children}
      </body>
    </html>
  )
}
