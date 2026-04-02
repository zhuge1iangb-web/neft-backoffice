import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NEFT Backoffice System',
  description: 'ระบบบริหารจัดการองค์กร NEFT Solution',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans bg-[#F4F6FA] min-h-screen">{children}</body>
    </html>
  )
}
