'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getOverdueReminders, PaymentReminder } from '@/lib/billingDatabase'

export default function ReminderChecker() {
  const [overdueReminders, setOverdueReminders] = useState<PaymentReminder[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [lastCheck, setLastCheck] = useState(0)

  const checkReminders = async () => {
    try {
      const reminders = await getOverdueReminders()
      setOverdueReminders(reminders)
      // Reset dismissed state when new reminders appear
      if (reminders.length > 0 && reminders.length !== overdueReminders.length) {
        setDismissed(false)
      }
    } catch (err) {
      // Silently fail — don't disrupt the app if reminders can't be loaded
    }
  }

  useEffect(() => {
    // Initial check after a small delay to not block initial page load
    const initialTimer = setTimeout(() => {
      checkReminders()
    }, 2000)

    // Check every 60 seconds
    const interval = setInterval(() => {
      checkReminders()
    }, 60000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  // Don't show if no overdue reminders or dismissed
  if (overdueReminders.length === 0 || dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-3 shadow-lg shadow-red-500/20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl flex-shrink-0 animate-bounce">🔔</span>
            <div className="min-w-0">
              <div className="font-bold text-sm">
                {overdueReminders.length} Overdue Payment{overdueReminders.length > 1 ? 's' : ''}
              </div>
              <div className="text-xs text-red-100 truncate">
                {overdueReminders.slice(0, 3).map(r => 
                  `${r.customerName} (₹${r.amountDue.toFixed(0)})`
                ).join(' • ')}
                {overdueReminders.length > 3 && ` +${overdueReminders.length - 3} more`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link
              href="/"
              onClick={() => setDismissed(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
            >
              View All
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
