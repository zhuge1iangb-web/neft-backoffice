/**
 * NEFT Backoffice — Role-based module access
 *
 * Role hierarchy (service/engineer permissions):
 *  Project Manager → ทำได้ทุกอย่างของ Service Support + Engineer + Projects
 *  Engineer        → ทำได้ทุกอย่างของ Service Support + Projects
 *  Service Support → service + inventory
 */

export type ModuleKey =
  | 'dashboard'
  | 'sales'
  | 'projects'
  | 'finance'
  | 'service'
  | 'purchasing'
  | 'inventory'
  | 'reports'
  | 'notifications'
  | 'users'
  | 'master'

export const ROUTE_MODULE: { prefix: string; module: ModuleKey }[] = [
  { prefix: '/dashboard',     module: 'dashboard' },
  { prefix: '/sales',         module: 'sales' },
  { prefix: '/projects',      module: 'projects' },
  { prefix: '/finance',       module: 'finance' },
  { prefix: '/service',       module: 'service' },
  { prefix: '/purchasing',    module: 'purchasing' },
  { prefix: '/inventory',     module: 'inventory' },
  { prefix: '/reports',       module: 'reports' },
  { prefix: '/notifications', module: 'notifications' },
  { prefix: '/users',         module: 'users' },
  { prefix: '/master',        module: 'master' },
]

const ALL_MODULES: ModuleKey[] = ROUTE_MODULE.map(r => r.module)

export const ROLE_MODULES: Record<string, ModuleKey[]> = {
  'Admin':            ALL_MODULES,
  'CEO/Director':     ALL_MODULES,
  'Sales':            ['dashboard', 'sales', 'reports', 'notifications'],
  'Project Manager':  ['dashboard', 'projects', 'service', 'inventory', 'reports', 'notifications'],
  'Engineer':         ['dashboard', 'projects', 'service', 'inventory', 'reports', 'notifications'],
  'Finance':          ['dashboard', 'finance', 'purchasing', 'reports', 'notifications'],
  'Service Support':  ['dashboard', 'service', 'inventory', 'notifications'],
}

const DEFAULT_MODULES: ModuleKey[] = ['dashboard', 'notifications']

export function modulesForRole(role: string | undefined | null): ModuleKey[] {
  if (!role) return DEFAULT_MODULES
  return ROLE_MODULES[role] ?? DEFAULT_MODULES
}

export function canAccessModule(role: string | undefined | null, module: ModuleKey): boolean {
  return modulesForRole(role).includes(module)
}

export function moduleForPath(pathname: string): ModuleKey | null {
  const match = ROUTE_MODULE
    .filter(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
  return match ? match.module : null
}

export function canAccessPath(role: string | undefined | null, pathname: string): boolean {
  const moduleKey = moduleForPath(pathname)
  if (!moduleKey) return true
  return canAccessModule(role, moduleKey)
}

/** PM + Engineer + Service Support + Admin/CEO สามารถทำงาน Service Support ได้ */
export function canDoServiceSupport(role: string | undefined | null): boolean {
  return ['Admin', 'CEO/Director', 'Project Manager', 'Engineer', 'Service Support'].includes(role || '')
}

/** PM + Engineer + Admin/CEO สามารถทำงาน Engineer ได้ */
export function canDoEngineer(role: string | undefined | null): boolean {
  return ['Admin', 'CEO/Director', 'Project Manager', 'Engineer'].includes(role || '')
}

/** Admin / CEO เท่านั้น */
export function isAdminOrCeo(role: string | undefined | null): boolean {
  return ['Admin', 'CEO/Director'].includes(role || '')
}
