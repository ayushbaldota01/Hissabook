import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getPartiesWithBalance } from '@/lib/balance'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const archived = searchParams.get('archived') === 'true'
  const parties = await getPartiesWithBalance(archived)
  return NextResponse.json(parties)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { data: party, error } = await supabase.from('Party').insert({ name: body.name, type: body.type || 'Other', phone: body.phone || null, notes: body.notes || null, openingBalance: body.openingBalance ?? 0 }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(party)
}
