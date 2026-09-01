import type { Metadata } from 'next'
import './globals.css'
import BottomNav from '@/components/BottomNav'

export const metadata: Metadata = { title: 'HisaabBook - Retail & Ledger' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-800 min-h-screen antialiased bg-slate-50">
        <main className="pb-16">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  )
}
