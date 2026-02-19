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
  const [editingTxn, setEditingTxn] = useState<Txn | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const load = () => {
    fetch(`/api/parties/${id}`).then((r) => r.json()).then(setParty)
    fetch(`/api/parties/${id}/transactions`).then((r) => r.json()).then(setTxns)
  }
  useEffect(() => { load() }, [id])

  const exportPDF = async () => {
    if (!party) return
    const { default: jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = 210

    // ── HEADER ─────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.setTextColor(20, 83, 45)
    doc.text('Arihant Auto', pageW / 2, 20, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(
      'Old Pune Solapur Highway opposite to Gajanan Petroleum, Indapur, 413106, Pune-Maharashtra',
      pageW / 2, 27, { align: 'center' }
    )
    doc.text('Phone: 9822656143 | 9130440909', pageW / 2, 32, { align: 'center' })

    // ── DIVIDER ─────────────────────────────────────────────────
    doc.setDrawColor(20, 83, 45)
    doc.setLineWidth(0.6)
    doc.line(14, 36, pageW - 14, 36)

    // ── PARTY INFO ──────────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.text(`Statement for: ${party.name.toUpperCase()}`, 14, 44)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(`Date of Issue: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 50)
    if (party.phone) doc.text(`Contact: ${party.phone}`, 14, 55)

    // ── SUMMARY BOXES ────────────────────────────────────────────
    const totalDebit = txns.reduce((s, t) => t.type === 'GIVEN' ? s + t.amount : s, 0)
    const totalCredit = txns.reduce((s, t) => t.type === 'RECEIVED' ? s + t.amount : s, 0)
    const netBal = party.balance

    const summaryY = 60
    const boxH = 18
    const col = (pageW - 28) / 3
    const boxes = [
      { label: `Total ${getTxnLabel('GIVEN', party.type)}`, value: fmt(totalDebit), color: [239, 246, 255] as [number, number, number], textColor: [30, 64, 175] as [number, number, number] },
      { label: `Total ${getTxnLabel('RECEIVED', party.type)}`, value: fmt(totalCredit), color: [240, 253, 244] as [number, number, number], textColor: [21, 128, 61] as [number, number, number] },
      {
        label: 'Net Balance',
        value: `${fmt(Math.abs(netBal))} ${netBal >= 0 ? 'Dr' : 'Cr'}`,
        color: netBal >= 0 ? [254, 242, 242] as [number, number, number] : [240, 253, 244] as [number, number, number],
        textColor: netBal >= 0 ? [185, 28, 28] as [number, number, number] : [21, 128, 61] as [number, number, number]
      },
    ]
    boxes.forEach((box, i) => {
      const x = 14 + i * (col + 2)
      doc.setFillColor(...box.color)
      doc.roundedRect(x, summaryY, col, boxH, 2, 2, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text(box.label, x + col / 2, summaryY + 5.5, { align: 'center' })
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...box.textColor)
      doc.text(box.value, x + col / 2, summaryY + 13, { align: 'center' })
    })

    // ── TABLE ────────────────────────────────────────────────────
    // Store running balance values for color lookup by row index
    const runningValues: number[] = []

    const tableBody: string[][] = txns.map(t => {
      runningValues.push(t.running)
      return [
        fmtDate(t.transactionDate),
        t.type === 'OPENING' ? 'Opening Balance' : getTxnLabel(t.type as 'GIVEN' | 'RECEIVED', party.type),
        t.description || '-',
        t.type === 'GIVEN' ? fmt(t.amount) : '',
        t.type === 'RECEIVED' ? fmt(t.amount) : '',
        `${fmt(Math.abs(t.running))} ${t.running >= 0 ? 'Dr' : 'Cr'}`,
      ]
    })

    autoTable(doc, {
      startY: summaryY + boxH + 6,
      head: [['Date', 'Type', 'Description', 'Debit (Dr)', 'Credit (Cr)', 'Balance']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [20, 83, 45],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        cellPadding: 4,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3.5,
        textColor: [51, 65, 85],
        lineColor: [226, 232, 240],
        lineWidth: 0.3,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24, halign: 'left' },
        1: { cellWidth: 32, halign: 'left' },
        2: { halign: 'left' },   // auto width for description
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 26, halign: 'right' },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        // Color Balance column (index 5) per row's running value
        if (data.section === 'body' && data.column.index === 5) {
          const running = runningValues[data.row.index]
          if (running > 0) {
            data.cell.styles.textColor = [185, 28, 28]   // Red – Debit
          } else if (running < 0) {
            data.cell.styles.textColor = [21, 128, 61]   // Green – Credit
          } else {
            data.cell.styles.textColor = [100, 116, 139] // Grey – Settled
          }
        }
      },
    })

    // ── FOOTER ───────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 8
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generated on ${new Date().toLocaleString('en-IN')} · Arihant Auto, Indapur`, pageW / 2, finalY, { align: 'center' })

    doc.save(`${party.name.replace(/\s+/g, '_')}_Statement.pdf`)
  }

  if (!party) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-500">
        <svg className="w-8 h-8 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        <span>Loading...</span>
      </div>
    </div>
  )

  const totalDebit = txns.reduce((acc, t) => t.type === 'GIVEN' ? acc + t.amount : acc, 0)
  const totalCredit = txns.reduce((acc, t) => t.type === 'RECEIVED' ? acc + t.amount : acc, 0)

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32">
      <Link href="/" className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-900 font-medium mb-5 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        Back to dashboard
      </Link>

      {/* Party Card */}
      <div className="card rounded-2xl p-5 sm:p-6 mb-4">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{party.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`${tagClass(party.type)}`}>{party.type}</span>
              {party.phone && <span className="text-slate-500 text-sm font-medium">📞 {party.phone}</span>}
            </div>
            {party.notes && <p className="text-slate-500 text-sm mt-2 line-clamp-2">{party.notes}</p>}
          </div>
          <div className={`text-xl sm:text-2xl font-bold shrink-0 px-5 py-3 rounded-xl ${party.balance > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : party.balance < 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-slate-100 text-slate-600'}`}>
            {party.balance > 0 ? `To Take ${fmt(party.balance)}` : party.balance < 0 ? `To Give ${fmt(Math.abs(party.balance))}` : 'Settled ✓'}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 mt-5 pt-4 border-t border-slate-100">
          <button onClick={() => setAddOpen(true)} className="btn-primary px-5 py-2.5 rounded-xl text-sm sm:text-base shrink-0">
            + Add Transaction
          </button>
          <button onClick={exportPDF} className="btn-secondary px-4 py-2.5 rounded-xl text-sm shrink-0 inline-flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export PDF
          </button>
          <button onClick={() => setEditOpen(true)} className="btn-secondary px-4 py-2.5 rounded-xl text-sm shrink-0">
            Edit Party
          </button>
          <button onClick={() => setDeleteOpen(true)} className="px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 shrink-0">
            Delete Party
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="card rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">Total {getTxnLabel('GIVEN', party.type)}</p>
          <p className="text-xl font-bold text-slate-800">{fmt(totalDebit)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Debit (Dr)</p>
        </div>
        <div className="card rounded-xl p-4">
          <p className="text-xs text-slate-500 font-medium mb-1">Total {getTxnLabel('RECEIVED', party.type)}</p>
          <p className="text-xl font-bold text-slate-800">{fmt(totalCredit)}</p>
          <p className="text-xs text-slate-400 mt-0.5">Credit (Cr)</p>
        </div>
        <div className="card rounded-xl p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-slate-500 font-medium mb-1">Net Balance</p>
          <p className={`text-xl font-bold ${party.balance > 0 ? 'text-emerald-600' : party.balance < 0 ? 'text-red-600' : 'text-slate-500'}`}>
            {fmt(Math.abs(party.balance))}
          </p>
          <p className={`text-xs mt-0.5 font-medium ${party.balance > 0 ? 'text-emerald-500' : party.balance < 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {party.balance > 0 ? 'Dr — To Take' : party.balance < 0 ? 'Cr — To Give' : 'Settled'}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="bg-[#14532d] text-white">
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Description</th>
                <th className="text-right px-4 py-3 font-semibold text-red-200">Debit (Dr)</th>
                <th className="text-right px-4 py-3 font-semibold text-green-200">Credit (Cr)</th>
                <th className="text-right px-4 py-3 font-semibold">Balance</th>
                <th className="px-3 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txns.map((t, i) => (
                <tr key={t.id || i} className={`hover:bg-slate-50/80 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(t.transactionDate)}</td>
                  <td className={`px-4 py-3 font-medium whitespace-nowrap ${t.type === 'GIVEN' ? 'text-emerald-700' : t.type === 'OPENING' ? 'text-slate-500' : 'text-blue-600'}`}>
                    {t.type === 'OPENING' ? 'Opening' : getTxnLabel(t.type as any, party.type)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell max-w-[180px] truncate">
                    {t.description || <span className="text-slate-300">—</span>}
                    {/* @ts-ignore */}
                    {t.isEdited && <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 font-medium">edited</span>}
                  </td>
                  {/* Debit Column */}
                  <td className="px-4 py-3 text-right font-medium">
                    {t.type === 'GIVEN' ? (
                      <span className="text-slate-800">{fmt(t.amount)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {/* Credit Column */}
                  <td className="px-4 py-3 text-right font-medium">
                    {t.type !== 'GIVEN' && t.type !== 'OPENING' ? (
                      <span className="text-slate-800">{fmt(t.amount)}</span>
                    ) : t.type === 'OPENING' ? (
                      <span className="text-slate-800">{fmt(t.amount)}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {/* Balance */}
                  <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${t.running > 0 ? 'text-red-600' : t.running < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {fmt(Math.abs(t.running))}
                    <span className={`ml-1 text-[10px] font-semibold px-1 py-0.5 rounded ${t.running > 0 ? 'bg-red-50 text-red-500' : t.running < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      {t.running > 0 ? 'Dr' : t.running < 0 ? 'Cr' : ''}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {t.type !== 'OPENING' && (
                      <button onClick={() => setEditingTxn(t)} className="text-slate-300 hover:text-teal-600 p-1 rounded-lg hover:bg-teal-50 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {txns.length === 0 && (
          <div className="p-16 text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <p className="font-medium text-slate-500">No transactions yet</p>
            <p className="text-sm mt-1">Click &quot;+ Add Transaction&quot; above to add your first entry</p>
          </div>
        )}
      </div>

      {addOpen && <AddTxnModal partyId={id} partyType={party.type} onClose={() => { setAddOpen(false); load() }} />}
      {editOpen && <EditPartyModal party={party} onClose={() => { setEditOpen(false); load() }} />}
      {deleteOpen && <DeletePartyModal party={party} onClose={() => { setDeleteOpen(false) }} />}
      {editingTxn && <EditTxnModal txn={editingTxn} partyType={party.type} onClose={() => { setEditingTxn(null); load() }} />}

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200 flex justify-around py-3 px-4 sm:hidden z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <Link href="/" className="px-4 py-2 text-slate-600 font-medium">Home</Link>
        <Link href="/stats" className="px-4 py-2 text-slate-600">Stats</Link>
        <Link href="/settings" className="px-4 py-2 text-slate-600">Settings</Link>
      </nav>
    </div>
  )
}


// Helper for labels
function getTxnLabel(txnType: 'GIVEN' | 'RECEIVED', partyType: string) {
  if (partyType === 'Supplier') {
    return txnType === 'GIVEN' ? 'Payment Given' : 'Goods Taken'
  }
  // Default / Customer
  return txnType === 'GIVEN' ? 'Goods Given' : 'Payment Received'
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

function DeletePartyModal({ party, onClose }: { party: Party; onClose: () => void }) {
  const [confirmName, setConfirmName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (confirmName !== party.name) return
    if (!confirm('This action cannot be undone. Are you sure?')) return
    setLoading(true)
    await fetch(`/api/parties/${party.id}`, { method: 'DELETE' })
    window.location.href = '/'
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="card rounded-2xl p-6 w-full max-w-md shadow-xl bg-white" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-slate-800 mb-2">Delete Party</h2>
        <p className="text-slate-600 mb-4 text-sm">
          To confirm deletion, please type the party name <strong>{party.name}</strong> below.
          This will delete the party and all associated transactions permanently.
        </p>
        <div className="space-y-4">
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder="Type party name to confirm"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleDelete}
              disabled={confirmName !== party.name || loading}
              className="flex-1 py-3 rounded-xl font-medium bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete Permanently'}
            </button>
            <button onClick={onClose} className="flex-1 btn-secondary py-3 rounded-xl">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddTxnModal({ partyId, partyType, onClose }: { partyId: string; partyType: string; onClose: () => void }) {
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
              {getTxnLabel('GIVEN', partyType)}
            </button>
            <button type="button" onClick={() => setType('RECEIVED')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${type === 'RECEIVED' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {getTxnLabel('RECEIVED', partyType)}
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

function EditTxnModal({ txn, partyType, onClose }: { txn: Txn; partyType: string; onClose: () => void }) {
  const [type, setType] = useState(txn.type)
  const [amount, setAmount] = useState(txn.amount.toString())
  const [date, setDate] = useState(new Date(txn.transactionDate).toISOString().slice(0, 10))
  const [desc, setDesc] = useState(txn.description || '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/transactions/${txn.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount: parseFloat(amount), transactionDate: date, description: desc || undefined }) })
    onClose()
  }

  const del = async () => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    await fetch(`/api/transactions/${txn.id}`, { method: 'DELETE' })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div className="card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800">Edit Transaction</h2>
          <button onClick={del} className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 bg-red-50 px-3 py-1.5 rounded-lg">Delete</button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setType('GIVEN')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${type === 'GIVEN' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {getTxnLabel('GIVEN', partyType)}
            </button>
            <button type="button" onClick={() => setType('RECEIVED')} className={`flex-1 py-3 rounded-xl font-medium transition-all ${type === 'RECEIVED' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {getTxnLabel('RECEIVED', partyType)}
            </button>
          </div>
          <input required type="number" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none text-lg" min="0" step="0.01" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none" />
          <input placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none" />
          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary py-3 rounded-xl">Save Changes</button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3 rounded-xl">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
