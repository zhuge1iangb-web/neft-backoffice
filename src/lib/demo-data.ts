// Demo data for NEFT Backoffice System

export const demoUsers = [
  { id: 1, username: 'admin',   password: 'admin123', name: 'ผู้ดูแลระบบ',       role: 'Admin',          department: 'IT',        email: 'admin@neftsolution.co.th',   active: true, lastLogin: '2026-04-02' },
  { id: 2, username: 'ceo',     password: 'ceo123',   name: 'กวี วงษ์สวรรค์',    role: 'CEO/Director',   department: 'Management', email: 'ceo@neftsolution.co.th',     active: true, lastLogin: '2026-04-02' },
  { id: 3, username: 'sales1',  password: 'sales123', name: 'สมชาย ใจดี',        role: 'Sales',          department: 'Sales',      email: 'somchai@neftsolution.co.th', active: true, lastLogin: '2026-04-01' },
  { id: 4, username: 'pm1',     password: 'pm123',    name: 'วิรัตน์ ทองดี',     role: 'Project Manager', department: 'Engineering', email: 'wirat@neftsolution.co.th',  active: true, lastLogin: '2026-04-02' },
  { id: 5, username: 'finance', password: 'fin123',   name: 'สุภาพร มั่งคั่ง',   role: 'Finance',        department: 'Finance',    email: 'suphaporn@neftsolution.co.th', active: true, lastLogin: '2026-04-01' },
  { id: 6, username: 'service', password: 'svc123',   name: 'ธนกร ขยัน',         role: 'Service Support', department: 'Service',   email: 'thanakorn@neftsolution.co.th', active: true, lastLogin: '2026-03-31' },
]

export const demoCustomers = [
  { id: 1, name: 'บริษัท ไทยเมทัล จำกัด',       industry: 'Manufacturing', phone: '02-111-1111', email: 'info@thaimetal.co.th',   taxId: '0105561234567', address: '123 ถ.สุขุมวิท กรุงเทพฯ' },
  { id: 2, name: 'ธนาคารกรุงไทย',              industry: 'Banking',       phone: '02-222-2222', email: 'it@ktb.co.th',           taxId: '0107551234567', address: '35 ถ.สุขุมวิท แขวงคลองเตย' },
  { id: 3, name: 'SCG Group',                   industry: 'Conglomerate',  phone: '02-333-3333', email: 'procurement@scg.co.th',  taxId: '0107581234567', address: '1 ถ.ปูนซิเมนต์ไทย บางซื่อ' },
  { id: 4, name: 'บริษัท ซีพีเอฟ จำกัด (มหาชน)', industry: 'Food',          phone: '02-444-4444', email: 'it@cpf.co.th',           taxId: '0107591234567', address: '313 ถ.สีลม บางรัก กรุงเทพฯ' },
  { id: 5, name: 'PTT Digital',                 industry: 'Energy/IT',     phone: '02-555-5555', email: 'info@pttdigital.co.th',  taxId: '0107601234567', address: '555 ถ.วิภาวดี-รังสิต' },
  { id: 6, name: 'AIS',                         industry: 'Telecom',       phone: '02-666-6666', email: 'vendor@ais.th',          taxId: '0107611234567', address: '414 ถ.พหลโยธิน สามเสนใน' },
]

