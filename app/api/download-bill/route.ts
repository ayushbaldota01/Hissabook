import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const blobUrl = url.searchParams.get('url');

  if (!blobUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(blobUrl, {
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch the bill PDF from secure storage' }, { status: 500 });
    }

    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="Bill.pdf"', 
      },
    });
  } catch (error) {
    console.error('Error serving private blob:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
