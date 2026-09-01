'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllBills, Bill } from '@/lib/billingDatabase'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RetailBillingDashboard() {
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  const loadBills = async () => {
    setLoading(true)
    try {
      const data = await getAllBills()
      setBills(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBills() }, [])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-teal-800">Retail Billing</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your invoices and estimates</p>
        </div>
        <Link href="/billing/new" className="btn-primary px-5 py-3 rounded-xl text-center shadow-lg font-bold">
          + Create New Bill
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading bills...</div>
      ) : bills.length === 0 ? (
        <div className="card rounded-2xl p-12 text-center border-dashed border-2 border-slate-200">
          <div className="text-4xl mb-4">🧾</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">No bills created yet</h2>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first professional retail bill and share it easily with customers via WhatsApp.</p>
          <Link href="/billing/new" className="btn-primary inline-block px-6 py-3 rounded-xl font-bold">
            Create Bill
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bills.map((bill) => (
            <div key={bill.id} className="card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:shadow-lg transition-shadow">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    #{bill.billNo}
                  </span>
                  <span className="text-xs text-slate-400">{fmtDate(bill.date)}</span>
                </div>
                <div className="font-bold text-slate-800 truncate text-lg">{bill.customerName}</div>
                {bill.regNo && <div className="text-sm text-slate-500 mt-1 uppercase">Vehicle: {bill.regNo}</div>}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="font-bold text-teal-700 text-xl">{fmt(bill.total)}</span>
                <Link href={`/billing/${bill.id}`} className="btn-secondary px-4 py-2 rounded-xl text-sm text-center w-full sm:w-auto font-semibold">
                  View & Share
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
