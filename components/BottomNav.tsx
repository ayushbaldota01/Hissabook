'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Billing', href: '/', match: /^\/billing|^\/$/ },
    { label: 'Ledger', href: '/ledger', match: /^\/ledger|^\/party/ },
    { label: 'Stats', href: '/stats', match: /^\/stats/ },
    { label: 'Settings', href: '/settings', match: /^\/settings/ },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around py-3 px-2 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-safe">
      {navItems.map((item) => {
        const isActive = item.match.test(pathname || '')
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`px-3 py-1 flex flex-col items-center gap-1 ${
              isActive ? 'text-teal-600 font-bold' : 'text-slate-500 font-medium'
            }`}
          >
            <span className="text-xs sm:text-sm">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
