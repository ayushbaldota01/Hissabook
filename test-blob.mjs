import { put } from '@vercel/blob';

async function testUpload() {
  try {
    const textBlob = new Blob(['Test public upload'], { type: 'text/plain' });
    const url = await put('test.txt', textBlob, { 
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    console.log('Public upload successful:', url.url);
  } catch(e) {
    console.error('Public upload failed:', e.message);
  }
}
testUpload();
