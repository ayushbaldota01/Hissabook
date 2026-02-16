import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'HisaabBook' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-800 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
