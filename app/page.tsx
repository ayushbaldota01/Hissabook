'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllBills, Bill, getAllReminders, getActiveReminders, PaymentReminder, markReminderCompleted, updateBillPayment } from '@/lib/billingDatabase'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

type TabKey = 'bills' | 'dues' | 'reminders'

export default function RetailBillingDashboard() {
  const [bills, setBills] = useState<Bill[]>([])
  const [reminders, setReminders] = useState<PaymentReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('bills')
  const [searchQuery, setSearchQuery] = useState('')

  // Record Payment Modal
  const [payModalBill, setPayModalBill] = useState<Bill | null>(null)
  const [payAmount, setPayAmount] = useState<number | ''>('')
  const [payProcessing, setPayProcessing] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [billData, reminderData] = await Promise.all([
        getAllBills(),
        getActiveReminders()
      ])
      setBills(billData)
      setReminders(reminderData)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  // Derived data
  const pendingBills = bills.filter(b => b.amountDue > 0)
  const today = new Date().toISOString().slice(0, 10)
  const overdueReminders = reminders.filter(r => r.reminderDate < today)
  const todayReminders = reminders.filter(r => r.reminderDate === today)
  const upcomingReminders = reminders.filter(r => r.reminderDate > today)

  // Search filter
  const filteredBills = bills.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.customerName.toLowerCase().includes(q) ||
      b.billNo.toLowerCase().includes(q) ||
      b.regNo.toLowerCase().includes(q) ||
      b.vehicleName?.toLowerCase().includes(q)
    )
  })

  const filteredPendingBills = pendingBills.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.customerName.toLowerCase().includes(q) ||
      b.billNo.toLowerCase().includes(q) ||
      b.regNo.toLowerCase().includes(q) ||
      b.vehicleName?.toLowerCase().includes(q)
    )
  })

  const handleRecordPayment = async () => {
    if (!payModalBill || !payAmount) return
    setPayProcessing(true)
    try {
      const newPaid = (payModalBill.amountPaid || 0) + Number(payAmount)
      await updateBillPayment(payModalBill.id, newPaid)
      setPayModalBill(null)
      setPayAmount('')
      await loadData()
    } catch (err) {
      console.error(err)
      alert('Failed to record payment')
    } finally {
      setPayProcessing(false)
    }
  }

  const handleCompleteReminder = async (id: string) => {
    try {
      await markReminderCompleted(id)
      await loadData()
    } catch (err) {
      console.error(err)
    }
  }

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'bills', label: 'All Bills', count: bills.length },
    { key: 'dues', label: 'Pending Dues', count: pendingBills.length },
    { key: 'reminders', label: 'Reminders', count: reminders.length },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-teal-800">Retail Billing</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your invoices and payments</p>
        </div>
        <Link href="/billing/new" className="btn-primary px-5 py-3 rounded-xl text-center shadow-lg font-bold">
          + Create New Bill
        </Link>
      </div>

      {/* Overdue Alert Banner */}
      {overdueReminders.length > 0 && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 animate-pulse-subtle">
          <span className="text-2xl flex-shrink-0">🔴</span>
          <div>
            <div className="font-bold text-red-800 text-sm">
              {overdueReminders.length} Overdue Payment{overdueReminders.length > 1 ? 's' : ''}!
            </div>
            <div className="text-red-600 text-xs mt-1">
              {overdueReminders.map(r => `${r.customerName} (₹${r.amountDue.toFixed(0)})`).join(', ')}
            </div>
            <button
              onClick={() => setActiveTab('reminders')}
              className="text-xs font-bold text-red-700 underline mt-2 hover:text-red-900"
            >
              View Reminders →
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-5">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {(tab.count ?? 0) > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      {activeTab !== 'reminders' && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by name, bill no, vehicle..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-sm text-slate-700 bg-white"
          />
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-slate-500">Loading...</div>
      ) : (
        <>
          {/* ─── ALL BILLS TAB ─── */}
          {activeTab === 'bills' && (
            filteredBills.length === 0 ? (
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
                {filteredBills.map((bill) => (
                  <div key={bill.id} className="card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:shadow-lg transition-shadow">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          #{bill.billNo}
                        </span>
                        <span className="text-xs text-slate-400">{fmtDate(bill.date)}</span>
                        {/* Payment Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bill.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                          bill.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {bill.paymentStatus || 'Paid'}
                        </span>
                        {/* Payment Mode Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          bill.paymentMode === 'Online' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {bill.paymentMode || 'Cash'}
                        </span>
                      </div>
                      <div className="font-bold text-slate-800 truncate text-lg">{bill.customerName}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {bill.vehicleName && (
                          <span className="text-sm text-slate-600 font-medium">🚗 {bill.vehicleName}</span>
                        )}
                        {bill.regNo && (
                          <span className="text-xs text-slate-400 uppercase font-mono bg-slate-50 px-1.5 py-0.5 rounded">{bill.regNo}</span>
                        )}
                      </div>
                      {bill.amountDue > 0 && (
                        <div className="text-xs text-red-600 font-semibold mt-1">
                          Due: {fmt(bill.amountDue)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="text-right sm:text-left">
                        <span className="font-bold text-teal-700 text-xl">{fmt(bill.total)}</span>
                      </div>
                      <div className="flex gap-2">
                        {bill.amountDue > 0 && (
                          <button
                            onClick={() => { setPayModalBill(bill); setPayAmount(''); }}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            💰 Pay
                          </button>
                        )}
                        <Link href={`/billing/${bill.id}`} className="btn-secondary px-4 py-2 rounded-xl text-sm text-center font-semibold">
                          View
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* ─── PENDING DUES TAB ─── */}
          {activeTab === 'dues' && (
            filteredPendingBills.length === 0 ? (
              <div className="card rounded-2xl p-12 text-center border-dashed border-2 border-slate-200">
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">All Payments Clear!</h2>
                <p className="text-slate-500 max-w-sm mx-auto">No pending dues. All bills are fully paid.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {/* Table Header - Desktop */}
                <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <div className="col-span-3">Customer</div>
                  <div className="col-span-2">Vehicle</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1 text-right">Paid</div>
                  <div className="col-span-1 text-right">Due</div>
                  <div className="col-span-2">Reminder</div>
                  <div className="col-span-2 text-center">Action</div>
                </div>

                {filteredPendingBills.map(bill => (
                  <div key={bill.id} className="card rounded-xl p-4 sm:grid sm:grid-cols-12 sm:gap-2 sm:items-center hover:shadow-md transition-shadow">
                    {/* Customer */}
                    <div className="sm:col-span-3">
                      <div className="font-bold text-slate-800 text-sm truncate">{bill.customerName}</div>
                      <div className="text-xs text-slate-400">#{bill.billNo} • {fmtDate(bill.date)}</div>
                    </div>
                    {/* Vehicle */}
                    <div className="sm:col-span-2 mt-1 sm:mt-0">
                      <div className="text-sm text-slate-600 font-medium truncate">{bill.vehicleName || '-'}</div>
                      <div className="text-xs text-slate-400 uppercase">{bill.regNo || '-'}</div>
                    </div>
                    {/* Total */}
                    <div className="sm:col-span-1 sm:text-right mt-2 sm:mt-0">
                      <span className="sm:hidden text-xs text-slate-400 mr-1">Total:</span>
                      <span className="text-sm font-semibold text-slate-700">{fmt(bill.total)}</span>
                    </div>
                    {/* Paid */}
                    <div className="sm:col-span-1 sm:text-right">
                      <span className="sm:hidden text-xs text-slate-400 mr-1">Paid:</span>
                      <span className="text-sm font-semibold text-emerald-600">{fmt(bill.amountPaid || 0)}</span>
                    </div>
                    {/* Due */}
                    <div className="sm:col-span-1 sm:text-right">
                      <span className="sm:hidden text-xs text-slate-400 mr-1">Due:</span>
                      <span className="text-sm font-bold text-red-600">{fmt(bill.amountDue)}</span>
                    </div>
                    {/* Reminder */}
                    <div className="sm:col-span-2 mt-1 sm:mt-0">
                      {bill.reminderDate ? (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg inline-block ${
                          bill.reminderDate < today ? 'bg-red-50 text-red-600' :
                          bill.reminderDate === today ? 'bg-amber-50 text-amber-600' :
                          'bg-blue-50 text-blue-600'
                        }`}>
                          {bill.reminderDate < today ? '⚠️' : bill.reminderDate === today ? '🔔' : '📅'} {fmtDate(bill.reminderDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">No reminder</span>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="sm:col-span-2 flex gap-2 mt-3 sm:mt-0 sm:justify-center">
                      <button
                        onClick={() => { setPayModalBill(bill); setPayAmount(''); }}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                      >
                        💰 Record Pay
                      </button>
                      <Link
                        href={`/billing/${bill.id}`}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold text-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Summary Footer */}
                <div className="card rounded-xl p-4 mt-3 bg-red-50/50 border border-red-100">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-700">Total Pending Amount</span>
                    <span className="font-bold text-red-700 text-xl">{fmt(filteredPendingBills.reduce((s, b) => s + b.amountDue, 0))}</span>
                  </div>
                </div>
              </div>
            )
          )}

          {/* ─── REMINDERS TAB ─── */}
          {activeTab === 'reminders' && (
            reminders.length === 0 ? (
              <div className="card rounded-2xl p-12 text-center border-dashed border-2 border-slate-200">
                <div className="text-4xl mb-4">🔔</div>
                <h2 className="text-xl font-bold text-slate-700 mb-2">No Reminders</h2>
                <p className="text-slate-500 max-w-sm mx-auto">Payment reminders will appear here when you set them while creating bills with pending payments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overdue */}
                {overdueReminders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🔴 Overdue ({overdueReminders.length})
                    </h3>
                    <div className="space-y-2">
                      {overdueReminders.map(r => (
                        <ReminderCard key={r.id} reminder={r} urgency="overdue" onComplete={handleCompleteReminder} onPay={(r) => {
                          const bill = bills.find(b => b.id === r.billId)
                          if (bill) { setPayModalBill(bill); setPayAmount(''); }
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Today */}
                {todayReminders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🟡 Today ({todayReminders.length})
                    </h3>
                    <div className="space-y-2">
                      {todayReminders.map(r => (
                        <ReminderCard key={r.id} reminder={r} urgency="today" onComplete={handleCompleteReminder} onPay={(r) => {
                          const bill = bills.find(b => b.id === r.billId)
                          if (bill) { setPayModalBill(bill); setPayAmount(''); }
                        }} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming */}
                {upcomingReminders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                      🔵 Upcoming ({upcomingReminders.length})
                    </h3>
                    <div className="space-y-2">
                      {upcomingReminders.map(r => (
                        <ReminderCard key={r.id} reminder={r} urgency="upcoming" onComplete={handleCompleteReminder} onPay={(r) => {
                          const bill = bills.find(b => b.id === r.billId)
                          if (bill) { setPayModalBill(bill); setPayAmount(''); }
                        }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}

      {/* ─── RECORD PAYMENT MODAL ─── */}
      {payModalBill && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={() => !payProcessing && setPayModalBill(null)}>
          <div className="card rounded-2xl p-6 w-full max-w-md shadow-xl bg-white" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-slate-800 mb-1">💰 Record Payment</h2>
            <p className="text-sm text-slate-500 mb-4">
              {payModalBill.customerName} • Bill #{payModalBill.billNo}
            </p>
            
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Bill Total</span>
                <span className="font-semibold text-slate-700">{fmt(payModalBill.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Already Paid</span>
                <span className="font-semibold text-emerald-600">{fmt(payModalBill.amountPaid || 0)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-100 pt-2">
                <span className="text-slate-500 font-bold">Current Due</span>
                <span className="font-bold text-red-600">{fmt(payModalBill.amountDue)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Payment Amount</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={payModalBill.amountDue}
                  value={payAmount}
                  placeholder="Enter amount"
                  onChange={e => setPayAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-right font-bold text-lg"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setPayAmount(payModalBill.amountDue)}
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
                onClick={() => !payProcessing && setPayModalBill(null)}
                disabled={payProcessing}
                className="flex-1 btn-secondary py-3 rounded-xl font-bold disabled:opacity-50"
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

// ─── REMINDER CARD COMPONENT ────────────────────────────
function ReminderCard({ reminder, urgency, onComplete, onPay }: {
  reminder: PaymentReminder
  urgency: 'overdue' | 'today' | 'upcoming'
  onComplete: (id: string) => void
  onPay: (reminder: PaymentReminder) => void
}) {
  const borderColor = urgency === 'overdue' ? 'border-red-200 bg-red-50/40' :
                       urgency === 'today' ? 'border-amber-200 bg-amber-50/40' :
                       'border-blue-100'

  return (
    <div className={`card rounded-xl p-4 border ${borderColor} hover:shadow-md transition-shadow`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-800">{reminder.customerName}</div>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 flex-wrap">
            {reminder.vehicleName && <span>🚗 {reminder.vehicleName}</span>}
            {reminder.regNo && <span className="uppercase font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{reminder.regNo}</span>}
            <span>• Bill #{reminder.billNo}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="font-bold text-red-600">Due: ₹{reminder.amountDue.toFixed(0)}</span>
            <span className="text-xs text-slate-400">of ₹{reminder.totalAmount.toFixed(0)}</span>
          </div>
          {reminder.note && (
            <div className="text-xs text-slate-500 mt-1 italic">📝 {reminder.note}</div>
          )}
          <div className="text-xs text-slate-400 mt-1">
            📅 {fmtDate(reminder.reminderDate)}
            {urgency === 'overdue' && <span className="text-red-500 font-bold ml-1">(OVERDUE)</span>}
            {urgency === 'today' && <span className="text-amber-500 font-bold ml-1">(TODAY)</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onPay(reminder)}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            💰 Pay
          </button>
          {reminder.customerMobile && (
            <a
              href={`https://wa.me/91${reminder.customerMobile.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${reminder.customerName}, this is a gentle reminder regarding your pending payment of ₹${reminder.amountDue.toFixed(0)} for ${reminder.vehicleName || 'your vehicle'} (${reminder.regNo || 'N/A'}). Bill #${reminder.billNo}. Please arrange the payment at your earliest convenience. Thank you!`)}`}
              target="_blank"
              className="px-3 py-2 rounded-lg text-xs font-bold bg-[#25D366] text-white hover:bg-[#1DA851] transition-colors"
            >
              WhatsApp
            </a>
          )}
          <button
            onClick={() => onComplete(reminder.id)}
            className="px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
            title="Mark as completed"
          >
            ✅ Done
          </button>
        </div>
      </div>
    </div>
  )
}
