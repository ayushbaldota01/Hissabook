'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Stats = { toTake: number; toGive: number; moneyIn: number; moneyOut: number; totalTxns: number; topTake: { name: string; balance: number }[]; topGive: { name: string; balance: number }[] }

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function Stats() {
  const [s, setS] = useState<Stats | null>(null)
  useEffect(() => { fetch('/api/stats').then((r) => r.json()).then(setS) }, [])

  if (!s) return <div className="p-6 text-slate-600">Loading...</div>

  const maxBar = Math.max(s.moneyIn, s.moneyOut, 1)
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
      <Link href="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium mb-6">← Back to dashboard</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Quick Stats</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="card rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-emerald-50 to-white">
          <div className="text-sm text-emerald-600 font-semibold">Money In (This Month)</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{fmt(s.moneyIn)}</div>
        </div>
        <div className="card rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-red-50 to-white">
          <div className="text-sm text-red-600 font-semibold">Money Out (This Month)</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{fmt(s.moneyOut)}</div>
        </div>
      </div>

      <div className="card rounded-2xl p-5 mb-6">
        <div className="text-sm text-slate-600 font-semibold mb-3">Monthly In vs Out</div>
        <div className="flex gap-3 h-10 items-end">
          <div className="flex-1 bg-emerald-500 rounded-lg transition-all" style={{ height: `${(s.moneyIn / maxBar) * 100}%`, minHeight: s.moneyIn ? 12 : 4 }} title={fmt(s.moneyIn)} />
          <div className="flex-1 bg-red-500 rounded-lg transition-all" style={{ height: `${(s.moneyOut / maxBar) * 100}%`, minHeight: s.moneyOut ? 12 : 4 }} title={fmt(s.moneyOut)} />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium"><span>In</span><span>Out</span></div>
      </div>

      <div className="text-sm text-slate-600 font-medium mb-4">Transactions this month: <span className="font-bold text-slate-800">{s.totalTxns}</span></div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card rounded-2xl p-5 border-l-4 border-emerald-500">
          <h2 className="font-bold text-emerald-700 mb-3">Top 5 — To Take</h2>
          {s.topTake.length ? s.topTake.map((p, i) => <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0"><span className="truncate pr-2 font-medium text-slate-700">{p.name}</span><span className="font-bold text-emerald-600 shrink-0">{fmt(p.balance)}</span></div>) : <div className="text-slate-500 py-4">None</div>}
        </div>
        <div className="card rounded-2xl p-5 border-l-4 border-red-500">
          <h2 className="font-bold text-red-700 mb-3">Top 5 — To Give</h2>
          {s.topGive.length ? s.topGive.map((p, i) => <div key={i} className="flex justify-between py-2 border-b border-slate-100 last:border-0"><span className="truncate pr-2 font-medium text-slate-700">{p.name}</span><span className="font-bold text-red-600 shrink-0">{fmt(Math.abs(p.balance))}</span></div>) : <div className="text-slate-500 py-4">None</div>}
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around py-3 px-4 sm:hidden z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link href="/" className="px-4 py-2 text-slate-600">Home</Link>
        <Link href="/stats" className="px-4 py-2 text-teal-600 font-semibold">Stats</Link>
        <Link href="/settings" className="px-4 py-2 text-slate-600">Settings</Link>
      </nav>
    </div>
  )
}
