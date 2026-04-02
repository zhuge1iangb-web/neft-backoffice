import { clsx } from 'clsx'
import React from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[#1B3875] text-white hover:bg-[#0F2654] shadow-sm',
  secondary: 'bg-[#E84B0F] text-white hover:bg-[#C43A08] shadow-sm',
  danger:    'bg-red-500 text-white hover:bg-red-600 shadow-sm',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100',
  outline:   'border border-[#1B3875] text-[#1B3875] hover:bg-[#EBF3FF]',
}
const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-2.5 text-sm rounded-lg',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: React.ReactNode
  loading?: boolean
}

export default function Button({
  children, variant = 'primary', size = 'md', icon, loading, className, disabled, ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant], sizeClasses[size], className
      )}
      {...props}
    >
      {loading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : icon}
      {children}
    </button>
  )
}
