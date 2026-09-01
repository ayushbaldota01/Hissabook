import { NextResponse } from 'next/server';
import { getAllParties, createParty } from '@/lib/fileStorage';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const archived = searchParams.get('archived') === 'true';
  const parties = await getAllParties(archived);
  return NextResponse.json(parties);
}

export async function POST(req: Request) {
  const body = await req.json();
  const newParty = await createParty(body);
  return NextResponse.json(newParty);
}
