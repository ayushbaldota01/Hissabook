'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Party = { id: string; name: string; type: string; balance: number; lastTransactionDate: string }
type Stats = { toTake: number; toGive: number; net: number }

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function tagClass(t: string) {
  const m: Record<string, string> = { Supplier: 'tag-supplier', Customer: 'tag-customer', Partner: 'tag-partner' }
  return `tag ${m[t] || 'tag-other'}`
}

export default function Dashboard() {
  const [parties, setParties] = useState<Party[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'take' | 'give' | 'settled'>('all')
  const [archived, setArchived] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/parties?archived=${archived}`).then((r) => r.json()).then(setParties).finally(() => setLoading(false))
  }, [archived])
  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then((s) => setStats({ toTake: s.toTake, toGive: s.toGive, net: s.net }))
  }, [parties])

  let list = parties.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
  if (filter === 'take') list = list.filter((p) => p.balance > 0)
  if (filter === 'give') list = list.filter((p) => p.balance < 0)
  if (filter === 'settled') list = list.filter((p) => p.balance === 0)
  list.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-teal-800">HisaabBook</h1>
        <nav className="flex gap-4">
          <Link href="/stats" className="text-slate-600 hover:text-teal-600 font-medium">Stats</Link>
          <Link href="/settings" className="text-slate-600 hover:text-teal-600 font-medium">Settings</Link>
        </nav>
      </div>

      {stats && (
        <div className="card rounded-2xl p-5 sm:p-6 mb-6 grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-emerald-50">
            <div className="text-xs sm:text-sm text-emerald-600 font-semibold">To Take</div>
            <div className="font-bold text-emerald-700 text-lg sm:text-xl mt-1">{fmt(stats.toTake)}</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-red-50">
            <div className="text-xs sm:text-sm text-red-600 font-semibold">To Give</div>
            <div className="font-bold text-red-700 text-lg sm:text-xl mt-1">{fmt(stats.toGive)}</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-50">
            <div className="text-xs sm:text-sm text-slate-600 font-semibold">Net</div>
            <div className={`font-bold text-lg sm:text-xl mt-1 ${stats.net >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(stats.net)}</div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-5">
        <input type="text" placeholder="Search parties..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-0 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none" />
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white">
          <option value="all">All Parties</option>
          <option value="take">To Take</option>
          <option value="give">To Give</option>
          <option value="settled">Settled</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 cursor-pointer">
          <input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
          <span className="text-sm font-medium text-slate-600">Show archived</span>
        </label>
      </div>

      <AddPartyModal onAdd={() => fetch(`/api/parties?archived=${archived}`).then((r) => r.json()).then(setParties)} />

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.id} className="card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:shadow-lg transition-shadow">
              <div className="min-w-0">
                <div className="font-bold text-slate-800 truncate">{p.name}</div>
                <span className={`inline-block mt-1.5 ${tagClass(p.type)}`}>{p.type}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <span className={`font-semibold ${p.balance > 0 ? 'text-emerald-600' : p.balance < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                  {p.balance > 0 ? `To Take ${fmt(p.balance)}` : p.balance < 0 ? `To Give ${fmt(Math.abs(p.balance))}` : 'Settled'}
                </span>
                <Link href={`/party/${p.id}`} className="btn-primary px-4 py-2 rounded-xl text-sm text-center w-full sm:w-auto">View Ledger</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around py-3 px-4 sm:hidden z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link href="/" className="px-4 py-2 text-teal-600 font-semibold">Home</Link>
        <Link href="/stats" className="px-4 py-2 text-slate-600">Stats</Link>
        <Link href="/settings" className="px-4 py-2 text-slate-600">Settings</Link>
      </nav>
    </div>
  )
}

function AddPartyModal({ onAdd }: { onAdd: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('Supplier')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [ob, setOb] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/parties', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type, phone: phone || undefined, notes: notes || undefined, openingBalance: parseFloat(ob) || 0 }) })
    setOpen(false)
    setName(''); setPhone(''); setNotes(''); setOb('')
    onAdd()
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary w-full py-4 mb-5 rounded-2xl text-base">
        + Add Party
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => setOpen(false)}>
          <div className="card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Add Party</h2>
            <form onSubmit={submit} className="space-y-4">
              <input required placeholder="Party Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none" />
              <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none bg-white">
                <option>Supplier</option><option>Customer</option><option>Partner</option><option>Other</option>
              </select>
              <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none" />
              <input placeholder="Opening Balance (optional)" type="number" value={ob} onChange={(e) => setOb(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none" />
              <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none resize-none" rows={2} />
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 btn-primary py-3 rounded-xl">Save</button>
                <button type="button" onClick={() => setOpen(false)} className="flex-1 btn-secondary py-3 rounded-xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
