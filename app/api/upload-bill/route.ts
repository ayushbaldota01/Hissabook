import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const billNo = formData.get('billNo') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Generate a unique filename
    const filename = `bills/Bill_${billNo}_${Date.now()}.pdf`;

    // Upload to Vercel Blob (using private since the user created a private store)
    const blob = await put(filename, file, {
      access: 'private',
      contentType: 'application/pdf',
      addRandomSuffix: false, 
    });

    // Create a proxy URL so the customer can view the private file
    const origin = new URL(request.url).origin;
    const proxyUrl = `${origin}/api/download-bill?url=${encodeURIComponent(blob.url)}`;

    return NextResponse.json({ url: proxyUrl });
  } catch (error) {
    console.error('Error uploading to Vercel Blob:', error);
    return NextResponse.json({ error: 'Failed to upload bill' }, { status: 500 });
  }
}
