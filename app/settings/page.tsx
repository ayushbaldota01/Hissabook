'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Settings() {
  const [exporting, setExporting] = useState(false)

  const exportData = async () => {
    setExporting(true)
    const data = await fetch('/api/export').then((r) => r.json())
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `hisaabbook-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setExporting(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
      <Link href="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium mb-6">← Back to dashboard</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Settings</h1>

      <div className="card rounded-2xl p-6 space-y-6">
        <div>
          <div className="text-sm text-slate-500 font-semibold">Currency</div>
          <div className="font-bold text-slate-800 text-lg mt-1">₹ INR</div>
        </div>
        <div>
          <button onClick={exportData} disabled={exporting} className="btn-primary px-5 py-3 rounded-xl font-medium disabled:opacity-60">
            {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
          </button>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around py-3 px-4 sm:hidden z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link href="/" className="px-4 py-2 text-slate-600">Home</Link>
        <Link href="/stats" className="px-4 py-2 text-slate-600">Stats</Link>
        <Link href="/settings" className="px-4 py-2 text-teal-600 font-semibold">Settings</Link>
      </nav>
    </div>
  )
}
