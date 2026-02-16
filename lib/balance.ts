import { supabase } from './supabase'

export async function getPartyBalance(partyId: string) {
  const { data: party } = await supabase.from('Party').select('openingBalance').eq('id', partyId).single()
  if (!party) return 0
  const { data: txns } = await supabase.from('Transaction').select('type,amount').eq('partyId', partyId).eq('isDeleted', false).order('transactionDate', { ascending: true }).order('createdAt', { ascending: true })
  let bal = Number(party.openingBalance)
  for (const t of txns || []) bal += t.type === 'GIVEN' ? Number(t.amount) : -Number(t.amount)
  return bal
}

export async function getPartiesWithBalance(archived = false) {
  const { data: parties } = await supabase.from('Party').select('*').eq('isArchived', archived)
  if (!parties?.length) return []
  const { data: txns } = await supabase.from('Transaction').select('partyId,type,amount,transactionDate').eq('isDeleted', false).order('transactionDate', { ascending: false })
  const byParty = new Map<string, { type: string; amount: number; transactionDate: string }[]>()
  for (const t of txns || []) {
    if (!byParty.has(t.partyId)) byParty.set(t.partyId, [])
    byParty.get(t.partyId)!.push(t)
  }
  return parties.map((p) => {
    let bal = Number(p.openingBalance)
    const list = byParty.get(p.id) || []
    for (const t of [...list].reverse()) bal += t.type === 'GIVEN' ? Number(t.amount) : -Number(t.amount)
    return { ...p, balance: bal, lastTransactionDate: list[0]?.transactionDate ?? p.createdAt }
  })
}
