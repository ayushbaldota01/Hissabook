import { put } from '@vercel/blob';

async function testUpload() {
  try {
    const textBlob = new Blob(['Hello World'], { type: 'text/plain' });
    const url = await put('test.txt', textBlob, { 
      access: 'private',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    console.log('Private upload successful:', url.url);
  } catch(e) {
    console.error('Private upload failed:', e.message);
  }
}
testUpload();
