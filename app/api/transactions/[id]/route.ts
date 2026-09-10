import { NextResponse } from 'next/server'
import { updateTransaction, deleteTransaction } from '@/lib/fileStorage'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.type != null) updates.type = body.type
  if (body.amount != null) updates.amount = body.amount
  if (body.transactionDate) updates.transactionDate = body.transactionDate
  if (body.description != null) updates.description = body.description
  
  const txn = await updateTransaction(id, updates)
  if (!txn) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(txn)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await deleteTransaction(id)
  return NextResponse.json({ ok: true })
}
