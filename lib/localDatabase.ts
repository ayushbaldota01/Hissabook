import { Party, Transaction, DataSchema } from './fileStorage';

const DB_NAME = 'HisaabBookDB';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available on server'));
  }
  
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('parties')) {
          db.createObjectStore('parties', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('transactions')) {
          const txnStore = db.createObjectStore('transactions', { keyPath: 'id' });
          txnStore.createIndex('partyId', 'partyId', { unique: false });
        }
      };
      
      request.onsuccess = (event: Event) => resolve((event.target as IDBOpenDBRequest).result);
      request.onerror = (event: Event) => reject((event.target as IDBOpenDBRequest).error);
    });
  }
  return dbPromise;
}

export async function getAllParties(archived = false): Promise<(Party & { balance: number })[]> {
  const db = await getDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties', 'transactions'], 'readonly');
    const partyStore = transaction.objectStore('parties');
    const txnStore = transaction.objectStore('transactions');
    
    const partiesReq = partyStore.getAll();
    const txnsReq = txnStore.getAll();
    
    partiesReq.onerror = () => reject(partiesReq.error);
    partiesReq.onsuccess = () => {
      txnsReq.onerror = () => reject(txnsReq.error);
      txnsReq.onsuccess = () => {
        let parties: Party[] = partiesReq.result || [];
        const txns: Transaction[] = txnsReq.result || [];
        
        if (!archived) {
          parties = parties.filter(p => !p.isArchived);
        }
        
        const validTxns = txns.filter(t => !t.isDeleted);
        
        const result = parties.map(party => {
          let balance = party.openingBalance;
          const partyTxns = validTxns.filter(t => t.partyId === party.id);
          for (const txn of partyTxns) {
            if (txn.type === 'GIVEN') balance += txn.amount;
            if (txn.type === 'RECEIVED') balance -= txn.amount;
          }
          return { ...party, balance };
        });
        
        resolve(result);
      };
    };
  });
}

export async function getParty(id: string): Promise<(Party & { balance: number }) | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties', 'transactions'], 'readonly');
    const partyReq = transaction.objectStore('parties').get(id);
    const txnReq = transaction.objectStore('transactions').index('partyId').getAll(id);
    
    partyReq.onerror = () => reject(partyReq.error);
    partyReq.onsuccess = () => {
      const party = partyReq.result as Party | undefined;
      if (!party) {
        resolve(null);
        return;
      }
      
      txnReq.onerror = () => reject(txnReq.error);
      txnReq.onsuccess = () => {
        const txns = (txnReq.result as Transaction[]) || [];
        const validTxns = txns.filter(t => !t.isDeleted);
        
        let balance = party.openingBalance;
        for (const txn of validTxns) {
          if (txn.type === 'GIVEN') balance += txn.amount;
          if (txn.type === 'RECEIVED') balance -= txn.amount;
        }
        resolve({ ...party, balance });
      };
    };
  });
}

export async function createParty(partyData: Partial<Party>): Promise<Party> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const newParty: Party = {
    id,
    name: partyData.name || 'Unknown',
    type: partyData.type || 'Customer',
    phone: partyData.phone,
    notes: partyData.notes,
    openingBalance: partyData.openingBalance || 0,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties', 'transactions'], 'readwrite');
    transaction.objectStore('parties').add(newParty);
    
    if (newParty.openingBalance !== 0) {
      const initTxn: Transaction = {
        id: crypto.randomUUID(),
        partyId: id,
        type: 'OPENING',
        amount: newParty.openingBalance,
        transactionDate: now,
        description: 'Opening Balance',
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };
      transaction.objectStore('transactions').add(initTxn);
    }
    
    transaction.oncomplete = () => resolve(newParty);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateParty(id: string, updates: Partial<Party>): Promise<Party | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties'], 'readwrite');
    const store = transaction.objectStore('parties');
    const getReq = store.get(id);
    
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const party = getReq.result;
      if (!party) {
        resolve(null);
        return;
      }
      
      const updatedParty = { ...party, ...updates, updatedAt: new Date().toISOString() };
      const putReq = store.put(updatedParty);
      putReq.onerror = () => reject(putReq.error);
      putReq.onsuccess = () => resolve(updatedParty);
    };
  });
}

