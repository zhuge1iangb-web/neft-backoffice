/* eslint-disable @typescript-eslint/no-explicit-any */
import * as XLSX from 'xlsx'

// ─── Excel Export ────────────────────────────────────────────────────────────
export function exportToExcel(data: any[], headers: string[], keys: string[], filename: string) {
  const worksheetData = [
    headers,
    ...data.map(row => keys.map(k => row[k] ?? ''))
  ]
  const ws = XLSX.utils.aoa_to_sheet(worksheetData)

  // Auto-width columns
  const colWidths = headers.map((h, i) => ({
    wch: Math.max(h.length * 2, ...data.map(r => String(r[keys[i]] ?? '').length)) + 2
  }))
  ws['!cols'] = colWidths

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}_${formatDateForFile()}.xlsx`)
}

// ─── PDF Export ──────────────────────────────────────────────────────────────
export async function exportToPdf(
  title: string,
  headers: string[],
  data: any[],
  keys: string[],
  filename: string
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header area
  doc.setFillColor(15, 38, 84)  // NEFT Navy
  doc.rect(0, 0, 297, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.text('NEFT Solution', 14, 10)
  doc.setFontSize(10)
  doc.text(title, 14, 16)
  doc.setFontSize(8)
  doc.text(`Generated: ${new Date().toLocaleString('th-TH')}`, 230, 16)

  // Table
  autoTable(doc, {
    head: [headers],
    body: data.map(row => keys.map(k => row[k] ?? '')),
    startY: 25,
    styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
    headStyles: { fillColor: [27, 56, 117], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [235, 243, 255] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}_${formatDateForFile()}.pdf`)
}

function formatDateForFile() {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
}

export function formatCurrency(value: number, currency = 'THB') {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency', currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('th-TH').format(value)
}

export function formatDate(dateStr: string | null | undefined, lang: 'th' | 'en' = 'th') {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: '2-digit', month: 'short', year: 'numeric'
  })
}
