import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface CyberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const CyberInput = forwardRef<HTMLInputElement, CyberInputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-display tracking-widest text-primary uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={cn(
              "w-full bg-background/50 border border-border px-4 py-2.5 text-foreground font-sans text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all duration-300 placeholder:text-muted-foreground/50 rounded-none",
              error && "border-destructive focus:border-destructive focus:ring-destructive/50",
              className
            )}
            {...props}
          />
          {/* Subtle glowing corner */}
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-primary/50 pointer-events-none" />
        </div>
        {error && <span className="text-xs text-destructive font-sans">{error}</span>}
      </div>
    );
  }
);
CyberInput.displayName = 'CyberInput';
