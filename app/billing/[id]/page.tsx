'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getBill, deleteBill, Bill, getBusinessProfile, updateBillPayment, saveReminder, getReminderByBillId, PaymentReminder, markReminderCompleted } from '@/lib/billingDatabase'
import { generateRetailBillPDF } from '@/lib/pdfGenerator'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function ViewBill() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [bill, setBill] = useState<Bill | null>(null)
  const [reminder, setReminder] = useState<PaymentReminder | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showWaModal, setShowWaModal] = useState(false)
  const [waNumber, setWaNumber] = useState('')
  const [sharing, setSharing] = useState(false)

  // Record Payment Modal
  const [showPayModal, setShowPayModal] = useState(false)
  const [payAmount, setPayAmount] = useState<number | ''>('')
  const [payProcessing, setPayProcessing] = useState(false)

  // Set Reminder Modal
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [newReminderDate, setNewReminderDate] = useState('')
  const [newReminderNote, setNewReminderNote] = useState('')

  const loadBill = async () => {
    try {
      const b = await getBill(id)
      setBill(b)
      if (b) {
        const r = await getReminderByBillId(b.id)
        setReminder(r)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBill() }, [id])

  const handleDownload = async () => {
    if (!bill) return
    setGenerating(true)
    try {
      const blob = generateRetailBillPDF(bill)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Bill_${bill.billNo}_${bill.customerName.replace(/\s+/g, '_')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error(err)
      alert("Failed to generate PDF")
    }
    setGenerating(false)
  }

  const handleWhatsAppShare = () => {
    if (!bill) return
    setWaNumber(bill.customerMobile || '')
    setShowWaModal(true)
  }

  const executeWaShare = async () => {
    if (!bill || !waNumber) return
    const profile = getBusinessProfile()
    
    setSharing(true)
    let pdfUrl = ''
    
    try {
      const blob = generateRetailBillPDF(bill)
      
      const formData = new FormData()
      formData.append('file', blob, `Bill_${bill.billNo}.pdf`)
      formData.append('billNo', bill.billNo)
      
      const response = await fetch('/api/upload-bill', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (!response.ok) {
        if (data.error && data.error.includes('private access')) {
           throw new Error("Your Vercel Blob Store is set to PRIVATE. Please delete it in the Vercel Dashboard and create a new one as PUBLIC.")
        }
        throw new Error(data.error || 'Failed to upload PDF to server')
      }

      pdfUrl = data.url
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to upload the bill PDF.")
      setSharing(false)
      return // Stop execution if upload fails
    }

    const dueText = bill.amountDue > 0 ? `\n*Balance Due:* ₹${bill.amountDue.toFixed(2)}` : ''
    const text = `Hello *${bill.customerName}*,\n\nYour bill from *${profile.shopName}* is ready.\n\n*Bill No:* ${bill.billNo}\n*Amount:* ₹${bill.total.toFixed(2)}\n*Vehicle:* ${bill.vehicleName ? `${bill.vehicleName} — ` : ''}${bill.regNo || 'N/A'}\n*Payment:* ${bill.paymentMode} | Paid: ₹${(bill.amountPaid || 0).toFixed(2)}${dueText}\n\nPlease click the link below to view/download your PDF bill:\n${pdfUrl}\n\nThank you!`.replace(/&/g, '%26')
    const cleanNum = waNumber.replace(/\D/g, '')
    const waUrl = `https://wa.me/91${cleanNum}?text=${encodeURIComponent(text)}`
      
    window.open(waUrl, '_blank')
    setShowWaModal(false)
    setSharing(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this bill? This cannot be undone.')) return
    try {
      await deleteBill(id)
      router.push('/')
    } catch (err) {
      console.error(err)
      alert("Failed to delete bill")
    }
  }

  const handleRecordPayment = async () => {
    if (!bill || !payAmount) return
    setPayProcessing(true)
    try {
      const newPaid = (bill.amountPaid || 0) + Number(payAmount)
      const updated = await updateBillPayment(bill.id, newPaid)
      if (updated) {
        setBill(updated)
      }
      setShowPayModal(false)
      setPayAmount('')
    } catch (err) {
      console.error(err)
      alert('Failed to record payment')
    } finally {
      setPayProcessing(false)
    }
  }

  const handleSetReminder = async () => {
    if (!bill || !newReminderDate) return
    try {
      const newReminder: PaymentReminder = {
        id: reminder?.id || crypto.randomUUID(),
        billId: bill.id,
        billNo: bill.billNo,
        customerName: bill.customerName,
        customerMobile: bill.customerMobile,
        vehicleName: bill.vehicleName,
        regNo: bill.regNo,
        totalAmount: bill.total,
        amountDue: bill.amountDue,
        reminderDate: newReminderDate,
        note: newReminderNote || undefined,
        isCompleted: false,
        createdAt: reminder?.createdAt || new Date().toISOString()
      }
      await saveReminder(newReminder)
      setReminder(newReminder)
      setShowReminderModal(false)
      setNewReminderDate('')
      setNewReminderNote('')
    } catch (err) {
      console.error(err)
      alert('Failed to set reminder')
    }
  }

  const handleCompleteReminder = async () => {
    if (!reminder) return
    try {
      await markReminderCompleted(reminder.id)
      setReminder(null)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="p-12 text-center text-slate-500">Loading bill...</div>
  if (!bill) return <div className="p-12 text-center text-slate-500">Bill not found</div>

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <Link href="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium mb-6 text-sm">← Back to bills</Link>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">Bill #{bill.billNo}</h1>
            {/* Payment Status Badge */}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              bill.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
              bill.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {bill.paymentStatus || 'Paid'}
            </span>
            {/* Payment Mode Badge */}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              bill.paymentMode === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-600'
            }`}>
              {bill.paymentMode === 'Online' ? '📱 Online' : '💵 Cash'}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">{new Date(bill.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button onClick={handleDownload} disabled={generating} className="flex-1 sm:flex-none btn-secondary px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-200 shadow-sm flex justify-center items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
          <button onClick={handleWhatsAppShare} className="flex-1 sm:flex-none btn-primary px-4 py-2.5 rounded-xl font-bold text-sm bg-[#25D366] hover:bg-[#1DA851] text-white shadow-sm flex justify-center items-center gap-2">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            Share Bill
          </button>
        </div>
      </div>

      {/* Customer & Vehicle Details */}
      <div className="card rounded-2xl p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Billed To</h3>
            <div className="font-bold text-slate-800 text-lg">{bill.customerName}</div>
            {bill.customerAddress && <div className="text-sm text-slate-600 mt-1">{bill.customerAddress}</div>}
            {bill.customerMobile && <div className="text-sm text-slate-600 mt-1">📞 {bill.customerMobile}</div>}
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle Details</h3>
            {bill.vehicleName && <div className="text-sm text-slate-700 font-medium">🚗 <span className="font-bold">{bill.vehicleName}</span></div>}
            {bill.regNo && <div className="text-sm text-slate-700 font-medium mt-1">Reg No: <span className="font-bold uppercase">{bill.regNo}</span></div>}
            {bill.km && <div className="text-sm text-slate-700 font-medium mt-1">KM: <span className="font-bold">{bill.km}</span></div>}
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 font-semibold text-slate-500 w-12">#</th>
                  <th className="text-left py-3 font-semibold text-slate-500">Item Description</th>
                  <th className="text-right py-3 font-semibold text-slate-500 w-24">Qty</th>
                  <th className="text-right py-3 font-semibold text-slate-500 w-24">Rate</th>
                  <th className="text-right py-3 font-semibold text-slate-500 w-28">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bill.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="py-3 text-slate-400">{idx + 1}</td>
                    <td className="py-3">
                      <div className="font-medium text-slate-800">{item.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{item.section}</div>
                    </td>
                    <td className="py-3 text-right text-slate-600">{item.section === 'PARTS' ? (item.qty ? `${item.qty}${item.unit ? ` ${item.unit}` : ''}` : '-') : '-'}</td>
                    <td className="py-3 text-right text-slate-600">{item.section === 'PARTS' ? (typeof item.rate === 'number' ? item.rate.toFixed(2) : (item.rate || '-')) : '-'}</td>
                    <td className="py-3 text-right font-medium text-slate-800">{typeof item.amount === 'number' ? item.amount.toFixed(2) : (item.amount || '-')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Payment Summary */}
        <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-end gap-6 sm:gap-12">
          <div className="space-y-2 text-sm w-full sm:w-72">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹ {(bill.total + bill.discount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Discount</span>
              <span>- ₹ {bill.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-slate-200">
              <span>Total</span>
              <span className="text-teal-700">₹ {bill.total.toFixed(2)}</span>
            </div>
            {/* Payment Breakdown */}
            <div className="border-t border-dashed border-slate-200 pt-3 mt-3 space-y-2">
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>✅ Paid ({bill.paymentMode || 'Cash'})</span>
                <span>₹ {(bill.amountPaid || 0).toFixed(2)}</span>
              </div>
              {bill.amountDue > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>⚠️ Balance Due</span>
                  <span>₹ {bill.amountDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons for Partial Payments */}
      {bill.amountDue > 0 && (
        <div className="card rounded-2xl p-5 mb-6 bg-amber-50/50 border border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-bold text-amber-800">Balance Due: ₹ {bill.amountDue.toFixed(2)}</h3>
              <p className="text-sm text-amber-600 mt-1">Record a payment or set a collection reminder</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowPayModal(true); setPayAmount(''); }}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-sm"
              >
                💰 Record Payment
              </button>
              <button
                onClick={() => {
                  setShowReminderModal(true)
                  setNewReminderDate(reminder?.reminderDate || '')
                  setNewReminderNote(reminder?.note || '')
                }}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white text-amber-700 border border-amber-300 hover:bg-amber-100 transition-colors"
              >
                🔔 {reminder ? 'Edit Reminder' : 'Set Reminder'}
              </button>
            </div>
          </div>

          {/* Show existing reminder */}
          {reminder && (
            <div className={`mt-4 p-3 rounded-xl flex items-center justify-between ${
              reminder.reminderDate < today ? 'bg-red-100 border border-red-200' :
              reminder.reminderDate === today ? 'bg-amber-100 border border-amber-200' :
              'bg-blue-50 border border-blue-100'
            }`}>
              <div>
                <div className="text-xs font-bold text-slate-600">
                  {reminder.reminderDate < today ? '🔴 OVERDUE' : reminder.reminderDate === today ? '🟡 TODAY' : '📅 UPCOMING'} — {new Date(reminder.reminderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {reminder.note && <div className="text-xs text-slate-500 mt-1">📝 {reminder.note}</div>}
              </div>
              <button
                onClick={handleCompleteReminder}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
              >
                ✅ Done
              </button>
            </div>
          )}
        </div>
      )}

      <div className="text-center mt-12">
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 font-medium text-sm">
          Delete Bill
        </button>
      </div>

      {/* ─── WhatsApp Share Modal ─── */}
      {showWaModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowWaModal(false)}>
          <div className="card rounded-2xl p-6 w-full max-w-md shadow-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-8 h-8 text-[#25D366] fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              <h2 className="text-lg font-bold text-slate-800">Share to WhatsApp</h2>
            </div>
            <p className="text-slate-600 mb-4 text-sm leading-relaxed">
              Enter the WhatsApp number to share directly. 
              <br/><br/>
              <span className="bg-teal-50 text-teal-800 px-2 py-1 rounded border border-teal-100 font-medium text-xs inline-block mt-1">
                Tip: We will securely upload the PDF and send a direct download link!
              </span>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">WhatsApp Number (India)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">+91</span>
                  <input
                    type="tel"
                    value={waNumber}
                    onChange={(e) => setWaNumber(e.target.value)}
                    placeholder="E.g. 9876543210"
                    disabled={sharing}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 outline-none font-semibold text-slate-800 disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={executeWaShare}
                  disabled={!waNumber || sharing}
                  className="flex-1 py-3 rounded-xl font-bold bg-[#25D366] text-white hover:bg-[#1DA851] disabled:opacity-50 transition-colors shadow-sm shadow-[#25D366]/20 flex justify-center items-center gap-2"
                >
                  {sharing && <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                  {sharing ? 'Uploading...' : 'Open Chat'}
                </button>
                <button onClick={() => !sharing && setShowWaModal(false)} disabled={sharing} className="flex-1 btn-secondary py-3 rounded-xl font-bold disabled:opacity-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Record Payment Modal ─── */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => !payProcessing && setShowPayModal(false)}>
          <div className="card rounded-2xl p-6 w-full max-w-md shadow-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">💰 Record Payment</h2>
            <p className="text-sm text-slate-500 mb-4">
              {bill.customerName} • {bill.vehicleName || bill.regNo || `Bill #${bill.billNo}`}
            </p>
            
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Bill Total</span>
                <span className="font-semibold text-slate-700">{fmt(bill.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Already Paid</span>
                <span className="font-semibold text-emerald-600">{fmt(bill.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                <span className="text-slate-500 font-bold">Current Due</span>
                <span className="font-bold text-red-600">{fmt(bill.amountDue)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={bill.amountDue}
                  value={payAmount}
                  placeholder="Enter amount"
                  onChange={e => setPayAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-right font-bold text-lg"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setPayAmount(bill.amountDue)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors whitespace-nowrap"
                >
                  Full Due
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRecordPayment}
                disabled={!payAmount || payProcessing || Number(payAmount) <= 0}
                className="flex-1 py-3 rounded-xl font-bold bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {payProcessing ? 'Recording...' : 'Record Payment'}
              </button>
              <button
                onClick={() => !payProcessing && setShowPayModal(false)}
                disabled={payProcessing}
                className="flex-1 btn-secondary py-3 rounded-xl font-bold disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Set Reminder Modal ─── */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => setShowReminderModal(false)}>
          <div className="card rounded-2xl p-6 w-full max-w-md shadow-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">🔔 Set Payment Reminder</h2>
            <p className="text-sm text-slate-500 mb-4">
              {bill.customerName} • Due: ₹{bill.amountDue.toFixed(0)}
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Reminder Date</label>
                <input
                  type="date"
                  value={newReminderDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={e => setNewReminderDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Note (optional)</label>
                <input
                  placeholder="E.g. Call before visiting"
                  value={newReminderNote}
                  onChange={e => setNewReminderNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSetReminder}
                disabled={!newReminderDate}
                className="flex-1 py-3 rounded-xl font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors shadow-sm"
              >
                Save Reminder
              </button>
              <button
                onClick={() => setShowReminderModal(false)}
                className="flex-1 btn-secondary py-3 rounded-xl font-bold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
