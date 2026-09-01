import { Bill, BusinessProfile, getBusinessProfile } from './billingDatabase'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Helper to convert number to words (Indian format)
function numberToWords(num: number): string {
  if (num === 0) return 'ZERO'
  
  const a = ['','ONE ','TWO ','THREE ','FOUR ', 'FIVE ','SIX ','SEVEN ','EIGHT ','NINE ','TEN ','ELEVEN ','TWELVE ','THIRTEEN ','FOURTEEN ','FIFTEEN ','SIXTEEN ','SEVENTEEN ','EIGHTEEN ','NINETEEN ']
  const b = ['', '', 'TWENTY','THIRTY','FORTY','FIFTY', 'SIXTY','SEVENTY','EIGHTY','NINETY']

  const convert = (n: number): string => {
    if (n < 20) return a[n]
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10]
    if (n < 1000) return a[Math.floor(n / 100)] + 'HUNDRED ' + (n % 100 !== 0 ? 'AND ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + 'THOUSAND ' + (n % 1000 !== 0 ? convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + 'LAKH ' + (n % 100000 !== 0 ? convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + 'CRORE ' + (n % 10000000 !== 0 ? convert(n % 10000000) : '')
  }

  return convert(Math.floor(num)) + 'ONLY'
}

export function generateRetailBillPDF(bill: Bill, profile?: BusinessProfile): Blob {
  const biz = profile || getBusinessProfile()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = 210

  // Optional: add a border around the entire page
  doc.setDrawColor(0)
  doc.setLineWidth(0.5)
  doc.rect(10, 10, pageW - 20, 277) // outer box

  // --- HEADER SECTION ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('BILL', pageW / 2, 17, { align: 'center' })

  doc.setFontSize(22)
  doc.setTextColor(234, 88, 12) // Orange-ish matching reference
  doc.text(biz.shopName.toUpperCase(), pageW / 2, 28, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(50, 50, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(biz.address, pageW / 2, 35, { align: 'center' })
  
  if (biz.email) {
    doc.text(`Email Id : ${biz.email}`, pageW - 12, 42, { align: 'right' })
  }
  
  // Phone numbers string
  const phones = [biz.phone1, biz.phone2, biz.phone3].filter(Boolean).join('   ')
  doc.text(phones, pageW - 12, 47, { align: 'right' })

  doc.line(10, 52, pageW - 10, 52) // line below header

  // --- CUSTOMER & BILL DETAILS ---
  // Vertical line split
  doc.line(105, 52, 105, 75)
  doc.line(10, 75, pageW - 10, 75)

  // Left Side (Customer)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('To', 13, 58)
  doc.setFont('helvetica', 'bold')
  doc.text(bill.customerName.toUpperCase(), 13, 64)
  doc.setFont('helvetica', 'normal')
  if (bill.customerAddress) doc.text(bill.customerAddress, 13, 69)
  if (bill.customerMobile) doc.text(`Mobile No : ${bill.customerMobile}`, 13, 74)

  // Right Side (Bill Info)
  doc.setFontSize(10)
  doc.text(`Bill no.  :    ${bill.billNo}`, 108, 58)
  doc.line(105, 60, pageW - 10, 60)
  
  const formattedDate = new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-')
  doc.text(`Date      :    ${formattedDate}`, 108, 64)
  doc.line(105, 66, pageW - 10, 66)

  doc.text(`Reg. no.  :    ${bill.regNo || ''}`, 108, 70)
  doc.line(105, 71, pageW - 10, 71)

  doc.text(`K/M       :    ${bill.km || ''}`, 108, 75)

  // --- ITEMS TABLE ---
  const parts = bill.items.filter(i => i.section === 'PARTS')
  const labour = bill.items.filter(i => i.section === 'LABOUR')
  const partsTotal = parts.reduce((acc, item) => acc + item.amount, 0)
  const labourTotal = labour.reduce((acc, item) => acc + item.amount, 0)

  const body: any[][] = []

  // PARTS
  if (parts.length > 0) {
    body.push([{ content: 'PARTS', colSpan: 5, styles: { fontStyle: 'bold', font: 'helvetica' } }])
    parts.forEach((p, idx) => {
      body.push([idx + 1, p.description, p.qty.toFixed(2), p.rate.toFixed(2), p.amount.toFixed(2)])
    })
    body.push([{ content: '', colSpan: 3 }, { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, { content: partsTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }])
  }

  // LABOUR
  if (labour.length > 0) {
    body.push([{ content: 'LABOUR', colSpan: 5, styles: { fontStyle: 'bold', font: 'helvetica' } }])
    labour.forEach((l, idx) => {
      body.push([idx + 1, l.description, '', '', l.amount.toFixed(2)]) // PDF example leaves qty/rate blank for labour
    })
    body.push([{ content: '', colSpan: 3 }, { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, { content: labourTotal.toFixed(2), styles: { fontStyle: 'bold', halign: 'right' } }])
  }

  autoTable(doc, {
    startY: 75,
    head: [['S. No', 'Description', 'Qty', 'Rate', 'Amount']],
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: [230, 230, 230],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineWidth: 0.5,
      lineColor: [0, 0, 0]
    },
    styles: {
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      cellPadding: 3,
      fontSize: 10
    },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 95 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: 10, right: 10 },
    tableWidth: 'auto',
  })

  const finalY = (doc as any).lastAutoTable.finalY

  // --- FOOTER SECTION ---
  // Ensure we have enough space for footer, else add page (simplified for now, assume single page or standard footer placement)
  const footY = Math.max(finalY, 230) // Push footer to bottom

  doc.line(10, footY, pageW - 10, footY)
  
  // Vertical split for footer totals
  doc.line(135, footY, 135, 277)
  doc.line(170, footY, 170, 277) // Inner split for amounts

  // Left bottom text
  doc.setFontSize(9)
  doc.text('Vehicle has been received from workshop', 12, footY + 5)
  doc.text('and work done as pe my satifaction.', 12, footY + 10)

  doc.setFont('helvetica', 'bold')
  doc.text('Customer Signature', 40, 273, { align: 'center' })

  // Right bottom totals
  doc.text('Total', 137, footY + 8)
  doc.text('Discount', 137, footY + 18)
  doc.text('Total', 137, 273)

  doc.setFont('helvetica', 'normal')
  const subTotal = (partsTotal + labourTotal).toFixed(2)
  doc.text(subTotal, 198, footY + 8, { align: 'right' })
  doc.text(bill.discount.toFixed(2), 198, footY + 18, { align: 'right' })
  
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(bill.total.toFixed(2), 198, 273, { align: 'right' })

  doc.line(10, 265, pageW - 10, 265) // line above final Total
  
  // Amount in words
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(`INR : ${numberToWords(bill.total)}`, 10, 282)

  return doc.output('blob')
}