export const demoOpportunities = [
  { id: 1, no: 'OPP-2026-001', name: 'Network Infrastructure Upgrade', customerId: 1, customerName: 'บริษัท ไทยเมทัล จำกัด', owner: 'สมชาย ใจดี', stage: 'Negotiation', value: 4500000, cost: 3200000, gp: 1300000, probability: 60, expectedClose: '2026-04-30', lastActivity: '2026-04-01', nextFollowUp: '2026-04-05', status: 'active' },
  { id: 2, no: 'OPP-2026-002', name: 'Core Banking Security Solution', customerId: 2, customerName: 'ธนาคารกรุงไทย', owner: 'สมชาย ใจดี', stage: 'Proposal Submitted', value: 12000000, cost: 8500000, gp: 3500000, probability: 40, expectedClose: '2026-05-15', lastActivity: '2026-03-28', nextFollowUp: '2026-04-08', status: 'active' },
  { id: 3, no: 'OPP-2026-003', name: 'ERP Implementation Phase 2', customerId: 3, customerName: 'SCG Group', owner: 'สมชาย ใจดี', stage: 'Requirement Gathered', value: 8000000, cost: 5500000, gp: 2500000, probability: 30, expectedClose: '2026-06-30', lastActivity: '2026-04-02', nextFollowUp: '2026-04-10', status: 'active' },
  { id: 4, no: 'OPP-2026-004', name: 'Cloud Migration Project', customerId: 4, customerName: 'บริษัท ซีพีเอฟ จำกัด (มหาชน)', owner: 'สมชาย ใจดี', stage: 'Won', value: 6200000, cost: 4100000, gp: 2100000, probability: 100, expectedClose: '2026-03-31', lastActivity: '2026-03-31', nextFollowUp: null, status: 'won' },
  { id: 5, no: 'OPP-2026-005', name: 'Cybersecurity Assessment', customerId: 5, customerName: 'PTT Digital', owner: 'สมชาย ใจดี', stage: 'Qualified', value: 2800000, cost: 1900000, gp: 900000, probability: 25, expectedClose: '2026-07-15', lastActivity: '2026-04-01', nextFollowUp: '2026-04-07', status: 'active' },
  { id: 6, no: 'OPP-2026-006', name: 'Data Center Consolidation', customerId: 6, customerName: 'AIS', owner: 'สมชาย ใจดี', stage: 'Lost', value: 15000000, cost: 0, gp: 0, probability: 0, expectedClose: '2026-03-15', lastActivity: '2026-03-15', nextFollowUp: null, status: 'lost' },
  { id: 7, no: 'OPP-2025-089', name: 'SD-WAN Deployment', customerId: 1, customerName: 'บริษัท ไทยเมทัล จำกัด', owner: 'สมชาย ใจดี', stage: 'New Lead', value: 3100000, cost: 2200000, gp: 900000, probability: 10, expectedClose: '2026-08-30', lastActivity: '2026-04-02', nextFollowUp: '2026-04-12', status: 'active' },
]

export const demoProjects = [
  { id: 1, code: 'PRJ-2026-001', name: 'Cloud Migration - CPF', customerId: 4, customerName: 'บริษัท ซีพีเอฟ จำกัด (มหาชน)', pm: 'วิรัตน์ ทองดี', type: 'Implementation', contractValue: 6200000, gpTarget: 33, startDate: '2026-04-01', targetEnd: '2026-09-30', status: 'In Progress', progress: 15, latestUpdate: 'เริ่มต้น Kickoff Meeting และทำ Site Survey', blocker: null, sourceOppId: 4 },
  { id: 2, code: 'PRJ-2025-042', name: 'Network Upgrade - Thai Metal', customerId: 1, customerName: 'บริษัท ไทยเมทัล จำกัด', pm: 'วิรัตน์ ทองดี', type: 'Implementation', contractValue: 3800000, gpTarget: 28, startDate: '2025-11-01', targetEnd: '2026-04-30', status: 'Delayed', progress: 65, latestUpdate: 'ล่าช้าเนื่องจากอุปกรณ์ขาดสต็อก', blocker: 'รออุปกรณ์ Cisco Switch จาก Distributor', sourceOppId: null },
  { id: 3, code: 'PRJ-2025-038', name: 'Security Implementation - KTB', customerId: 2, customerName: 'ธนาคารกรุงไทย', pm: 'วิรัตน์ ทองดี', type: 'Security', contractValue: 9500000, gpTarget: 30, startDate: '2025-09-01', targetEnd: '2026-06-30', status: 'In Progress', progress: 45, latestUpdate: 'Firewall ติดตั้งแล้ว อยู่ระหว่าง Testing', blocker: null, sourceOppId: null },
  { id: 4, code: 'PRJ-2025-029', name: 'ERP Phase 1 - PTT Digital', customerId: 5, customerName: 'PTT Digital', pm: 'วิรัตน์ ทองดี', type: 'Software', contractValue: 5500000, gpTarget: 35, startDate: '2025-07-01', targetEnd: '2026-03-31', status: 'Completed', progress: 100, latestUpdate: 'โครงการเสร็จสมบูรณ์ ส่งมอบแล้ว', blocker: null, sourceOppId: null },
  { id: 5, code: 'PRJ-2026-002', name: 'Wireless Infra - AIS Branch', customerId: 6, customerName: 'AIS', pm: 'วิรัตน์ ทองดี', type: 'Infrastructure', contractValue: 2100000, gpTarget: 25, startDate: '2026-03-01', targetEnd: '2026-06-30', status: 'Planning', progress: 5, latestUpdate: 'อยู่ระหว่างจัดทำแผน และ BOQ', blocker: null, sourceOppId: null },
]

