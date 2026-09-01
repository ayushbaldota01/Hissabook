import { NextResponse } from 'next/server';
import pdf = require('pdf-parse');


export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdf(buffer);
    const text = data.text;
    
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const transactions = [];
    let currentBalance = 0;
    let bufferLine = '';
    
    // Default to current year, ideally we could extract it from the header "2026"
    let currentYear = new Date().getFullYear();
    const headerMatch = text.match(/\d{4}/g);
    if (headerMatch) {
      currentYear = parseInt(headerMatch[0]);
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      
      if (line.match(/Page \d+ of \d+/) || 
          line.includes('Shree Automobile') ||
          line.includes('Khatabook') ||
          line.includes('मदत:') ||
          line.includes('अट  व  शत') ||
          line.includes('दनांक तप शल') ||
          line.includes('एकूण  बेरीज') ||
          line.match(/^(जानेवारी|फे ुवारी|माच |ए  ल |मे |जून |जुलै|ऑग ट|स ट बर|ऑ टोबर|नो ह बर| डस बर)/)) {
          continue;
      }
      
      const dateMatch = line.match(/^(\d{2})\/(\d{2})/);
      if (dateMatch) {
         if (bufferLine) {
            processRow(bufferLine);
         }
         bufferLine = line;
      } else {
         if (bufferLine) {
            bufferLine += ' ' + line;
         } else {
            const m = line.match(/([\d,]+\.\d{2})\s*(Dr|Cr)?$/);
            if (m && line.includes('ओप न ग  बॅल स')) {
               let b = parseFloat(m[1].replace(/,/g, ''));
               if (m[2] === 'Cr') b = -b;
               currentBalance = b;
            }
         }
      }
    }
    if (bufferLine) processRow(bufferLine);

    function processRow(rowText: string) {
      // Must end with Dr, Cr, or 0.00
      const endMatch = rowText.match(/([\d,]+\.\d{2})\s*(Dr|Cr)$|([\d,]+\.\d{2})\s*$/);
      if (!endMatch) return;
      
      const isZero = !endMatch[2] && parseFloat(endMatch[3] || '0') === 0;
      if (!endMatch[2] && !isZero) return; // ignore matches that aren't Dr/Cr or 0.00
      
      const balStr = (endMatch[1] || endMatch[3]).replace(/,/g, '');
      let balanceNum = parseFloat(balStr);
      if (endMatch[2] === 'Cr') balanceNum = -balanceNum;
      
      const diff = balanceNum - currentBalance;
      let txnAmount = Math.abs(diff);
      txnAmount = Math.round(txnAmount * 100) / 100;
      
      if (txnAmount === 0 && transactions.length === 0) {
         currentBalance = balanceNum;
         return;
      }
      
      const type = diff > 0 ? 'GIVEN' : 'RECEIVED';
      
      let desc = rowText.replace(/^\d{2}\/\d{2}\s*/, '');
      desc = desc.replace(endMatch[0], '').trim();
      desc = desc.replace(/[\d,]+\.\d{2}$/, '').trim();
      
      const dateMatch = rowText.match(/^(\d{2})\/(\d{2})/);
      if (dateMatch) {
         const dateISO = `${currentYear}-${dateMatch[2]}-${dateMatch[1]}T12:00:00.000Z`;
         transactions.push({
            transactionDate: dateISO,
            description: desc || 'Imported Transaction',
            amount: txnAmount,
            type: type
         });
      }
      
      currentBalance = balanceNum;
    }

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Import Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
