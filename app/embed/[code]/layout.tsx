import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Query — Embedded Q&A',
  description: 'Embedded Q&A session',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="w-full h-screen overflow-hidden">
      {children}
    </div>
  )
}
