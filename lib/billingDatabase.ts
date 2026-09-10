const BILL_DB_NAME = 'RetailBillingDB';
const BILL_DB_VERSION = 2;

export type BillItem = {
  id: string;
  section: 'PARTS' | 'LABOUR';
  description: string;
  qty: number | '';
  rate: number | '';
  amount: number | '';
  unit?: string;
};

export type PaymentMode = 'Cash' | 'Online';
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export type Bill = {
  id: string;
  billNo: string;
  date: string;
  regNo: string;
  vehicleName: string;
  km: string;
  customerName: string;
  customerAddress: string;
  customerMobile: string;
  items: BillItem[];
  discount: number;
  total: number;
  paymentMode: PaymentMode;
  amountPaid: number;
  amountDue: number;
  paymentStatus: PaymentStatus;
  reminderDate?: string;
  reminderNote?: string;
  createdAt: string;
};

export type PaymentReminder = {
  id: string;
  billId: string;
  billNo: string;
  customerName: string;
  customerMobile: string;
  vehicleName: string;
  regNo: string;
  totalAmount: number;
  amountDue: number;
  reminderDate: string;
  note?: string;
  isCompleted: boolean;
  createdAt: string;
};

export type BusinessProfile = {
  shopName: string;
  address: string;
  email: string;
  phone1: string;
  phone2: string;
  phone3: string;
};

export const defaultBusinessProfile: BusinessProfile = {
  shopName: 'KINGS AUTO MULTI CAR SERVICES',
  address: 'OLD MORGAON ROAD, KHANDOBANAGAR, BARAMATI 413102',
  email: 'kingsauto.baramati96@rediffmail.com',
  phone1: '9822841929',
  phone2: '9767731122',
  phone3: '7038734005'
};

export function getBusinessProfile(): BusinessProfile {
  if (typeof window === 'undefined') return defaultBusinessProfile;
  const saved = localStorage.getItem('businessProfile');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return defaultBusinessProfile;
    }
  }
  return defaultBusinessProfile;
}

export function saveBusinessProfile(profile: BusinessProfile) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('businessProfile', JSON.stringify(profile));
  }
}

let billDbPromise: Promise<IDBDatabase> | null = null;

// Request persistent storage so the browser won't evict our IndexedDB data
function requestPersistentStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    navigator.storage.persist().then((granted) => {
      if (granted) {
        console.log('[BillingDB] Persistent storage granted');
      } else {
        console.warn('[BillingDB] Persistent storage denied — data may be evicted under storage pressure');
      }
    }).catch(() => {});
  }
}

function openBillDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BILL_DB_NAME, BILL_DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create bills store only if it doesn't exist (preserve existing data!)
      if (!db.objectStoreNames.contains('bills')) {
        db.createObjectStore('bills', { keyPath: 'id' });
      }

      // Create reminders store (new in v2)
      if (!db.objectStoreNames.contains('reminders')) {
        const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
        reminderStore.createIndex('billId', 'billId', { unique: false });
        reminderStore.createIndex('reminderDate', 'reminderDate', { unique: false });
        reminderStore.createIndex('isCompleted', 'isCompleted', { unique: false });
      }
    };

    request.onsuccess = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Listen for unexpected close events to allow recovery
      db.onclose = () => {
        console.warn('[BillingDB] Database connection closed unexpectedly');
        billDbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        billDbPromise = null;
      };

      resolve(db);
    };
    request.onerror = (event: Event) => reject((event.target as IDBOpenDBRequest).error);
    request.onblocked = () => {
      console.warn('[BillingDB] Database upgrade blocked — close other tabs');
    };
  });
}

function getBillDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available on server'));
  }

  if (!billDbPromise) {
    requestPersistentStorage();
    billDbPromise = openBillDB();
  }

  return billDbPromise;
}

// Retry wrapper — if a DB operation fails due to a closed connection, retry once
async function withRetry<T>(operation: (db: IDBDatabase) => Promise<T>): Promise<T> {
  try {
    const db = await getBillDB();
    return await operation(db);
  } catch (err: any) {
    // If the error indicates a closed/invalid connection, retry once
    if (err?.name === 'InvalidStateError' || err?.message?.includes('closed')) {
      console.warn('[BillingDB] Connection lost, retrying...');
      billDbPromise = null;
      const db = await getBillDB();
      return await operation(db);
    }
    throw err;
  }
}

// ─── BILL CRUD ───────────────────────────────────────────

