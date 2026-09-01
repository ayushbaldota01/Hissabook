import { NextResponse } from 'next/server';
import { getParty, updateParty, deleteParty } from '@/lib/fileStorage';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const party = await getParty(id);
  if (!party) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(party);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const updated = await updateParty(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deleteParty(id);
  return NextResponse.json({ ok: true });
}
