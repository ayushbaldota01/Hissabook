import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data.json');

export type Party = {
  id: string;
  name: string;
  type: string;
  phone?: string;
  notes?: string;
  openingBalance: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  partyId: string;
  type: 'GIVEN' | 'RECEIVED' | 'OPENING';
  amount: number;
  transactionDate: string;
  description?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DataSchema = {
  parties: Party[];
  transactions: Transaction[];
};

async function readData(): Promise<DataSchema> {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      const initialData: DataSchema = { parties: [], transactions: [] };
      await writeData(initialData);
      return initialData;
    }
    throw err;
  }
}

async function writeData(data: DataSchema): Promise<void> {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── PARTIES ─────────────────────────────────────────────────────────────

export async function getAllParties(archived = false) {
  const data = await readData();
  let parties = data.parties;
  if (!archived) {
    parties = parties.filter(p => !p.isArchived);
  }

  // Calculate balance for each party
  const transactions = data.transactions.filter(t => !t.isDeleted);
  
  return parties.map(party => {
    let balance = party.openingBalance;
    const partyTxns = transactions.filter(t => t.partyId === party.id);
    for (const txn of partyTxns) {
      if (txn.type === 'GIVEN') balance += txn.amount;
      if (txn.type === 'RECEIVED') balance -= txn.amount;
    }
    return { ...party, balance };
  });
}

export async function getParty(id: string) {
  const data = await readData();
  const party = data.parties.find(p => p.id === id);
  if (!party) return null;

  let balance = party.openingBalance;
  const partyTxns = data.transactions.filter(t => t.partyId === party.id && !t.isDeleted);
  for (const txn of partyTxns) {
    if (txn.type === 'GIVEN') balance += txn.amount;
    if (txn.type === 'RECEIVED') balance -= txn.amount;
  }
  return { ...party, balance };
}

export async function createParty(partyData: Partial<Party>) {
  const data = await readData();
  const newParty: Party = {
    id: crypto.randomUUID(),
    name: partyData.name || 'Unknown',
    type: partyData.type || 'Customer',
    phone: partyData.phone,
    notes: partyData.notes,
    openingBalance: partyData.openingBalance || 0,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.parties.push(newParty);

  if (newParty.openingBalance !== 0) {
    data.transactions.push({
      id: crypto.randomUUID(),
      partyId: newParty.id,
      type: 'OPENING',
      amount: newParty.openingBalance,
      transactionDate: newParty.createdAt,
      description: 'Opening Balance',
      isDeleted: false,
      createdAt: newParty.createdAt,
      updatedAt: newParty.createdAt,
    });
  }

  await writeData(data);
  return newParty;
}

export async function updateParty(id: string, updates: Partial<Party>) {
  const data = await readData();
  const index = data.parties.findIndex(p => p.id === id);
  if (index === -1) return null;

  data.parties[index] = {
    ...data.parties[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await writeData(data);
  return data.parties[index];
}

export async function deleteParty(id: string) {
  const data = await readData();
  const initialPartyCount = data.parties.length;
  data.parties = data.parties.filter(p => p.id !== id);
  data.transactions = data.transactions.filter(t => t.partyId !== id);
  
  if (data.parties.length !== initialPartyCount) {
    await writeData(data);
  }
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────

export async function getPartyTransactions(partyId: string) {
  const data = await readData();
  const party = data.parties.find(p => p.id === partyId);
  if (!party) return [];

  const txns = data.transactions
    .filter(t => t.partyId === partyId && !t.isDeleted)
    .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

  let running = party.openingBalance;
  return txns.map(t => {
    if (t.type === 'GIVEN') running += t.amount;
    if (t.type === 'RECEIVED') running -= t.amount;
    return { ...t, running };
  });
}

export async function createTransaction(partyId: string, txnData: Partial<Transaction>) {
  const data = await readData();
  const newTxn: Transaction = {
    id: crypto.randomUUID(),
    partyId,
    type: txnData.type as 'GIVEN' | 'RECEIVED',
    amount: txnData.amount || 0,
    transactionDate: txnData.transactionDate || new Date().toISOString(),
    description: txnData.description,
    isDeleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  data.transactions.push(newTxn);
  await writeData(data);
  return newTxn;
}

export async function createTransactions(partyId: string, txnsData: Partial<Transaction>[]) {
  const data = await readData();
  const now = new Date().toISOString();
  
  const newTxns: Transaction[] = txnsData.map(txnData => ({
    id: crypto.randomUUID(),
    partyId,
    type: txnData.type as 'GIVEN' | 'RECEIVED',
    amount: txnData.amount || 0,
    transactionDate: txnData.transactionDate || now,
    description: txnData.description,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  }));

  data.transactions.push(...newTxns);
  await writeData(data);
  return newTxns;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>) {
  const data = await readData();
  const index = data.transactions.findIndex(t => t.id === id);
  if (index === -1) return null;

  data.transactions[index] = {
    ...data.transactions[index],
    ...updates,
    updatedAt: new Date().toISOString(),
    ...((updates as any).isEdited === undefined ? { isEdited: true } : {})
  } as any;
  await writeData(data);
  return data.transactions[index];
}

export async function deleteTransaction(id: string) {
  const data = await readData();
  const index = data.transactions.findIndex(t => t.id === id);
  if (index !== -1) {
    data.transactions[index].isDeleted = true;
    data.transactions[index].updatedAt = new Date().toISOString();
    await writeData(data);
  }
}

export async function exportAllData() {
  return await readData();
}
