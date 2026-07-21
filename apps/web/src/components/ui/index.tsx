'use client';
import { type ButtonHTMLAttributes, type InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { motion, HTMLMotionProps } from 'framer-motion';

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'ref'> {
  variant?: 'primary' | 'secondary' | 'link' | 'destructive' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center font-sans font-medium transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      primary: 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-glow rounded-lg',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg',
      outline: 'border border-border bg-transparent hover:bg-surface-hover text-on-surface rounded-lg',
      ghost: 'bg-transparent text-on-surface hover:bg-surface-hover rounded-lg',
      link: 'bg-transparent text-on-surface underline-offset-4 hover:underline rounded-none p-0',
      destructive: 'bg-error text-error-foreground hover:bg-error/90 rounded-lg hover:shadow-glow',
    };

    const sizes = {
      sm: 'text-label-sm px-3 h-8 gap-1.5',
      md: 'text-label-md px-4 h-10 gap-2',
      lg: 'text-label-md px-8 h-12 gap-2 rounded-xl',
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.98 }}
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
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

// ── Card ──────────────────────────────────────────────────────────────────────

interface CardProps { children: React.ReactNode; className?: string; }

export function Card({ children, className }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={clsx(
        'bg-surface/60 backdrop-blur-xl border border-secondary rounded-2xl p-6',
        'transition-all duration-300 hover:shadow-md hover:border-border hover:bg-surface-hover',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={clsx('mb-6 space-y-1', className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h2 className={clsx('text-headline-sm font-semibold text-on-surface tracking-tight', className)}>{children}</h2>;
}

export function CardDescription({ children, className }: CardProps) {
  return <p className={clsx('text-body-md text-neutral-400', className)}>{children}</p>;
}

export function CardContent({ children, className }: CardProps) {
  return <div className={clsx('space-y-4', className)}>{children}</div>;
}

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-2">
      {label && <label className="text-label-sm font-medium text-on-surface">{label}</label>}
      <input
        ref={ref}
        className={clsx(
          'h-10 px-3 bg-surface/50 backdrop-blur-md border border-border rounded-lg text-body-md text-on-surface',
          'placeholder:text-neutral-500 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 shadow-sm',
          error && 'border-error focus:border-error focus:ring-error',
          className
        )}
        {...props}
      />
      {error && <p className="text-body-sm text-error animate-fade-in">{error}</p>}
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
    <div className="flex flex-col gap-2">
      {label && <label className="text-label-sm font-medium text-on-surface">{label}</label>}
      <textarea
        ref={ref}
        className={clsx(
          'px-3 py-2 bg-surface/50 backdrop-blur-md border border-border rounded-lg text-body-md text-on-surface',
          'placeholder:text-neutral-500 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 resize-none shadow-sm',
          error && 'border-error focus:border-error focus:ring-error',
          className
        )}
        {...props}
      />
      {error && <p className="text-body-sm text-error animate-fade-in">{error}</p>}
    </div>
  )
);
Textarea.displayName = 'Textarea';

// ── Badge ─────────────────────────────────────────────────────────────────────

interface BadgeProps { children: React.ReactNode; variant?: 'default' | 'orange' | 'error' | 'success' | 'outline'; className?: string; }

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    outline: 'border border-border text-on-surface',
    orange: 'bg-tertiary/20 text-tertiary border border-tertiary/30',
    error: 'bg-error/20 text-error border border-error/30',
    success: 'bg-success/20 text-success border border-success/30',
  };

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-label-sm font-semibold transition-colors',
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
    <div className="flex flex-col gap-2">
      {label && <label className="text-label-sm font-medium text-on-surface">{label}</label>}
      <select
        ref={ref}
        className={clsx(
          'h-10 px-3 bg-surface/50 backdrop-blur-md border border-border rounded-lg text-body-md text-on-surface',
          'focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-all duration-200 shadow-sm appearance-none',
          error && 'border-error focus:border-error focus:ring-error',
          className
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
        {...props}
      >
        {options.map(o => (
          <option key={o.value} value={o.value} className="bg-surface text-on-surface">{o.label}</option>
        ))}
      </select>
      {error && <p className="text-body-sm text-error animate-fade-in">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

// ── Divider ───────────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={clsx('h-px w-full bg-border', className)} />;
}

// ── Empty State ───────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-20 px-4 gap-4 text-center border border-dashed border-border rounded-2xl bg-surface/30 backdrop-blur-sm"
    >
      {icon && <div className="text-neutral-500 mb-2">{icon}</div>}
      <h3 className="text-headline-sm font-semibold text-on-surface">{title}</h3>
      {description && <p className="text-body-md text-neutral-400 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-8 w-8 border-3' };
  return (
    <div className={clsx(
      'animate-spin rounded-full border-t-primary border-r-primary border-b-secondary border-l-secondary',
      sizes[size]
    )} />
  );
}

// ── Mono Hash ─────────────────────────────────────────────────────────────────

export function MonoHash({ hash, truncate = true }: { hash: string; truncate?: boolean }) {
  const display = truncate ? `${hash.slice(0, 8)}...${hash.slice(-6)}` : hash;
  return (
    <span className="font-mono text-label-sm text-neutral-400 select-all tracking-tight bg-secondary/50 px-1.5 py-0.5 rounded" title={hash}>
      {display}
    </span>
  );
}