export const demoMilestones = [
  { id: 1, projectId: 1, name: 'Kickoff Meeting',    planned: '2026-04-05', actual: '2026-04-05', status: 'Completed', owner: 'วิรัตน์ ทองดี' },
  { id: 2, projectId: 1, name: 'Site Survey',         planned: '2026-04-15', actual: null,          status: 'In Progress', owner: 'วิรัตน์ ทองดี' },
  { id: 3, projectId: 1, name: 'Design Approval',     planned: '2026-05-15', actual: null,          status: 'Pending', owner: 'วิรัตน์ ทองดี' },
  { id: 4, projectId: 1, name: 'Delivery',            planned: '2026-06-30', actual: null,          status: 'Pending', owner: 'วิรัตน์ ทองดี' },
  { id: 5, projectId: 2, name: 'Design Approval',     planned: '2026-01-15', actual: '2026-01-20', status: 'Completed', owner: 'วิรัตน์ ทองดี' },
  { id: 6, projectId: 2, name: 'Delivery',            planned: '2026-03-01', actual: null,          status: 'Overdue',   owner: 'วิรัตน์ ทองดี' },
  { id: 7, projectId: 2, name: 'Installation',        planned: '2026-04-15', actual: null,          status: 'Pending', owner: 'วิรัตน์ ทองดี' },
  { id: 8, projectId: 3, name: 'Firewall Install',   planned: '2026-02-28', actual: '2026-03-05', status: 'Completed', owner: 'วิรัตน์ ทองดี' },
  { id: 9, projectId: 3, name: 'Testing/UAT',         planned: '2026-04-30', actual: null,          status: 'In Progress', owner: 'วิรัตน์ ทองดี' },
  { id: 10, projectId: 3, name: 'Handover',           planned: '2026-05-31', actual: null,          status: 'Pending', owner: 'วิรัตน์ ทองดี' },
]

export const demoInvoices = [
  { id: 1, projectId: 1, projectName: 'Cloud Migration - CPF',       customerId: 4, customerName: 'บริษัท ซีพีเอฟ จำกัด (มหาชน)', invoiceNo: 'INV-2026-0012', invoiceDate: '2026-04-01', dueDate: '2026-04-30', billedAmount: 1860000, paidAmount: 0,       status: 'Unpaid',    overdue: false },
  { id: 2, projectId: 2, projectName: 'Network Upgrade - Thai Metal', customerId: 1, customerName: 'บริษัท ไทยเมทัล จำกัด',        invoiceNo: 'INV-2026-0008', invoiceDate: '2026-03-01', dueDate: '2026-03-31', billedAmount: 1140000, paidAmount: 0,       status: 'Overdue',   overdue: true  },
  { id: 3, projectId: 3, projectName: 'Security Implementation - KTB', customerId: 2, customerName: 'ธนาคารกรุงไทย',             invoiceNo: 'INV-2026-0005', invoiceDate: '2026-02-15', dueDate: '2026-03-15', billedAmount: 2850000, paidAmount: 2850000, status: 'Paid',      overdue: false },
  { id: 4, projectId: 3, projectName: 'Security Implementation - KTB', customerId: 2, customerName: 'ธนาคารกรุงไทย',             invoiceNo: 'INV-2026-0010', invoiceDate: '2026-03-20', dueDate: '2026-04-19', billedAmount: 2850000, paidAmount: 0,       status: 'Unpaid',    overdue: false },
  { id: 5, projectId: 4, projectName: 'ERP Phase 1 - PTT Digital',    customerId: 5, customerName: 'PTT Digital',                 invoiceNo: 'INV-2025-0098', invoiceDate: '2026-03-31', dueDate: '2026-04-29', billedAmount: 5500000, paidAmount: 0,       status: 'Unpaid',    overdue: false },
  { id: 6, projectId: 5, projectName: 'Wireless Infra - AIS Branch',  customerId: 6, customerName: 'AIS',                         invoiceNo: 'INV-2025-0082', invoiceDate: '2025-12-01', dueDate: '2025-12-31', billedAmount: 630000,  paidAmount: 0,       status: 'Overdue',   overdue: true  },
]