export async function deleteParty(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties', 'transactions'], 'readwrite');
    transaction.objectStore('parties').delete(id);
    
    const txnStore = transaction.objectStore('transactions');
    const txnIndex = txnStore.index('partyId');
    const getTxnsReq = txnIndex.getAll(id);
    
    getTxnsReq.onsuccess = () => {
      const txns = getTxnsReq.result as Transaction[];
      for (const txn of txns) {
        txnStore.delete(txn.id);
      }
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getPartyTransactions(partyId: string): Promise<(Transaction & { running: number })[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties', 'transactions'], 'readonly');
    const partyReq = transaction.objectStore('parties').get(partyId);
    
    partyReq.onerror = () => reject(partyReq.error);
    partyReq.onsuccess = () => {
      const party = partyReq.result as Party;
      if (!party) {
        resolve([]);
        return;
      }
      
      const txnReq = transaction.objectStore('transactions').index('partyId').getAll(partyId);
      txnReq.onerror = () => reject(txnReq.error);
      txnReq.onsuccess = () => {
        const txns = (txnReq.result as Transaction[]).filter(t => !t.isDeleted);
        txns.sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());
        
        let running = party.openingBalance;
        const result = txns.map(t => {
          if (t.type === 'GIVEN') running += t.amount;
          if (t.type === 'RECEIVED') running -= t.amount;
          return { ...t, running };
        });
        resolve(result);
      };
    };
  });
}

export async function createTransaction(partyId: string, txnData: Partial<Transaction>): Promise<Transaction> {
  const db = await getDB();
  const now = new Date().toISOString();
  const newTxn: Transaction = {
    id: crypto.randomUUID(),
    partyId,
    type: txnData.type as 'GIVEN' | 'RECEIVED',
    amount: txnData.amount || 0,
    transactionDate: txnData.transactionDate || now,
    description: txnData.description,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    const req = transaction.objectStore('transactions').add(newTxn);
    req.onsuccess = () => resolve(newTxn);
    req.onerror = () => reject(req.error);
  });
}

export async function createTransactions(partyId: string, txnsData: Partial<Transaction>[]): Promise<Transaction[]> {
  const db = await getDB();
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
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');
    for (const txn of newTxns) {
      store.add(txn);
    }
    transaction.oncomplete = () => resolve(newTxns);
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');
    const getReq = store.get(id);
    
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const txn = getReq.result;
      if (!txn) {
        resolve(null);
        return;
      }
      
      const updatedTxn = { 
        ...txn, 
        ...updates, 
        updatedAt: new Date().toISOString(),
        isEdited: updates.isEdited !== undefined ? updates.isEdited : true
      };
      
      const putReq = store.put(updatedTxn);
      putReq.onerror = () => reject(putReq.error);
      putReq.onsuccess = () => resolve(updatedTxn);
    };
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['transactions'], 'readwrite');
    const store = transaction.objectStore('transactions');
    const getReq = store.get(id);
    
    getReq.onerror = () => reject(getReq.error);
    getReq.onsuccess = () => {
      const txn = getReq.result;
      if (txn) {
        txn.isDeleted = true;
        txn.updatedAt = new Date().toISOString();
        store.put(txn);
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function exportAllData(): Promise<DataSchema> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties', 'transactions'], 'readonly');
    const partiesReq = transaction.objectStore('parties').getAll();
    const txnsReq = transaction.objectStore('transactions').getAll();
    
    partiesReq.onsuccess = () => {
      txnsReq.onsuccess = () => {
        resolve({
          parties: partiesReq.result || [],
          transactions: txnsReq.result || []
        });
      };
      txnsReq.onerror = () => reject(txnsReq.error);
    };
    partiesReq.onerror = () => reject(partiesReq.error);
  });
}

export async function importData(data: DataSchema): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['parties', 'transactions'], 'readwrite');
    const partyStore = transaction.objectStore('parties');
    const txnStore = transaction.objectStore('transactions');
    
    partyStore.clear();
    txnStore.clear();
    
    for (const party of data.parties) {
      partyStore.add(party);
    }
    for (const txn of data.transactions) {
      txnStore.add(txn);
    }
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
