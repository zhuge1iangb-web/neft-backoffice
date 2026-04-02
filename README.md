# NEFT Backoffice System

ระบบบริหารจัดการองค์กร NEFT Solution — Web-Based Backoffice สำหรับใช้งานภายในองค์กร

![NEFT Backoffice](https://img.shields.io/badge/NEFT-Backoffice-1B3875?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)

---

## ✨ Features

| Module | รายละเอียด |
|--------|-----------|
| 🏠 Executive Dashboard | KPI Cards, Charts รายรับ/การรับชำระ, Pipeline, Project Status |
| 💼 Sales Management | Opportunities, Kanban Pipeline, Quotations, Win/Loss tracking |
| 📁 Project Management | Project progress, Milestones, Blocker tracking, Status update |
| 💰 Finance Control | Invoices, Collections, AR Aging Analysis, Overdue tracking |
| 🔧 Service Support | Ticket management, SLA tracking, MA Contracts |
| 🔔 Notifications | Real-time alerts, แจ้งเตือนวิกฤต, Overdue, MA expiring |
| 👥 User Management | User list, Role-based Permission Matrix |
| 🗄️ Master Data | Customer database, SLA Rules |

## 🌐 Multi-Language Support
- ภาษาไทย (Thai) 🇹🇭
- English 🇬🇧
- สลับภาษาได้ทันทีจาก Header ทุกหน้า

## 📤 Export Functions
- **Excel (.xlsx)** — ทุกหน้าที่มีตารางข้อมูล
- **PDF** — Export พร้อม NEFT Header สำหรับรายงาน

---

## 🚀 Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| ceo | ceo123 | CEO/Director |
| sales1 | sales123 | Sales |
| pm1 | pm123 | Project Manager |
| finance | fin123 | Finance |
| service | svc123 | Service Support |

---

## 🛠️ Installation & Local Development

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/neft-backoffice.git
cd neft-backoffice

# 2. Install dependencies
npm install

# 3. Run development server
npm run dev

# 4. Open browser
# http://localhost:3000
```

---

## ☁️ Deployment บน Vercel (Auto-Deploy)

### ขั้นตอนที่ 1: Push ขึ้น GitHub

```bash
# เปิด Terminal แล้วไปที่ folder โปรเจ็กต์
cd neft-backoffice

# Initialize git (ถ้ายังไม่ได้ทำ)
git init
git add .
git commit -m "Initial commit: NEFT Backoffice System"

# สร้าง repo ใหม่บน GitHub แล้ว push
git remote add origin https://github.com/YOUR_USERNAME/neft-backoffice.git
git branch -M main
git push -u origin main
```

### ขั้นตอนที่ 2: เชื่อมต่อ Vercel

1. ไปที่ **[vercel.com](https://vercel.com)** → Sign up ด้วย GitHub account
2. คลิก **"Add New Project"**
3. เลือก repository **`neft-backoffice`** จาก GitHub
4. Vercel จะ detect Next.js อัตโนมัติ — คลิก **"Deploy"**
5. รอประมาณ 1-2 นาที → ได้ URL ฟรี เช่น `https://neft-backoffice.vercel.app`

### ✅ Auto-Deploy ทำงานอย่างไร

```
Claude แก้โค้ด → คุณ Push ขึ้น GitHub → Vercel อัปเดตเว็บอัตโนมัติ ✨
```

ทุกครั้งที่ push code ขึ้น branch `main` → Vercel จะ build และ deploy ให้อัตโนมัติภายใน 1-2 นาที
**ไม่ต้องทำอะไรเพิ่มเลย!**

---

## 📁 Project Structure

```
neft-backoffice/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Login page
│   │   ├── layout.tsx               # Root layout
│   │   └── (main)/                  # Protected pages
│   │       ├── layout.tsx           # Main layout (auth check)
│   │       ├── dashboard/page.tsx   # Executive Dashboard
│   │       ├── sales/page.tsx       # Sales Module
│   │       ├── projects/page.tsx    # Project Management
│   │       ├── finance/page.tsx     # Finance Control
│   │       ├── service/page.tsx     # Service Support
│   │       ├── notifications/page.tsx
│   │       ├── users/page.tsx
│   │       └── master/page.tsx
│   ├── components/
│   │   ├── layout/                  # Sidebar, Header
│   │   └── ui/                      # Button, Badge, Modal, KPICard
│   ├── lib/
│   │   ├── translations.ts          # TH/EN translations
│   │   ├── demo-data.ts             # Sample data
│   │   └── export.ts                # Excel/PDF export
│   └── store/index.ts               # Zustand state management
├── package.json
├── tailwind.config.js
├── next.config.js
└── vercel.json
```

---

## 🔧 Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | React framework, App Router |
| **TypeScript** | Type safety |
| **Tailwind CSS** | Styling |
| **Zustand** | State management |
| **Recharts** | Charts & visualizations |
| **xlsx** | Excel export |
| **jspdf** | PDF export |
| **Heroicons** | Icons |

---

## 🔄 Phase 2 Roadmap (Backend Integration)

สำหรับ Production จริง แนะนำ:
- **Supabase** — PostgreSQL + Auth + Realtime (free tier)
- **NextAuth.js** — Authentication
- **Notifications** — LINE / Email / Google Calendar API

```bash
# ติดตั้ง Supabase
npm install @supabase/supabase-js

# เพิ่ม environment variables ใน Vercel:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
```

---

## 📞 Support

**NEFT Solution Co., Ltd.**
🌐 [www.neftsolution.co.th](https://www.neftsolution.co.th)

---

*Built with ❤️ for NEFT Solution internal operations*