export const demoTickets = [
  { id: 1, no: 'TK-2026-0089', customerId: 2, customerName: 'ธนาคารกรุงไทย',  subject: 'Firewall policy block internal traffic', severity: 'Critical', assignedTo: 'ธนกร ขยัน', status: 'In Progress', createdAt: '2026-04-02', responseDue: '2026-04-02 14:00', resolutionDue: '2026-04-02 18:00', slaStatus: 'At Risk', contractId: 1, description: 'พบปัญหา Firewall บล็อค traffic ระหว่าง VLAN ทำให้ระบบหลักไม่สามารถเชื่อมต่อได้' },
  { id: 2, no: 'TK-2026-0088', customerId: 1, customerName: 'บริษัท ไทยเมทัล จำกัด', subject: 'Switch port not working - Building B Floor 3', severity: 'High',  assignedTo: 'ธนกร ขยัน', status: 'Assigned',     createdAt: '2026-04-01', responseDue: '2026-04-01 17:00', resolutionDue: '2026-04-02 17:00', slaStatus: 'Breached', contractId: 2, description: 'Port บน Switch Floor 3 ตาย 4 ports ส่งผลต่อการทำงาน' },
  { id: 3, no: 'TK-2026-0085', customerId: 4, customerName: 'บริษัท ซีพีเอฟ จำกัด (มหาชน)', subject: 'Slow internet - Head office', severity: 'Medium', assignedTo: 'ธนกร ขยัน', status: 'Pending Customer', createdAt: '2026-03-30', responseDue: '2026-03-30 17:00', resolutionDue: '2026-04-01 17:00', slaStatus: 'Met', contractId: 3, description: 'Internet ช้าผิดปกติ ตรวจพบปัญหาจาก ISP รอ ISP แก้ไข' },
  { id: 4, no: 'TK-2026-0080', customerId: 3, customerName: 'SCG Group',       subject: 'VPN disconnection intermittent',         severity: 'Low',    assignedTo: 'ธนกร ขยัน', status: 'Resolved',     createdAt: '2026-03-25', responseDue: '2026-03-25 17:00', resolutionDue: '2026-03-28 17:00', slaStatus: 'Met', contractId: null, description: 'VPN หลุดบ้างเป็นครั้งคราว แก้ไขแล้วด้วยการ update certificate' },
  { id: 5, no: 'TK-2026-0091', customerId: 5, customerName: 'PTT Digital',     subject: 'Server CPU high utilization 95%',        severity: 'High',   assignedTo: 'ธนกร ขยัน', status: 'Open',         createdAt: '2026-04-02', responseDue: '2026-04-02 16:00', resolutionDue: '2026-04-03 16:00', slaStatus: 'At Risk', contractId: null, description: 'Server หลักมี CPU สูงมาก 95% ต่อเนื่อง ต้องการความช่วยเหลือด่วน' },
]

export const demoContracts = [
  { id: 1, no: 'MA-2025-0015', customerId: 2, customerName: 'ธนาคารกรุงไทย',             type: 'MA 24/7',    startDate: '2025-04-01', endDate: '2026-04-30', scope: 'Firewall, IDS/IPS, Network switches, 24/7 support', renewalOwner: 'ธนกร ขยัน', status: 'Active', daysLeft: 28 },
  { id: 2, no: 'MA-2025-0018', customerId: 1, customerName: 'บริษัท ไทยเมทัล จำกัด',     type: 'MA Business', startDate: '2025-06-01', endDate: '2026-05-31', scope: 'Network infrastructure, 8x5 support', renewalOwner: 'ธนกร ขยัน', status: 'Active', daysLeft: 59 },
  { id: 3, no: 'MA-2025-0022', customerId: 4, customerName: 'บริษัท ซีพีเอฟ จำกัด (มหาชน)', type: 'MA Business', startDate: '2025-07-01', endDate: '2026-06-30', scope: 'Cloud infrastructure monitoring, 8x5 support', renewalOwner: 'ธนกร ขยัน', status: 'Active', daysLeft: 89 },
  { id: 4, no: 'MA-2024-0055', customerId: 3, customerName: 'SCG Group',                  type: 'MA Basic',   startDate: '2024-04-01', endDate: '2026-03-31', scope: 'Periodic inspection only', renewalOwner: 'ธนกร ขยัน', status: 'Expired', daysLeft: 0 },
]

