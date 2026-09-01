import { NextResponse } from 'next/server'
import { exportAllData } from '@/lib/fileStorage'

export async function GET() {
  const data = await exportAllData()
  return NextResponse.json({ exported: new Date().toISOString(), parties: data.parties, transactions: data.transactions })
}
