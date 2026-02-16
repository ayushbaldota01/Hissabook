import { NextResponse } from 'next/server'
import { getPartiesWithBalance } from '@/lib/balance'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const parties = await getPartiesWithBalance(false)
  const toTake = parties.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0)
  const toGive = parties.filter((p) => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
  const { data: monthTxns } = await supabase.from('Transaction').select('type,amount').eq('isDeleted', false).gte('transactionDate', monthStart).lte('transactionDate', monthEnd)
  const moneyIn = (monthTxns || []).filter((t) => t.type === 'RECEIVED').reduce((s, t) => s + Number(t.amount), 0)
  const moneyOut = (monthTxns || []).filter((t) => t.type === 'GIVEN').reduce((s, t) => s + Number(t.amount), 0)

  const topTake = parties.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5)
  const topGive = parties.filter((p) => p.balance < 0).sort((a, b) => a.balance - b.balance).slice(0, 5)

  return NextResponse.json({ toTake, toGive, net: toTake - toGive, moneyIn, moneyOut, totalTxns: monthTxns?.length ?? 0, topTake, topGive })
}
