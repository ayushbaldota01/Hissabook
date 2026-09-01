'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { exportAllData, importData, getAllParties } from '@/lib/localDatabase'
import { getBusinessProfile, saveBusinessProfile, BusinessProfile, defaultBusinessProfile } from '@/lib/billingDatabase'

export default function Settings() {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [stats, setStats] = useState({ parties: 0, txns: 0 })
  const [profile, setProfile] = useState<BusinessProfile>(defaultBusinessProfile)

  const loadStats = async () => {
    try {
      const p = await getAllParties(true)
      const data = await exportAllData()
      setStats({ parties: data.parties.length, txns: data.transactions.length })
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => { 
    loadStats() 
    setProfile(getBusinessProfile())
  }, [])

  const exportData = async () => {
    setExporting(true)
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `hisaabbook-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      console.error(e)
      alert("Failed to export data")
    }
    setExporting(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!confirm('Warning: Importing will overwrite all current device data. Are you sure?')) {
      e.target.value = ''
      return
    }

    setImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!data.parties || !data.transactions) throw new Error('Invalid file format')
      await importData(data)
      alert('Data imported successfully!')
      loadStats()
    } catch (err) {
      console.error(err)
      alert("Failed to import data. Please check the file.")
    }
    setImporting(false)
    e.target.value = ''
  }

  const handleProfileChange = (field: keyof BusinessProfile, value: string) => {
    const p = { ...profile, [field]: value }
    setProfile(p)
    saveBusinessProfile(p)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6">Settings & Data</h1>

      {/* Business Profile */}
      <div className="card rounded-2xl p-6 space-y-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Business Profile</h2>
          <p className="text-xs text-slate-500 mb-4">This information will appear on generated Retail Bills (PDFs).</p>
        </div>
        <div className="space-y-3">
          <input placeholder="Shop / Business Name" value={profile.shopName} onChange={e => handleProfileChange('shopName', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none font-semibold text-slate-800" />
          <textarea placeholder="Address" value={profile.address} onChange={e => handleProfileChange('address', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-slate-700 resize-none" rows={2} />
          <input placeholder="Email Address (Optional)" value={profile.email} onChange={e => handleProfileChange('email', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input placeholder="Phone 1" value={profile.phone1} onChange={e => handleProfileChange('phone1', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
            <input placeholder="Phone 2" value={profile.phone2} onChange={e => handleProfileChange('phone2', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
            <input placeholder="Phone 3" value={profile.phone3} onChange={e => handleProfileChange('phone3', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-500 outline-none text-slate-700" />
          </div>
        </div>
      </div>

      <div className="card rounded-2xl p-6 space-y-6 mb-6">
        <div>
          <div className="text-sm text-slate-500 font-semibold mb-2">Ledger Storage Status</div>
          <div className="flex gap-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1">
              <div className="text-2xl font-bold text-slate-700">{stats.parties}</div>
              <div className="text-xs text-slate-500 mt-1">Parties stored</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1">
              <div className="text-2xl font-bold text-slate-700">{stats.txns}</div>
              <div className="text-xs text-slate-500 mt-1">Transactions stored</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card rounded-2xl p-6 space-y-6">
        <div>
          <div className="text-sm text-slate-500 font-semibold mb-4">Ledger Backup & Restore</div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={exportData} disabled={exporting} className="btn-primary flex-1 px-5 py-3 rounded-xl font-medium disabled:opacity-60 text-center">
              {exporting ? 'Exporting...' : 'Export Backup (JSON)'}
            </button>
            <label className="btn-secondary flex-1 px-5 py-3 rounded-xl font-medium cursor-pointer text-center flex items-center justify-center">
              {importing ? 'Importing...' : 'Restore from Backup'}
              <input type="file" accept=".json" className="hidden" onChange={handleImport} disabled={importing} />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-3">All your data is stored securely on this device. Create backups regularly.</p>
        </div>
      </div>

    </div>
  )
}

