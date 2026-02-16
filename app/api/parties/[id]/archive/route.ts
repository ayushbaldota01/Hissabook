import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PATCH(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: party, error } = await supabase.from('Party').update({ isArchived: true }).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(party)
}
