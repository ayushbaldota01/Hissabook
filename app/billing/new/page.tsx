'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { saveBill, BillItem, Bill } from '@/lib/billingDatabase'

export default function NewBill() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  // Bill Header Info
  const [billNo, setBillNo] = useState(Date.now().toString().slice(-6))
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [customerName, setCustomerName] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerMobile, setCustomerMobile] = useState('')
  const [regNo, setRegNo] = useState('')
  const [km, setKm] = useState('')
  
  // Items
  const [items, setItems] = useState<BillItem[]>([
    { id: crypto.randomUUID(), section: 'PARTS', description: '', qty: 1, rate: 0, amount: 0 }
  ])
  const [discount, setDiscount] = useState(0)

  const handleItemChange = (id: string, field: keyof BillItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'qty' || field === 'rate') {
          updated.amount = updated.qty * updated.rate
        }
        return updated
      }
      return item
    }))
  }

  const addItem = (section: 'PARTS' | 'LABOUR') => {
    setItems(prev => [...prev, { id: crypto.randomUUID(), section, description: '', qty: 1, rate: 0, amount: 0 }])
  }

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }

  // Calculate Totals
  const partsItems = items.filter(i => i.section === 'PARTS')
  const labourItems = items.filter(i => i.section === 'LABOUR')
  const partsTotal = partsItems.reduce((acc, item) => acc + item.amount, 0)
  const labourTotal = labourItems.reduce((acc, item) => acc + item.amount, 0)
  const subTotal = partsTotal + labourTotal
  const finalTotal = subTotal - discount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName) return alert('Customer name is required')
    
    // Filter out completely empty items
    const validItems = items.filter(i => i.description.trim() !== '' || i.amount > 0)
    
    setSaving(true)
    const newBill: Bill = {
      id: crypto.randomUUID(),
      billNo,
      date,
      customerName,
      customerAddress,
      customerMobile,
      regNo,
      km,
      items: validItems,
      discount,
      total: finalTotal,
      createdAt: new Date().toISOString()
    }
    
    try {
      await saveBill(newBill)
      router.push(`/billing/${newBill.id}`)
    } catch (err) {
      console.error(err)
      alert("Failed to save bill")
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <Link href="/" className="inline-flex items-center gap-2 text-teal-700 hover:text-teal-900 font-medium mb-4 text-sm">← Back to bills</Link>
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Create New Bill</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Bill Details */}
        <div className="card rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">Bill & Customer Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Bill No.</label>
              <input required value={billNo} onChange={e => setBillNo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none font-semibold text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Customer Name *</label>
              <input required placeholder="E.g. MR. VISHAL CHAJED" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Mobile No.</label>
              <input placeholder="Phone number" value={customerMobile} onChange={e => setCustomerMobile(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Reg. No. (Vehicle)</label>
              <input placeholder="E.g. MH.17.AJ.5110" value={regNo} onChange={e => setRegNo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none uppercase text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">K/M (Kilometers)</label>
              <input placeholder="Mileage" value={km} onChange={e => setKm(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Address / A.P</label>
            <input placeholder="Address" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
          </div>
        </div>

        {/* PARTS SECTION */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="bg-slate-100 px-5 py-3 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">PARTS</h2>
            <button type="button" onClick={() => addItem('PARTS')} className="text-xs font-bold bg-white text-teal-600 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50">
              + Add Part
            </button>
          </div>
          <div className="p-0 sm:p-2">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-bold text-slate-500 bg-white">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-5">Description</div>
              <div className="col-span-2 text-center">Qty</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-2 text-right pr-4">Amount</div>
            </div>
            
            {partsItems.map((item, index) => (
              <div key={item.id} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 px-3 py-3 border-b sm:border-0 border-slate-100 last:border-0 relative bg-white items-center">
                <div className="hidden sm:block col-span-1 text-center text-sm text-slate-400 font-medium">{index + 1}</div>
                <div className="col-span-12 sm:col-span-5 w-full">
                  <input placeholder="Part Description" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:border-teal-500 outline-none" />
                </div>
                <div className="col-span-4 sm:col-span-2 w-full flex items-center sm:block">
                  <span className="sm:hidden text-xs text-slate-500 w-12 font-medium">Qty:</span>
                  <input type="number" min="0" step="0.01" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:border-teal-500 outline-none sm:text-center" />
                </div>
                <div className="col-span-4 sm:col-span-2 w-full flex items-center sm:block">
                  <span className="sm:hidden text-xs text-slate-500 w-12 font-medium">Rate:</span>
                  <input type="number" min="0" step="0.01" value={item.rate} onChange={e => handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:border-teal-500 outline-none text-right" />
                </div>
                <div className="col-span-4 sm:col-span-2 w-full flex items-center justify-between sm:justify-end sm:block pr-6">
                  <span className="sm:hidden text-xs text-slate-500 font-medium">Amt:</span>
                  <div className="text-sm font-bold text-slate-700 text-right">{item.amount.toFixed(2)}</div>
                </div>
                <button type="button" onClick={() => removeItem(item.id)} className="absolute right-2 sm:right-3 top-3 text-red-400 hover:text-red-600 bg-white rounded-full p-1" title="Remove row">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {partsItems.length === 0 && <div className="text-center py-6 text-sm text-slate-400">No parts added</div>}
            
            <div className="bg-slate-50 px-5 py-3 flex justify-between items-center border-t border-slate-200">
              <span className="font-semibold text-slate-600 text-sm">Parts Total</span>
              <span className="font-bold text-slate-800">₹ {partsTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* LABOUR SECTION */}
        <div className="card rounded-2xl overflow-hidden">
          <div className="bg-slate-100 px-5 py-3 flex justify-between items-center">
            <h2 className="font-bold text-slate-700">LABOUR</h2>
            <button type="button" onClick={() => addItem('LABOUR')} className="text-xs font-bold bg-white text-teal-600 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50">
              + Add Labour
            </button>
          </div>
          <div className="p-0 sm:p-2">
            <div className="hidden sm:grid grid-cols-12 gap-2 px-3 py-2 text-xs font-bold text-slate-500 bg-white">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-9">Description</div>
              <div className="col-span-2 text-right pr-4">Amount</div>
            </div>
            
            {labourItems.map((item, index) => (
              <div key={item.id} className="flex flex-col sm:grid sm:grid-cols-12 gap-2 px-3 py-3 border-b sm:border-0 border-slate-100 last:border-0 relative bg-white items-center">
                <div className="hidden sm:block col-span-1 text-center text-sm text-slate-400 font-medium">{index + 1}</div>
                <div className="col-span-12 sm:col-span-9 w-full">
                  <input placeholder="Labour Description" value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 text-sm focus:border-teal-500 outline-none" />
                </div>
                {/* For labour, qty is usually 1, user just inputs rate which equals amount */}
                <div className="col-span-12 sm:col-span-2 w-full flex items-center justify-between sm:justify-end sm:block pr-6 mt-2 sm:mt-0">
                  <span className="sm:hidden text-xs text-slate-500 font-medium">Amount:</span>
                  <input type="number" min="0" step="0.01" value={item.rate} onChange={e => {
                    handleItemChange(item.id, 'rate', parseFloat(e.target.value) || 0);
                    handleItemChange(item.id, 'qty', 1);
                  }} className="w-24 sm:w-full px-3 py-2 rounded border border-slate-200 text-sm focus:border-teal-500 outline-none text-right font-bold text-slate-700" placeholder="0.00" />
                </div>
                <button type="button" onClick={() => removeItem(item.id)} className="absolute right-2 sm:right-3 top-3 sm:top-5 text-red-400 hover:text-red-600 bg-white rounded-full p-1" title="Remove row">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
            {labourItems.length === 0 && <div className="text-center py-6 text-sm text-slate-400">No labour added</div>}
            
            <div className="bg-slate-50 px-5 py-3 flex justify-between items-center border-t border-slate-200">
              <span className="font-semibold text-slate-600 text-sm">Labour Total</span>
              <span className="font-bold text-slate-800">₹ {labourTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card rounded-2xl p-5 bg-teal-50/50 border border-teal-100">
          <div className="flex justify-between items-center py-2 text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold">₹ {subTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-teal-100/50">
            <span className="text-slate-600">Discount (₹)</span>
            <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-24 px-3 py-1 rounded-lg border border-slate-200 focus:border-teal-500 outline-none text-right font-medium text-red-600 bg-white" />
          </div>
          <div className="flex justify-between items-center py-4">
            <span className="font-bold text-slate-800 text-lg">Grand Total</span>
            <span className="font-bold text-teal-700 text-2xl">₹ {finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full py-4 rounded-xl text-lg font-bold shadow-lg shadow-teal-500/20 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save & Generate Bill'}
        </button>

      </form>
    </div>
  )
}
