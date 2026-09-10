import { NextResponse } from 'next/server';
import { getAllParties, getPartyTransactions } from '@/lib/fileStorage';

export async function GET() {
  const parties = await getAllParties(false);
  const toTake = parties.filter((p) => p.balance > 0).reduce((s, p) => s + p.balance, 0);
  const toGive = parties.filter((p) => p.balance < 0).reduce((s, p) => s + Math.abs(p.balance), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Aggregate month transactions from local storage across all parties
  const monthTxns: { type: string; amount: number; transactionDate: string }[] = [];
  for (const party of parties) {
    const txns = await getPartyTransactions(party.id);
    for (const txn of txns) {
      if (!txn.isDeleted && txn.transactionDate >= monthStart && txn.transactionDate <= monthEnd && txn.type !== 'OPENING') {
        monthTxns.push({ type: txn.type, amount: Number(txn.amount), transactionDate: txn.transactionDate });
      }
    }
  }

  const moneyIn = monthTxns.filter((t) => t.type === 'RECEIVED').reduce((s, t) => s + Number(t.amount), 0);
  const moneyOut = monthTxns.filter((t) => t.type === 'GIVEN').reduce((s, t) => s + Number(t.amount), 0);

  const topTake = parties.filter((p) => p.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 5);
  const topGive = parties.filter((p) => p.balance < 0).sort((a, b) => a.balance - b.balance).slice(0, 5);

  return NextResponse.json({
    toTake,
    toGive,
    net: toTake - toGive,
    moneyIn,
    moneyOut,
    totalTxns: monthTxns.length,
    topTake,
    topGive,
  });
}
