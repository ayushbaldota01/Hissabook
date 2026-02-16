import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.type != null) updates.type = body.type
  if (body.amount != null) updates.amount = body.amount
  if (body.transactionDate) updates.transactionDate = body.transactionDate
  if (body.description != null) updates.description = body.description
  const { data: txn, error } = await supabase.from('Transaction').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(txn)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await supabase.from('Transaction').update({ isDeleted: true }).eq('id', id)
  return NextResponse.json({ ok: true })
}