export const demoNotifications = [
  { id: 1,  module: 'Service', type: 'critical', title: 'Critical Ticket Opened',         message: 'TK-2026-0089: Firewall policy block - KTB',                 time: '10:25',  date: '2026-04-02', read: false, link: '/service' },
  { id: 2,  module: 'Finance', type: 'warning',  title: 'Invoice Overdue',                message: 'INV-2026-0008: ไทยเมทัล ค้างชำระ ฿1,140,000',               time: '09:00',  date: '2026-04-02', read: false, link: '/finance' },
  { id: 3,  module: 'Project', type: 'warning',  title: 'Milestone Overdue',              message: 'PRJ-2025-042: Delivery milestone เกินกำหนด',                 time: '08:30',  date: '2026-04-02', read: false, link: '/projects' },
  { id: 4,  module: 'Service', type: 'warning',  title: 'SLA Breach',                     message: 'TK-2026-0088: เกิน SLA แล้ว - Thai Metal',                   time: '08:00',  date: '2026-04-02', read: true,  link: '/service' },
  { id: 5,  module: 'Sales',   type: 'info',     title: 'Follow-up Due',                  message: 'OPP-2026-001: ครบกำหนด follow-up วันนี้',                   time: '07:00',  date: '2026-04-02', read: true,  link: '/sales' },
  { id: 6,  module: 'Service', type: 'warning',  title: 'MA Contract Expiring',           message: 'MA-2025-0015: KTB สัญญาหมด 30 เม.ย. 2026',                  time: '09:00',  date: '2026-04-01', read: true,  link: '/service' },
  { id: 7,  module: 'Finance', type: 'info',     title: 'Invoice Due Soon',               message: 'INV-2026-0012: CPF ครบกำหนด 30 เม.ย. 2026',                 time: '08:00',  date: '2026-04-01', read: true,  link: '/finance' },
  { id: 8,  module: 'Project', type: 'warning',  title: 'No Progress Update',             message: 'PRJ-2026-001: ไม่มีการอัปเดตมา 3 วัน',                      time: '07:00',  date: '2026-04-01', read: true,  link: '/projects' },
]

export const pipelineChartData = [
  { stage: 'New Lead', count: 2, value: 4100000 },
  { stage: 'Qualified', count: 1, value: 2800000 },
  { stage: 'Requirement', count: 1, value: 8000000 },
  { stage: 'Proposal', count: 1, value: 12000000 },
  { stage: 'Negotiation', count: 1, value: 4500000 },
  { stage: 'Won', count: 1, value: 6200000 },
]

export const monthlyRevenueData = [
  { month: 'ต.ค.', revenue: 2100000, collection: 1800000 },
  { month: 'พ.ย.', revenue: 3500000, collection: 2900000 },
  { month: 'ธ.ค.', revenue: 4200000, collection: 3800000 },
  { month: 'ม.ค.', revenue: 2800000, collection: 2400000 },
  { month: 'ก.พ.', revenue: 3100000, collection: 2850000 },
  { month: 'มี.ค.', revenue: 5800000, collection: 4200000 },
  { month: 'เม.ย.', revenue: 1860000, collection: 0 },
]

export const projectStatusData = [
  { name: 'In Progress',     value: 2, color: '#3B82F6' },
  { name: 'Planning',        value: 1, color: '#8B5CF6' },
  { name: 'Delayed',         value: 1, color: '#EF4444' },
  { name: 'Completed',       value: 1, color: '#22C55E' },
]
