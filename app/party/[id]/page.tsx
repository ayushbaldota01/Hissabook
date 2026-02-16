'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

type Party = { id: string; name: string; type: string; phone?: string; notes?: string; balance: number }
type Txn = { id?: string; transactionDate: string; type: string; amount: number; description?: string; running: number }

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function tagClass(t: string) {
  const m: Record<string, string> = { Supplier: 'tag-supplier', Customer: 'tag-customer', Partner: 'tag-partner' }
  return `tag ${m[t] || 'tag-other'}`
}

export default function PartyLedger() {
  const params = useParams()
  const id = params.id as string
  const [party, setParty] = useState<Party | null>(null)
  const [txns, setTxns] = useState<Txn[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const load = () => {
    fetch(`/api/parties/${id}`).then((r) => r.json()).then(setParty)
    fetch(`/api/parties/${id}/transactions`).then((r) => r.json()).then(setTxns)
  }
  useEffect(() => { load() }, [id])

  const archive = async () => {
    if (!confirm('Archive this party? It will be hidden from the dashboard.')) return
    await fetch(`/api/parties/${id}/archive`, { method: 'PATCH' })
    window.location.href = '/'
  }

  if (!party) return <div className="p-6 text-slate-600">Loading...</div>

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
      <Link href="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium mb-6">← Back to dashboard</Link>

      <div className="card rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{party.name}</h1>
            <span className={`inline-block mt-2 ${tagClass(party.type)}`}>{party.type}</span>
            {party.phone && <div className="text-slate-600 mt-2 font-medium">{party.phone}</div>}
            {party.notes && <p className="text-slate-500 text-sm mt-1 line-clamp-2">{party.notes}</p>}
          </div>
          <div className={`text-2xl sm:text-3xl font-bold shrink-0 px-4 py-3 rounded-xl ${party.balance > 0 ? 'bg-emerald-50 text-emerald-700' : party.balance < 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
            {party.balance > 0 ? `To Take ${fmt(party.balance)}` : party.balance < 0 ? `To Give ${fmt(Math.abs(party.balance))}` : 'Settled'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 mt-5 pt-5 border-t border-slate-100">
          <button onClick={() => setAddOpen(true)} className="btn-primary px-5 py-2.5 rounded-xl text-sm sm:text-base shrink-0">
            + Add Transaction
          </button>
          <a href={`/api/parties/${id}/export`} download className="btn-secondary px-4 py-2.5 rounded-xl text-sm shrink-0">
            Export Excel
          </a>
          <button onClick={() => setEditOpen(true)} className="btn-secondary px-4 py-2.5 rounded-xl text-sm shrink-0">
            Edit
          </button>
          <button onClick={archive} className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 shrink-0">
            Archive
          </button>
        </div>
      </div>

      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto -mx-px">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left p-4 font-semibold text-slate-700">Date</th>
                <th className="text-left p-4 font-semibold text-slate-700">Type</th>
                <th className="text-left p-4 font-semibold text-slate-700 hidden md:table-cell">Description</th>
                <th className="text-right p-4 font-semibold text-slate-700">Amount</th>
                <th className="text-right p-4 font-semibold text-slate-700">Balance</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t, i) => (
                <tr key={t.id || i} className={i % 2 ? 'bg-slate-50/50' : ''}>
                  <td className="p-4 text-slate-700">{fmtDate(t.transactionDate)}</td>
                  <td className={`p-4 font-medium ${t.type === 'GIVEN' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {t.type === 'OPENING' ? 'Opening' : t.type === 'GIVEN' ? 'Goods Given' : 'Payment'}
                  </td>
                  <td className="p-4 text-slate-600 hidden md:table-cell max-w-[140px] truncate">{t.description || '—'}</td>
                  <td className="p-4 text-right font-medium">{fmt(t.amount)}</td>
                  <td className={`p-4 text-right font-semibold ${t.running > 0 ? 'text-emerald-600' : t.running < 0 ? 'text-red-600' : 'text-slate-500'}`}>{fmt(t.running)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {txns.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <p className="font-medium">No transactions yet</p>
            <p className="text-sm mt-1">Click &quot;+ Add Transaction&quot; above to add your first entry</p>
          </div>
        )}
      </div>

      {addOpen && <AddTxnModal partyId={id} onClose={() => { setAddOpen(false); load() }} />}
      {editOpen && <EditPartyModal party={party} onClose={() => { setEditOpen(false); load() }} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around py-3 px-4 sm:hidden z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link href="/" className="px-4 py-2 text-slate-600 font-medium">Home</Link>
        <Link href="/stats" className="px-4 py-2 text-slate-600">Stats</Link>
        <Link href="/settings" className="px-4 py-2 text-slate-600">Settings</Link>
      </nav>
    </div>
  )
}

function EditPartyModal({ party, onClose }: { party: Party; onClose: () => void }) {
  const [name, setName] = useState(party.name)
  const [type, setType] = useState(party.type)
  const [phone, setPhone] = useState(party.phone || '')
  const [notes, setNotes] = useState(party.notes || '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/parties/${party.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, type, phone: phone || undefined, notes: notes || undefined }) })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Edit Party</h2>
        <form onSubmit={submit} className="space-y-4">
          <input required placeholder="Party Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none" />
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none">
            <option>Supplier</option><option>Customer</option><option>Partner</option><option>Other</option>
          </select>
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none" />
          <textarea placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none resize-none" rows={2} />
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 btn-primary py-3 rounded-xl">Save</button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3 rounded-xl">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddTxnModal({ partyId, onClose }: { partyId: string; onClose: () => void }) {
  const [type, setType] = useState<'GIVEN' | 'RECEIVED'>('GIVEN')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [desc, setDesc] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/parties/${partyId}/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount: parseFloat(amount), transactionDate: date, description: desc || undefined }) })
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800 mb-4">Add Transaction</h2>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('GIVEN')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${type === 'GIVEN' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Goods Given
            </button>
            <button type="button" onClick={() => setType('RECEIVED')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${type === 'RECEIVED' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              Payment
            </button>
          </div>
          <input required type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-lg" min="0" step="0.01" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none" />
          <input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none" />
          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary py-3 rounded-xl">Save</button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3 rounded-xl">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
