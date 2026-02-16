import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [partiesRes, txnsRes] = await Promise.all([
    supabase.from('Party').select('*').order('name'),
    supabase.from('Transaction').select('*').eq('isDeleted', false).order('transactionDate'),
  ])
  return NextResponse.json({ exported: new Date().toISOString(), parties: partiesRes.data || [], transactions: txnsRes.data || [] })
}
