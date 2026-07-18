'use client';
import { type ButtonHTMLAttributes, type InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'link' | 'destructive';
  size?: 'sm' | 'md';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-sans transition-all duration-200 ease-in-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100';

    const variants = {
      primary: 'bg-primary text-white hover:bg-neutral-800 hover:-translate-y-[1px] hover:shadow-md rounded-md',
      secondary: 'bg-transparent text-on-surface border border-secondary hover:bg-secondary/50 rounded-md',
      link: 'bg-transparent text-on-surface underline underline-offset-2 hover:opacity-70 rounded-none p-0',
      destructive: 'bg-error text-white hover:bg-red-700 hover:-translate-y-[1px] hover:shadow-md rounded-md',
    };

    const sizes = {
      sm: 'text-label-sm px-3 h-8 gap-1.5',
      md: 'text-label-md px-4 h-10 gap-2',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(base, variants[variant], variant !== 'link' && sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps { children: React.ReactNode; className?: string; }

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('bg-surface border border-secondary rounded-lg p-4 transition-all duration-200 hover:shadow-sm hover:border-neutral-300', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={clsx('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h2 className={clsx('text-headline-sm text-on-surface', className)}>{children}</h2>;
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-label-sm text-on-surface">{label}</label>}
      <input
        ref={ref}
        className={clsx(
          'h-10 px-3 bg-surface border border-secondary rounded-md text-body-md text-on-surface',
          'placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200',
          error && 'border-error focus:border-error focus:ring-error/10',
          className
        )}
        {...props}
      />
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  )
);
Input.displayName = 'Input';

// ── Textarea ──────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-label-sm text-on-surface">{label}</label>}
      <textarea
        ref={ref}
        className={clsx(
          'px-3 py-2 bg-surface border border-secondary rounded-md text-body-md text-on-surface',
          'placeholder:text-neutral-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200 resize-none',
          error && 'border-error focus:border-error focus:ring-error/10',
          className
        )}
        {...props}
      />
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'orange' | 'error' | 'success'; className?: string; }

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-secondary text-on-surface',
    orange: 'bg-tertiary/10 text-tertiary border border-tertiary/20',
    error: 'bg-error/10 text-error border border-error/20',
    success: 'bg-green-50 text-green-700 border border-green-200',
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-label-sm',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-label-sm text-on-surface">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          'h-10 px-3 bg-surface border border-secondary rounded-md text-body-md text-on-surface',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all duration-200',
          error && 'border-error focus:border-error focus:ring-error/10',
          className
        )}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-body-sm text-error">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={clsx('h-px bg-secondary', className)} />;
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon && <div className="text-neutral-300 mb-1">{icon}</div>}
      <p className="text-headline-sm text-on-surface">{title}</p>
      {description && <p className="text-body-md text-neutral-500 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <svg className={clsx('animate-spin text-primary', sizes[size])} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Mono Hash ─────────────────────────────────────────────────────────────────

export function MonoHash({ hash, truncate = true }: { hash: string; truncate?: boolean }) {
  const display = truncate ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;
  return (
    <span className="mono text-neutral-500 select-all" title={hash}>
      {display}
    </span>
  );
}
