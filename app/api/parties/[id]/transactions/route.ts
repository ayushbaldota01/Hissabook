import { NextResponse } from 'next/server'
import { getPartyTransactions, createTransaction, getParty } from '@/lib/fileStorage'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const type = searchParams.get('type')

  const txns = await getPartyTransactions(id)
  if (!txns) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let filtered = txns
  if (dateFrom) filtered = filtered.filter(t => t.transactionDate >= dateFrom)
  if (dateTo) filtered = filtered.filter(t => t.transactionDate <= dateTo)
  if (type && ['GIVEN', 'RECEIVED'].includes(type)) filtered = filtered.filter(t => t.type === type)

  const party = await getParty(id)
  
  if (party && party.openingBalance !== 0) {
    const openingTxn = { transactionDate: party.createdAt, type: 'OPENING', amount: Math.abs(Number(party.openingBalance)), running: Number(party.openingBalance), description: 'Opening balance' }
    return NextResponse.json([openingTxn, ...filtered])
  }
  return NextResponse.json(filtered)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const txn = await createTransaction(id, body)
  return NextResponse.json(txn)
}
