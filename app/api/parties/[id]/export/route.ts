import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: party, error: pe } = await supabase.from('Party').select('*').eq('id', id).single()
  if (pe || !party) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: txns } = await supabase.from('Transaction').select('*').eq('partyId', id).eq('isDeleted', false).order('transactionDate', { ascending: true }).order('createdAt', { ascending: true })

  let running = Number(party.openingBalance)
  const rows = party.openingBalance !== 0
    ? [['Date', 'Type', 'Description', 'Amount (₹)', 'Running Balance (₹)', 'To Take / To Give'], [new Date(party.createdAt).toLocaleDateString('en-IN'), 'Opening', 'Opening balance', party.openingBalance, running, running >= 0 ? 'To Take' : 'To Give'], ...(txns || []).map((t: { type: string; amount: number; transactionDate: string; description?: string }) => {
        running += t.type === 'GIVEN' ? Number(t.amount) : -Number(t.amount)
        return [new Date(t.transactionDate).toLocaleDateString('en-IN'), t.type === 'GIVEN' ? 'Goods Given' : 'Payment Received', t.description || '', t.amount, running, running >= 0 ? 'To Take' : 'To Give']
      })]
    : [['Date', 'Type', 'Description', 'Amount (₹)', 'Running Balance (₹)', 'To Take / To Give'], ...(txns || []).map((t: { type: string; amount: number; transactionDate: string; description?: string }) => {
        running += t.type === 'GIVEN' ? Number(t.amount) : -Number(t.amount)
        return [new Date(t.transactionDate).toLocaleDateString('en-IN'), t.type === 'GIVEN' ? 'Goods Given' : 'Payment Received', t.description || '', t.amount, running, running >= 0 ? 'To Take' : 'To Give']
      })]

  const ws = XLSX.utils.aoa_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, party.name.slice(0, 31))
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new NextResponse(buf, { headers: { 'Content-Disposition': `attachment; filename="${party.name}-ledger.xlsx"`, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } })
}
