import { clsx } from 'clsx'

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple' | 'orange'

const variants: Record<Variant, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-yellow-100 text-yellow-700',
  danger:  'bg-red-100   text-red-700',
  info:    'bg-blue-100  text-blue-700',
  default: 'bg-gray-100  text-gray-700',
  purple:  'bg-purple-100 text-purple-700',
  orange:  'bg-orange-100 text-orange-700',
}

export default function Badge({ children, variant = 'default', className }: {
  children: React.ReactNode; variant?: Variant; className?: string
}) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

// Map stage/status -> variant
export function stageBadgeVariant(stage: string): Variant {
  const map: Record<string, Variant> = {
    'New Lead':             'default',
    'Qualified':            'info',
    'Requirement Gathered': 'info',
    'Proposal Submitted':   'purple',
    'Negotiation':          'orange',
    'Pending Decision':     'warning',
    'Won':                  'success',
    'Lost':                 'danger',
  }
  return map[stage] || 'default'
}

export function projectStatusVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    'Planning':            'info',
    'Waiting for Customer':'warning',
    'In Progress':         'success',
    'Delayed':             'danger',
    'On Hold':             'orange',
    'Completed':           'success',
    'Closed':              'default',
  }
  return map[status] || 'default'
}

export function severityVariant(sev: string): Variant {
  const map: Record<string, Variant> = {
    'Critical': 'danger',
    'High':     'orange',
    'Medium':   'warning',
    'Low':      'info',
  }
  return map[sev] || 'default'
}

export function slaVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    'Met':      'success',
    'At Risk':  'warning',
    'Breached': 'danger',
  }
  return map[status] || 'default'
}

export function invoiceStatusVariant(status: string): Variant {
  const map: Record<string, Variant> = {
    'Paid':    'success',
    'Unpaid':  'warning',
    'Overdue': 'danger',
  }
  return map[status] || 'default'
}
