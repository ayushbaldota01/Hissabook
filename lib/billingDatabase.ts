const BILL_DB_NAME = 'RetailBillingDB';
const BILL_DB_VERSION = 1;

export type BillItem = {
  id: string;
  section: 'PARTS' | 'LABOUR';
  description: string;
  qty: number;
  rate: number;
  amount: number;
};

export type Bill = {
  id: string;
  billNo: string;
  date: string;
  regNo: string;
  km: string;
  customerName: string;
  customerAddress: string;
  customerMobile: string;
  items: BillItem[];
  discount: number;
  total: number;
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

function getBillDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available on server'));
  }
  
  if (!billDbPromise) {
    billDbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(BILL_DB_NAME, BILL_DB_VERSION);
      
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('bills')) {
          db.createObjectStore('bills', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (event: Event) => resolve((event.target as IDBOpenDBRequest).result);
      request.onerror = (event: Event) => reject((event.target as IDBOpenDBRequest).error);
    });
  }
  return billDbPromise;
}

export async function getAllBills(): Promise<Bill[]> {
  const db = await getBillDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['bills'], 'readonly');
    const store = transaction.objectStore('bills');
    const req = store.getAll();
    req.onsuccess = () => {
      const bills = req.result as Bill[];
      // Sort by descending createdAt
      bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(bills);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getBill(id: string): Promise<Bill | null> {
  const db = await getBillDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['bills'], 'readonly');
    const store = transaction.objectStore('bills');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBill(bill: Bill): Promise<Bill> {
  const db = await getBillDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['bills'], 'readwrite');
    const store = transaction.objectStore('bills');
    const req = store.put(bill);
    req.onsuccess = () => resolve(bill);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBill(id: string): Promise<void> {
  const db = await getBillDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['bills'], 'readwrite');
    const store = transaction.objectStore('bills');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
