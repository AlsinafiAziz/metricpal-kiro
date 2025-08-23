import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MetricPal - AI-Native B2B Analytics',
  description: 'Conversational analytics platform that unifies website behavior, ad interactions, and CRM outcomes',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}