export async function getAllBills(): Promise<Bill[]> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bills'], 'readonly');
      const store = transaction.objectStore('bills');
      const req = store.getAll();
      req.onsuccess = () => {
        const bills = (req.result as Bill[]).map(migrateBill);
        // Sort by descending createdAt
        bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        resolve(bills);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getBill(id: string): Promise<Bill | null> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bills'], 'readonly');
      const store = transaction.objectStore('bills');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? migrateBill(req.result) : null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function saveBill(bill: Bill): Promise<Bill> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bills'], 'readwrite');
      const store = transaction.objectStore('bills');
      const req = store.put(bill);
      req.onsuccess = () => resolve(bill);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function deleteBill(id: string): Promise<void> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bills', 'reminders'], 'readwrite');
      const billStore = transaction.objectStore('bills');
      const reminderStore = transaction.objectStore('reminders');
      
      billStore.delete(id);
      
      // Also delete associated reminders
      const reminderIndex = reminderStore.index('billId');
      const cursorReq = reminderIndex.openCursor(IDBKeyRange.only(id));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export async function updateBillPayment(billId: string, newAmountPaid: number): Promise<Bill | null> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['bills'], 'readwrite');
      const store = transaction.objectStore('bills');
      const getReq = store.get(billId);

      getReq.onerror = () => reject(getReq.error);
      getReq.onsuccess = () => {
        const bill = getReq.result as Bill | undefined;
        if (!bill) {
          resolve(null);
          return;
        }

        const migrated = migrateBill(bill);
        migrated.amountPaid = newAmountPaid;
        migrated.amountDue = Math.max(0, migrated.total - newAmountPaid);
        
        if (migrated.amountDue <= 0) {
          migrated.paymentStatus = 'Paid';
        } else if (newAmountPaid > 0) {
          migrated.paymentStatus = 'Partial';
        } else {
          migrated.paymentStatus = 'Unpaid';
        }

        const putReq = store.put(migrated);
        putReq.onerror = () => reject(putReq.error);
        putReq.onsuccess = () => resolve(migrated);
      };
    });
  });
}

// Migrate old bills (v1) to new schema — fills in defaults for missing fields
function migrateBill(bill: any): Bill {
  return {
    ...bill,
    vehicleName: bill.vehicleName || '',
    paymentMode: bill.paymentMode || 'Cash',
    amountPaid: bill.amountPaid ?? bill.total ?? 0,
    amountDue: bill.amountDue ?? 0,
    paymentStatus: bill.paymentStatus || 'Paid',
    reminderDate: bill.reminderDate || undefined,
    reminderNote: bill.reminderNote || undefined,
  };
}

// ─── REMINDER CRUD ───────────────────────────────────────

export async function saveReminder(reminder: PaymentReminder): Promise<PaymentReminder> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      const req = store.put(reminder);
      req.onsuccess = () => resolve(reminder);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getAllReminders(): Promise<PaymentReminder[]> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readonly');
      const store = transaction.objectStore('reminders');
      const req = store.getAll();
      req.onsuccess = () => {
        const reminders = req.result as PaymentReminder[];
        reminders.sort((a, b) => new Date(a.reminderDate).getTime() - new Date(b.reminderDate).getTime());
        resolve(reminders);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getActiveReminders(): Promise<PaymentReminder[]> {
  const all = await getAllReminders();
  return all.filter(r => !r.isCompleted);
}

export async function getOverdueReminders(): Promise<PaymentReminder[]> {
  const today = new Date().toISOString().slice(0, 10);
  const active = await getActiveReminders();
  return active.filter(r => r.reminderDate <= today);
}

export async function markReminderCompleted(id: string): Promise<void> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      const getReq = store.get(id);

      getReq.onerror = () => reject(getReq.error);
      getReq.onsuccess = () => {
        const reminder = getReq.result;
        if (reminder) {
          reminder.isCompleted = true;
          store.put(reminder);
        }
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
}

export async function deleteReminder(id: string): Promise<void> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readwrite');
      const store = transaction.objectStore('reminders');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export async function getReminderByBillId(billId: string): Promise<PaymentReminder | null> {
  return withRetry((db) => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['reminders'], 'readonly');
      const store = transaction.objectStore('reminders');
      const index = store.index('billId');
      const req = index.getAll(billId);
      req.onsuccess = () => {
        const reminders = req.result as PaymentReminder[];
        const active = reminders.find(r => !r.isCompleted);
        resolve(active || null);
      };
      req.onerror = () => reject(req.error);
    });
  });
}
