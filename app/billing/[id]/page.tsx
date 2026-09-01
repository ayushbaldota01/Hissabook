'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getBill, deleteBill, Bill, getBusinessProfile } from '@/lib/billingDatabase'
import { generateRetailBillPDF } from '@/lib/pdfGenerator'

export default function ViewBill() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const [bill, setBill] = useState<Bill | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    getBill(id).then(b => {
      setBill(b)
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [id])

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

  const handleWhatsAppShare = async () => {
    if (!bill) return
    const profile = getBusinessProfile()
    
    // First try Web Share API if device supports sharing files
    try {
      const blob = generateRetailBillPDF(bill)
      const file = new File([blob], `Bill_${bill.billNo}.pdf`, { type: 'application/pdf' })
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Bill ${bill.billNo} from ${profile.shopName}`,
          text: `Hello ${bill.customerName},\n\nPlease find attached your bill for ₹${bill.total.toFixed(2)}.\n\nThank you for choosing ${profile.shopName}!`,
          files: [file]
        })
        return
      }
    } catch (err) {
      console.log('Web Share API failed or cancelled', err)
      // Fall back to whatsapp:// URI scheme
    }

    // Fallback: WhatsApp URI Scheme (Text only, since PDF attachment isn't supported via URI)
    const text = `Hello *${bill.customerName}*,\n\nYour bill from *${profile.shopName}* is ready.\n\n*Bill No:* ${bill.billNo}\n*Amount:* ₹${bill.total.toFixed(2)}\n*Vehicle:* ${bill.regNo || 'N/A'}\n\nPlease contact us for the PDF copy if needed.\n\nThank you!`.replace(/&/g, '%26')
    
    // If we have their mobile, open direct chat, else open generic share
    const waUrl = bill.customerMobile 
      ? `https://wa.me/91${bill.customerMobile}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
      
    window.open(waUrl, '_blank')
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

  if (loading) return <div className="p-12 text-center text-slate-500">Loading bill...</div>
  if (!bill) return <div className="p-12 text-center text-slate-500">Bill not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <Link href="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium mb-6 text-sm">← Back to bills</Link>
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bill #{bill.billNo}</h1>
          <p className="text-slate-500 text-sm">{new Date(bill.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
            {bill.regNo && <div className="text-sm text-slate-700 font-medium">Reg No: <span className="font-bold">{bill.regNo.toUpperCase()}</span></div>}
            {bill.km && <div className="text-sm text-slate-700 font-medium mt-1">KM: <span className="font-bold">{bill.km}</span></div>}
          </div>
        </div>

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
                    <td className="py-3 text-right text-slate-600">{item.section === 'PARTS' ? item.qty : '-'}</td>
                    <td className="py-3 text-right text-slate-600">{item.section === 'PARTS' ? item.rate.toFixed(2) : '-'}</td>
                    <td className="py-3 text-right font-medium text-slate-800">{item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-end gap-6 sm:gap-12">
          <div className="space-y-2 text-sm w-full sm:w-64">
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
          </div>
        </div>
      </div>

      <div className="text-center mt-12">
        <button onClick={handleDelete} className="text-red-500 hover:text-red-700 font-medium text-sm">
          Delete Bill
        </button>
      </div>

    </div>
  )
}
