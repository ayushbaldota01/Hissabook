import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const type = searchParams.get('type')

  let q = supabase.from('Transaction').select('*').eq('partyId', id).eq('isDeleted', false)
  if (dateFrom) q = q.gte('transactionDate', dateFrom)
  if (dateTo) q = q.lte('transactionDate', dateTo)
  if (type && ['GIVEN', 'RECEIVED'].includes(type)) q = q.eq('type', type)
  const { data: txns, error } = await q.order('transactionDate', { ascending: true }).order('createdAt', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: party } = await supabase.from('Party').select('openingBalance,createdAt').eq('id', id).single()
  if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let running = Number(party.openingBalance)
  const rows = party.openingBalance !== 0
    ? [{ transactionDate: party.createdAt, type: 'OPENING', amount: Math.abs(Number(party.openingBalance)), running, description: 'Opening balance' }, ...(txns || []).map((t: { type: string; amount: number }) => {
        running += t.type === 'GIVEN' ? Number(t.amount) : -Number(t.amount)
        return { ...t, running }
      })]
    : (txns || []).map((t: { type: string; amount: number }) => {
        running += t.type === 'GIVEN' ? Number(t.amount) : -Number(t.amount)
        return { ...t, running }
      })
  return NextResponse.json(rows)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { data: txn, error } = await supabase.from('Transaction').insert({ partyId: id, type: body.type, amount: Math.abs(Number(body.amount)), transactionDate: body.transactionDate || new Date().toISOString(), description: body.description || null }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(txn)
}
