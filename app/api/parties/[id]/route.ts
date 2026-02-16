import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getPartyBalance } from '@/lib/balance'

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: party, error } = await supabase.from('Party').select('*').eq('id', id).single()
  if (error || !party) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const balance = await getPartyBalance(party.id)
  return NextResponse.json({ ...party, balance })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { data: party, error } = await supabase.from('Party').update({ name: body.name, type: body.type, phone: body.phone, notes: body.notes }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(party)
}
